import { buildSessionUpdate } from "./session-update.js";
import { resolveDebugOption } from "@tanstack/ai/adapter-internals";
//#region src/realtime/adapter.ts
var OPENAI_REALTIME_URL = "https://api.openai.com/v1/realtime";
/**
* Creates an OpenAI realtime adapter for client-side use.
*
* Uses WebRTC for browser connections (default) or WebSocket for Node.js.
*
* @param options - Optional configuration
* @returns A RealtimeAdapter for use with RealtimeClient
*
* @example
* ```typescript
* import { RealtimeClient } from '@tanstack/ai-client'
* import { openaiRealtime } from '@tanstack/ai-openai'
*
* const client = new RealtimeClient({
*   getToken: () => fetch('/api/realtime-token').then(r => r.json()),
*   adapter: openaiRealtime(),
* })
* ```
*/
function openaiRealtime(options = {}) {
	const connectionMode = options.connectionMode ?? "webrtc";
	const logger = resolveDebugOption(options.debug);
	return {
		provider: "openai",
		async connect(token, _clientTools) {
			const model = token.config.model ?? "gpt-realtime-2.1";
			logger.request(`activity=realtime provider=openai model=${model}`, {
				provider: "openai",
				model
			});
			if (connectionMode === "webrtc") return createWebRTCConnection(token, logger);
			const error = /* @__PURE__ */ new Error("WebSocket connection mode not yet implemented");
			logger.errors("openai.realtime fatal", {
				error,
				source: "openai.realtime"
			});
			throw error;
		}
	};
}
/**
* Creates a WebRTC connection to OpenAI's realtime API
*/
async function createWebRTCConnection(token, logger) {
	const eventHandlers = /* @__PURE__ */ new Map();
	const pc = new RTCPeerConnection();
	let audioContext = null;
	let inputAnalyser = null;
	let outputAnalyser = null;
	let inputSource = null;
	let outputSource = null;
	let localStream = null;
	let audioElement = null;
	let dataChannel = null;
	let currentMode = "idle";
	let currentMessageId = null;
	const emptyFrequencyData = /* @__PURE__ */ new Uint8Array(1024);
	const emptyTimeDomainData = (/* @__PURE__ */ new Uint8Array(2048)).fill(128);
	function emit(event, payload) {
		const handlers = eventHandlers.get(event);
		if (handlers) for (const handler of handlers) handler(payload);
	}
	const channel = pc.createDataChannel("oai-events");
	dataChannel = channel;
	const dataChannelReady = new Promise((resolve) => {
		channel.onopen = () => {
			flushPendingEvents();
			emit("status_change", { status: "connected" });
			resolve();
		};
	});
	channel.onmessage = (event) => {
		try {
			const message = JSON.parse(event.data);
			logger.provider(`provider=openai direction=in type=${message.type ?? "<unknown>"}`, { frame: message });
			handleServerEvent(message);
		} catch (e) {
			logger.errors("openai.realtime fatal", {
				error: e,
				source: "openai.realtime"
			});
		}
	};
	channel.onerror = (error) => {
		logger.errors("openai.realtime fatal", {
			error,
			source: "openai.realtime"
		});
		emit("error", { error: /* @__PURE__ */ new Error(`Data channel error: ${error}`) });
	};
	pc.ontrack = (event) => {
		if (event.track.kind === "audio" && event.streams[0]) setupOutputAudioAnalysis(event.streams[0]);
	};
	try {
		localStream = await navigator.mediaDevices.getUserMedia({ audio: {
			echoCancellation: true,
			noiseSuppression: true,
			sampleRate: 24e3
		} });
		for (const track of localStream.getAudioTracks()) pc.addTrack(track, localStream);
	} catch (error) {
		throw new Error(`Microphone access required for realtime voice: ${error instanceof Error ? error.message : error}`);
	}
	const offer = await pc.createOffer();
	await pc.setLocalDescription(offer);
	const sdpResponse = await fetch(`${OPENAI_REALTIME_URL}/calls`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token.token}`,
			"Content-Type": "application/sdp"
		},
		body: offer.sdp ?? null
	});
	if (!sdpResponse.ok) {
		const errorText = await sdpResponse.text();
		const error = /* @__PURE__ */ new Error(`Failed to establish WebRTC connection: ${sdpResponse.status} - ${errorText}`);
		logger.errors("openai.realtime fatal", {
			error,
			source: "openai.realtime"
		});
		throw error;
	}
	const answerSdp = await sdpResponse.text();
	await pc.setRemoteDescription({
		type: "answer",
		sdp: answerSdp
	});
	setupInputAudioAnalysis(localStream);
	function handleServerEvent(event) {
		switch (event.type) {
			case "session.created":
			case "session.updated": break;
			case "input_audio_buffer.speech_started":
				currentMode = "listening";
				emit("mode_change", { mode: "listening" });
				break;
			case "input_audio_buffer.speech_stopped":
				currentMode = "thinking";
				emit("mode_change", { mode: "thinking" });
				break;
			case "input_audio_buffer.committed": break;
			case "conversation.item.input_audio_transcription.completed": {
				const transcript = event.transcript;
				emit("transcript", {
					role: "user",
					transcript,
					isFinal: true
				});
				break;
			}
			case "response.created":
				currentMode = "thinking";
				emit("mode_change", { mode: "thinking" });
				break;
			case "response.output_item.added": {
				const item = event.item;
				if (item.type === "message") currentMessageId = item.id;
				break;
			}
			case "response.output_audio_transcript.delta": {
				const delta = event.delta;
				emit("transcript", {
					role: "assistant",
					transcript: delta,
					isFinal: false
				});
				break;
			}
			case "response.output_audio_transcript.done": {
				const transcript = event.transcript;
				emit("transcript", {
					role: "assistant",
					transcript,
					isFinal: true
				});
				break;
			}
			case "response.output_text.delta": {
				const delta = event.delta;
				emit("transcript", {
					role: "assistant",
					transcript: delta,
					isFinal: false
				});
				break;
			}
			case "response.output_text.done": {
				const text = event.text;
				emit("transcript", {
					role: "assistant",
					transcript: text,
					isFinal: true
				});
				break;
			}
			case "response.output_audio.delta":
				if (currentMode !== "speaking") {
					currentMode = "speaking";
					emit("mode_change", { mode: "speaking" });
				}
				break;
			case "response.output_audio.done": break;
			case "response.function_call_arguments.done": {
				const callId = event["call_id"] ?? event["item_id"];
				const name = event["name"];
				const args = event["arguments"];
				if (!callId) {
					logger.errors("openai.realtime function_call_arguments.done missing ids", {
						event,
						source: "openai.realtime"
					});
					break;
				}
				try {
					emit("tool_call", {
						toolCallId: callId,
						toolName: name,
						input: JSON.parse(args)
					});
				} catch {
					emit("tool_call", {
						toolCallId: callId,
						toolName: name,
						input: args
					});
				}
				break;
			}
			case "response.done": {
				const output = event.response.output;
				currentMode = "listening";
				emit("mode_change", { mode: "listening" });
				if (currentMessageId) {
					const message = {
						id: currentMessageId,
						role: "assistant",
						timestamp: Date.now(),
						parts: []
					};
					for (const item of output || []) if (item.type === "message" && item.content) {
						const content = item.content;
						for (const part of content) if (part.type === "output_audio" && part.transcript) message.parts.push({
							type: "audio",
							transcript: part.transcript
						});
						else if (part.type === "output_text" && part.text) message.parts.push({
							type: "text",
							content: part.text
						});
					}
					emit("message_complete", { message });
					currentMessageId = null;
				}
				break;
			}
			case "conversation.item.truncated":
				emit("interrupted", currentMessageId ? { messageId: currentMessageId } : {});
				break;
			case "error": {
				const error = event.error;
				emit("error", { error: new Error(error.message || "Unknown error") });
				break;
			}
		}
	}
	function setupOutputAudioAnalysis(stream) {
		audioElement = new Audio();
		audioElement.srcObject = stream;
		audioElement.autoplay = true;
		audioElement.play().catch((e) => {
			logger.errors("openai.realtime audio autoplay failed", {
				error: e,
				source: "openai.realtime"
			});
		});
		if (!audioContext) audioContext = new AudioContext();
		if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
		outputAnalyser = audioContext.createAnalyser();
		outputAnalyser.fftSize = 2048;
		outputAnalyser.smoothingTimeConstant = .3;
		outputSource = audioContext.createMediaStreamSource(stream);
		outputSource.connect(outputAnalyser);
	}
	function setupInputAudioAnalysis(stream) {
		if (!audioContext) audioContext = new AudioContext();
		if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
		inputAnalyser = audioContext.createAnalyser();
		inputAnalyser.fftSize = 2048;
		inputAnalyser.smoothingTimeConstant = .3;
		inputSource = audioContext.createMediaStreamSource(stream);
		inputSource.connect(inputAnalyser);
	}
	const pendingEvents = [];
	function sendEvent(event) {
		if (dataChannel?.readyState === "open") {
			logger.provider(`provider=openai direction=out type=${event.type ?? "<unknown>"}`, { frame: event });
			dataChannel.send(JSON.stringify(event));
		} else pendingEvents.push(event);
	}
	function flushPendingEvents() {
		for (const event of pendingEvents) {
			logger.provider(`provider=openai direction=out type=${event.type ?? "<unknown>"}`, { frame: event });
			channel.send(JSON.stringify(event));
		}
		pendingEvents.length = 0;
	}
	const connection = {
		async disconnect() {
			if (localStream) {
				for (const track of localStream.getTracks()) track.stop();
				localStream = null;
			}
			if (audioElement) {
				audioElement.pause();
				audioElement.srcObject = null;
				audioElement = null;
			}
			if (dataChannel) {
				dataChannel.close();
				dataChannel = null;
			}
			pc.close();
			if (audioContext) {
				await audioContext.close();
				audioContext = null;
			}
			emit("status_change", { status: "idle" });
		},
		async startAudioCapture() {
			if (localStream) for (const track of localStream.getAudioTracks()) track.enabled = true;
			currentMode = "listening";
			emit("mode_change", { mode: "listening" });
		},
		stopAudioCapture() {
			if (localStream) for (const track of localStream.getAudioTracks()) track.enabled = false;
			currentMode = "idle";
			emit("mode_change", { mode: "idle" });
		},
		sendText(text) {
			sendEvent({
				type: "conversation.item.create",
				item: {
					type: "message",
					role: "user",
					content: [{
						type: "input_text",
						text
					}]
				}
			});
			sendEvent({ type: "response.create" });
		},
		sendImage(imageData, mimeType) {
			sendEvent({
				type: "conversation.item.create",
				item: {
					type: "message",
					role: "user",
					content: [imageData.startsWith("http://") || imageData.startsWith("https://") ? {
						type: "input_image",
						image_url: imageData
					} : {
						type: "input_image",
						image_url: `data:${mimeType};base64,${imageData}`
					}]
				}
			});
			sendEvent({ type: "response.create" });
		},
		sendToolResult(callId, result) {
			sendEvent({
				type: "conversation.item.create",
				item: {
					type: "function_call_output",
					call_id: callId,
					output: result
				}
			});
			sendEvent({ type: "response.create" });
		},
		updateSession(config) {
			if (config.temperature !== void 0) logger.provider("provider=openai direction=out type=session.update dropped `temperature` (removed in the GA realtime API)", { frame: { temperature: config.temperature } });
			sendEvent({
				type: "session.update",
				session: buildSessionUpdate(config)
			});
		},
		interrupt() {
			sendEvent({ type: "response.cancel" });
			currentMode = "listening";
			emit("mode_change", { mode: "listening" });
			emit("interrupted", currentMessageId ? { messageId: currentMessageId } : {});
		},
		on(event, handler) {
			let handlers = eventHandlers.get(event);
			if (!handlers) {
				handlers = /* @__PURE__ */ new Set();
				eventHandlers.set(event, handlers);
			}
			handlers.add(handler);
			return () => {
				eventHandlers.get(event)?.delete(handler);
			};
		},
		getAudioVisualization() {
			function calculateLevel(analyser) {
				const data = new Uint8Array(analyser.fftSize);
				analyser.getByteTimeDomainData(data);
				let maxDeviation = 0;
				for (const sample of data) {
					const deviation = Math.abs(sample - 128);
					if (deviation > maxDeviation) maxDeviation = deviation;
				}
				const normalized = maxDeviation / 128;
				return Math.min(1, normalized * 1.5);
			}
			return {
				get inputLevel() {
					if (!inputAnalyser) return 0;
					return calculateLevel(inputAnalyser);
				},
				get outputLevel() {
					if (!outputAnalyser) return 0;
					return calculateLevel(outputAnalyser);
				},
				getInputFrequencyData() {
					if (!inputAnalyser) return emptyFrequencyData;
					const data = new Uint8Array(inputAnalyser.frequencyBinCount);
					inputAnalyser.getByteFrequencyData(data);
					return data;
				},
				getOutputFrequencyData() {
					if (!outputAnalyser) return emptyFrequencyData;
					const data = new Uint8Array(outputAnalyser.frequencyBinCount);
					outputAnalyser.getByteFrequencyData(data);
					return data;
				},
				getInputTimeDomainData() {
					if (!inputAnalyser) return emptyTimeDomainData;
					const data = new Uint8Array(inputAnalyser.fftSize);
					inputAnalyser.getByteTimeDomainData(data);
					return data;
				},
				getOutputTimeDomainData() {
					if (!outputAnalyser) return emptyTimeDomainData;
					const data = new Uint8Array(outputAnalyser.fftSize);
					outputAnalyser.getByteTimeDomainData(data);
					return data;
				},
				get inputSampleRate() {
					return 24e3;
				},
				get outputSampleRate() {
					return 24e3;
				}
			};
		}
	};
	await dataChannelReady;
	return connection;
}
//#endregion
export { openaiRealtime };

//# sourceMappingURL=adapter.js.map