import "../model-meta.js";
import { resolveDebugOption } from "@tanstack/ai/adapter-internals";
//#region src/realtime/adapter.ts
var GROK_REALTIME_URL = "https://api.x.ai/v1/realtime";
/**
* Runtime-checked field readers for untyped server events. Replace the
* drive-by `event.X as string` / `event.X as Record<string, unknown>` casts
* with readers that return `undefined` when the shape doesn't match, so a
* malformed frame can't throw a TypeError inside `handleServerEvent`.
*/
function readString(obj, key) {
	const value = obj[key];
	return typeof value === "string" ? value : void 0;
}
function readObject(obj, key) {
	const value = obj[key];
	return value && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
function readObjectArray(obj, key) {
	const value = obj[key];
	if (!Array.isArray(value)) return void 0;
	return value.filter((item) => item !== null && typeof item === "object" && !Array.isArray(item));
}
/**
* Creates a Grok realtime adapter for client-side use.
*
* Uses WebRTC for browser connections (default). Mirrors the OpenAI realtime
* adapter because xAI's Voice Agent API is OpenAI-realtime-compatible — the
* only differences are the endpoint URL and default model.
*
* @example
* ```typescript
* import { RealtimeClient } from '@tanstack/ai-client'
* import { grokRealtime } from '@tanstack/ai-grok'
*
* const client = new RealtimeClient({
*   getToken: () => fetch('/api/realtime-token').then(r => r.json()),
*   adapter: grokRealtime(),
* })
* ```
*/
function grokRealtime(options = {}) {
	const connectionMode = options.connectionMode ?? "webrtc";
	const logger = resolveDebugOption(options.debug);
	return {
		provider: "grok",
		async connect(token, _clientTools) {
			const model = token.config.model ?? "grok-voice-think-fast-2.0";
			logger.request(`activity=realtime provider=grok model=${model}`, {
				provider: "grok",
				model
			});
			if (connectionMode === "webrtc") return createWebRTCConnection(token, logger);
			const error = /* @__PURE__ */ new Error("WebSocket connection mode not yet implemented");
			logger.errors("grok.realtime fatal", {
				error,
				source: "grok.realtime"
			});
			throw error;
		}
	};
}
/**
* Creates a WebRTC connection to xAI's realtime API.
*/
async function createWebRTCConnection(token, logger) {
	const model = token.config.model ?? "grok-voice-think-fast-2.0";
	const eventHandlers = /* @__PURE__ */ new Map();
	const pc = new RTCPeerConnection();
	let audioContext = null;
	let inputAnalyser = null;
	let outputAnalyser = null;
	let inputSource = null;
	let outputSource = null;
	let localStream = null;
	let audioElement = null;
	const channel = pc.createDataChannel("oai-events");
	let dataChannel = channel;
	let currentMode = "idle";
	let currentMessageId = null;
	let isTornDown = false;
	const pendingEvents = [];
	let hasSentInitialSessionUpdate = false;
	const FALLBACK_FREQUENCY_BIN_COUNT = 1024;
	const FALLBACK_TIME_DOMAIN_SIZE = 2048;
	const FALLBACK_TIME_DOMAIN_FILL = 128;
	function emit(event, payload) {
		const handlers = eventHandlers.get(event);
		if (handlers) for (const handler of handlers) handler(payload);
	}
	let dataChannelOpened = false;
	let rejectDataChannelReady = null;
	let dataChannelReadyTimeout = null;
	const dataChannelReady = new Promise((resolve, reject) => {
		rejectDataChannelReady = (reason) => {
			if (dataChannelReadyTimeout !== null) {
				clearTimeout(dataChannelReadyTimeout);
				dataChannelReadyTimeout = null;
			}
			rejectDataChannelReady = null;
			reject(reason);
		};
		dataChannelReadyTimeout = setTimeout(() => {
			if (!dataChannelOpened) rejectDataChannelReady?.(/* @__PURE__ */ new Error("Data channel did not open within 15000ms — aborting connection"));
		}, 15e3);
		channel.onopen = () => {
			dataChannelOpened = true;
			if (dataChannelReadyTimeout !== null) {
				clearTimeout(dataChannelReadyTimeout);
				dataChannelReadyTimeout = null;
			}
			rejectDataChannelReady = null;
			flushPendingEvents();
			emit("status_change", { status: "connected" });
			resolve();
		};
	});
	channel.onmessage = (event) => {
		try {
			const message = JSON.parse(event.data);
			const messageRecord = message !== null && typeof message === "object" ? message : {};
			logger.provider(`provider=grok direction=in type=${readString(messageRecord, "type") ?? "<unknown>"}`, { frame: messageRecord });
			handleServerEvent(messageRecord);
		} catch (parseErr) {
			logger.errors("grok.realtime fatal", {
				error: parseErr,
				source: "grok.realtime"
			});
			emit("error", { error: parseErr instanceof Error ? parseErr : new Error(String(parseErr)) });
		}
	};
	channel.onerror = (error) => {
		if (isTornDown) return;
		logger.errors("grok.realtime fatal", {
			error,
			source: "grok.realtime"
		});
		const rtcError = readObject(error, "error");
		const msg = (rtcError && readString(rtcError, "message")) ?? (error.type || "unknown");
		const dcErr = /* @__PURE__ */ new Error(`Data channel error: ${msg}`);
		if (!dataChannelOpened) rejectDataChannelReady?.(dcErr);
		emit("error", { error: dcErr });
	};
	channel.onclose = () => {
		if (isTornDown) return;
		if (!dataChannelOpened) rejectDataChannelReady?.(/* @__PURE__ */ new Error("Data channel closed before opening"));
	};
	pc.ontrack = (event) => {
		if (event.track.kind === "audio" && event.streams[0]) setupOutputAudioAnalysis(event.streams[0]);
	};
	pc.onconnectionstatechange = () => {
		const state = pc.connectionState;
		logger.provider(`provider=grok pc.connectionState=${state}`, { state });
		if (state === "failed" || state === "disconnected" || state === "closed") {
			if (!isTornDown) emit("status_change", { status: state === "failed" ? "error" : "idle" });
			if (!dataChannelOpened) {
				const message = state === "failed" ? `PeerConnection failed before data channel opened` : `PeerConnection entered state '${state}' before data channel opened`;
				rejectDataChannelReady?.(new Error(message));
			}
			if (state === "failed" && !isTornDown) teardownConnection();
		}
	};
	pc.oniceconnectionstatechange = () => {
		const state = pc.iceConnectionState;
		logger.provider(`provider=grok pc.iceConnectionState=${state}`, { state });
		if (!dataChannelOpened && (state === "failed" || state === "closed" || state === "disconnected")) {
			const message = state === "failed" ? `ICE connection failed before data channel opened` : `ICE connection entered state '${state}' before data channel opened`;
			rejectDataChannelReady?.(new Error(message));
		}
	};
	/**
	* Tear down every resource we may have allocated so the mic/pc/audio
	* nodes/audio element don't leak on a failed connect. Safe to call from
	* any point after `new RTCPeerConnection()`; each branch null-guards and
	* swallows errors because cascading closes (e.g. `pc.close()` closing the
	* data channel implicitly) are expected.
	*
	* Shared between the SDP-path catch, the post-SDP catch, and (implicitly
	* via idempotency) the `disconnect()` entry point.
	*/
	async function teardownConnection() {
		isTornDown = true;
		pendingEvents.length = 0;
		rejectDataChannelReady?.(/* @__PURE__ */ new Error("Connection torn down before data channel opened"));
		if (localStream) {
			for (const track of localStream.getTracks()) track.stop();
			localStream = null;
		}
		if (audioElement) {
			try {
				audioElement.pause();
			} catch {}
			audioElement.srcObject = null;
			audioElement = null;
		}
		if (outputSource) {
			try {
				outputSource.disconnect();
			} catch {}
			outputSource = null;
		}
		if (outputAnalyser) {
			try {
				outputAnalyser.disconnect();
			} catch {}
			outputAnalyser = null;
		}
		if (inputSource) {
			try {
				inputSource.disconnect();
			} catch {}
			inputSource = null;
		}
		if (inputAnalyser) {
			try {
				inputAnalyser.disconnect();
			} catch {}
			inputAnalyser = null;
		}
		if (dataChannel) {
			try {
				dataChannel.close();
			} catch {}
			dataChannel = null;
		}
		try {
			pc.close();
		} catch {}
		if (audioContext) {
			try {
				await audioContext.close();
			} catch {}
			audioContext = null;
		}
	}
	try {
		try {
			localStream = await navigator.mediaDevices.getUserMedia({ audio: {
				echoCancellation: true,
				noiseSuppression: true,
				sampleRate: 24e3
			} });
		} catch (error) {
			logger.errors("grok.realtime fatal", {
				error,
				source: "grok.realtime.getUserMedia"
			});
			throw new Error(`Microphone access required for realtime voice: ${error instanceof Error ? error.message : error}`);
		}
		for (const track of localStream.getAudioTracks()) pc.addTrack(track, localStream);
		const offer = await pc.createOffer();
		await pc.setLocalDescription(offer);
		const sdpResponse = await fetch(`${GROK_REALTIME_URL}?model=${model}`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${token.token}`,
				"Content-Type": "application/sdp"
			},
			body: offer.sdp
		});
		if (!sdpResponse.ok) {
			const errorText = await sdpResponse.text();
			const error = /* @__PURE__ */ new Error(`Failed to establish WebRTC connection: ${sdpResponse.status} - ${errorText}`);
			logger.errors("grok.realtime fatal", {
				error,
				source: "grok.realtime.sdp",
				status: sdpResponse.status
			});
			throw error;
		}
		const answerSdp = await sdpResponse.text();
		await pc.setRemoteDescription({
			type: "answer",
			sdp: answerSdp
		});
	} catch (err) {
		await teardownConnection();
		throw err;
	}
	try {
		setupInputAudioAnalysis(localStream);
		await dataChannelReady;
	} catch (err) {
		await teardownConnection();
		throw err;
	}
	function handleServerEvent(event) {
		switch (readString(event, "type")) {
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
				const transcript = readString(event, "transcript");
				if (transcript === void 0) break;
				emit("transcript", {
					role: "user",
					transcript,
					isFinal: true
				});
				break;
			}
			case "response.created":
				currentMessageId = null;
				currentMode = "thinking";
				emit("mode_change", { mode: "thinking" });
				break;
			case "response.output_item.added": {
				const item = readObject(event, "item");
				if (item && readString(item, "type") === "message") {
					const id = readString(item, "id");
					if (id !== void 0) currentMessageId = id;
				}
				break;
			}
			case "response.output_audio_transcript.delta":
			case "response.audio_transcript.delta": {
				const delta = readString(event, "delta");
				if (delta === void 0) break;
				emit("transcript", {
					role: "assistant",
					transcript: delta,
					isFinal: false
				});
				break;
			}
			case "response.output_audio_transcript.done":
			case "response.audio_transcript.done": {
				const transcript = readString(event, "transcript");
				if (transcript === void 0) break;
				emit("transcript", {
					role: "assistant",
					transcript,
					isFinal: true
				});
				break;
			}
			case "response.text.delta":
			case "response.output_text.delta": {
				const delta = readString(event, "delta");
				if (delta === void 0) break;
				emit("transcript", {
					role: "assistant",
					transcript: delta,
					isFinal: false
				});
				break;
			}
			case "response.text.done":
			case "response.output_text.done": {
				const text = readString(event, "text");
				if (text === void 0) break;
				emit("transcript", {
					role: "assistant",
					transcript: text,
					isFinal: true
				});
				break;
			}
			case "response.output_audio.delta":
			case "response.audio.delta":
				if (currentMode !== "speaking") {
					currentMode = "speaking";
					emit("mode_change", { mode: "speaking" });
				}
				break;
			case "response.output_audio.done":
			case "response.audio.done": break;
			case "response.function_call_arguments.done": {
				const callId = readString(event, "call_id");
				const name = readString(event, "name") ?? "";
				const args = readString(event, "arguments") ?? "";
				if (!callId) {
					logger.errors("grok.realtime tool_call missing call_id — dropping tool_call", {
						source: "grok.realtime",
						event_type: "response.function_call_arguments.done",
						item_id: event.item_id
					});
					emit("error", { error: /* @__PURE__ */ new Error("Realtime tool call missing call_id; tool will not execute") });
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
				const output = readObjectArray(readObject(event, "response") ?? {}, "output");
				if (currentMode !== "idle") {
					currentMode = "listening";
					emit("mode_change", { mode: "listening" });
				}
				if (currentMessageId) {
					const message = {
						id: currentMessageId,
						role: "assistant",
						timestamp: Date.now(),
						parts: []
					};
					for (const item of output ?? []) {
						if (readString(item, "type") !== "message") continue;
						const content = readObjectArray(item, "content");
						if (!content) continue;
						for (const part of content) {
							const partType = readString(part, "type");
							if (partType === "audio") {
								const transcript = readString(part, "transcript");
								if (transcript) message.parts.push({
									type: "audio",
									transcript
								});
							} else if (partType === "text") {
								const content = readString(part, "text");
								if (content) message.parts.push({
									type: "text",
									content
								});
							}
						}
					}
					emit("message_complete", { message });
					currentMessageId = null;
				}
				break;
			}
			case "conversation.item.truncated":
				if (currentMode !== "idle") {
					currentMode = "listening";
					emit("mode_change", { mode: "listening" });
				}
				emit("interrupted", { ...currentMessageId !== null && { messageId: currentMessageId } });
				break;
			case "error": {
				const errorObj = readObject(event, "error") ?? {};
				const message = readString(errorObj, "message") ?? "Unknown realtime server error";
				const err = new Error(message);
				const code = readString(errorObj, "code");
				if (code !== void 0) err.code = code;
				const errType = readString(errorObj, "type");
				if (errType !== void 0) err.type = errType;
				const param = readString(errorObj, "param");
				if (param !== void 0) err.param = param;
				logger.errors("grok.realtime server error", {
					...errorObj,
					source: "grok.realtime server"
				});
				emit("error", { error: err });
				break;
			}
			case void 0:
			default: logger.provider("grok.realtime unhandled server event", { type: event.type });
		}
	}
	function setupOutputAudioAnalysis(stream) {
		if (isTornDown) return;
		if (audioElement) {
			try {
				audioElement.pause();
			} catch {}
			audioElement.srcObject = null;
			audioElement = null;
		}
		if (outputSource) {
			try {
				outputSource.disconnect();
			} catch {}
			outputSource = null;
		}
		if (outputAnalyser) {
			try {
				outputAnalyser.disconnect();
			} catch {}
			outputAnalyser = null;
		}
		audioElement = new Audio();
		audioElement.srcObject = stream;
		audioElement.autoplay = true;
		audioElement.play().catch((e) => {
			logger.errors("grok.realtime audio autoplay blocked", {
				error: e,
				source: "grok.realtime.audio_permission_required"
			});
		});
		if (!audioContext) audioContext = new AudioContext();
		if (audioContext.state === "suspended") audioContext.resume().catch((err) => {
			logger.errors("grok.realtime audioContext.resume failed", {
				error: err,
				source: "grok.realtime"
			});
		});
		outputAnalyser = audioContext.createAnalyser();
		outputAnalyser.fftSize = 2048;
		outputAnalyser.smoothingTimeConstant = .3;
		outputSource = audioContext.createMediaStreamSource(stream);
		outputSource.connect(outputAnalyser);
	}
	function setupInputAudioAnalysis(stream) {
		if (isTornDown) return;
		if (!audioContext) audioContext = new AudioContext();
		if (audioContext.state === "suspended") audioContext.resume().catch((err) => {
			logger.errors("grok.realtime audioContext.resume failed", {
				error: err,
				source: "grok.realtime"
			});
		});
		inputAnalyser = audioContext.createAnalyser();
		inputAnalyser.fftSize = 2048;
		inputAnalyser.smoothingTimeConstant = .3;
		inputSource = audioContext.createMediaStreamSource(stream);
		inputSource.connect(inputAnalyser);
	}
	function sendEvent(event) {
		if (isTornDown) {
			logger.errors("grok.realtime sendEvent after disconnect", {
				eventType: readString(event, "type") ?? "<unknown>",
				source: "grok.realtime"
			});
			return;
		}
		if (dataChannel?.readyState === "open") {
			logger.provider(`provider=grok direction=out type=${readString(event, "type") ?? "<unknown>"}`, { frame: event });
			try {
				dataChannel.send(JSON.stringify(event));
			} catch (error) {
				logger.errors("grok.realtime sendEvent failed", {
					error,
					eventType: readString(event, "type") ?? "<unknown>",
					source: "grok.realtime"
				});
				emit("error", { error: error instanceof Error ? error : new Error(String(error)) });
			}
		} else pendingEvents.push(event);
	}
	function flushPendingEvents() {
		try {
			for (const event of pendingEvents) {
				logger.provider(`provider=grok direction=out type=${readString(event, "type") ?? "<unknown>"}`, { frame: event });
				channel.send(JSON.stringify(event));
			}
			pendingEvents.length = 0;
		} catch (error) {
			logger.errors("grok.realtime flushPendingEvents failed", {
				error,
				source: "grok.realtime"
			});
			const err = error instanceof Error ? error : new Error(String(error));
			rejectDataChannelReady?.(err);
			emit("error", { error: err });
		}
	}
	return {
		async disconnect() {
			await teardownConnection();
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
					content: [{
						type: "input_image",
						image_url: { url: imageData.startsWith("http://") || imageData.startsWith("https://") || imageData.startsWith("data:") ? imageData : `data:${mimeType};base64,${imageData}` }
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
			const sessionUpdate = {};
			if (config.instructions) sessionUpdate.instructions = config.instructions;
			if (config.voice) sessionUpdate.voice = config.voice;
			if (config.vadMode) {
				if (config.vadMode === "semantic") sessionUpdate.turn_detection = {
					type: "semantic_vad",
					eagerness: config.semanticEagerness ?? "medium"
				};
				else if (config.vadMode === "server") sessionUpdate.turn_detection = {
					type: "server_vad",
					threshold: config.vadConfig?.threshold ?? .5,
					prefix_padding_ms: config.vadConfig?.prefixPaddingMs ?? 300,
					silence_duration_ms: config.vadConfig?.silenceDurationMs ?? 500
				};
				else sessionUpdate.turn_detection = null;
			}
			if (config.tools !== void 0) {
				sessionUpdate.tools = config.tools.map((t) => ({
					type: "function",
					name: t.name,
					description: t.description,
					parameters: t.inputSchema ?? {
						type: "object",
						properties: {}
					}
				}));
				sessionUpdate.tool_choice = "auto";
			}
			if (config.outputModalities) sessionUpdate.modalities = config.outputModalities;
			if (config.temperature !== void 0) sessionUpdate.temperature = config.temperature;
			if (config.maxOutputTokens !== void 0) sessionUpdate.max_response_output_tokens = config.maxOutputTokens;
			const providerOptions = config.providerOptions ?? {};
			const callerTranscription = "inputAudioTranscription" in providerOptions ? providerOptions.inputAudioTranscription : "input_audio_transcription" in providerOptions ? providerOptions.input_audio_transcription : void 0;
			if (callerTranscription !== void 0) sessionUpdate.input_audio_transcription = callerTranscription === false ? null : callerTranscription;
			else if (!hasSentInitialSessionUpdate) sessionUpdate.input_audio_transcription = { model: "grok-stt" };
			if (Object.keys(sessionUpdate).length > 0) {
				sendEvent({
					type: "session.update",
					session: sessionUpdate
				});
				hasSentInitialSessionUpdate = true;
			}
		},
		interrupt() {
			sendEvent({ type: "response.cancel" });
			currentMode = "listening";
			emit("mode_change", { mode: "listening" });
			emit("interrupted", { ...currentMessageId !== null && { messageId: currentMessageId } });
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
					if (!inputAnalyser) return new Uint8Array(FALLBACK_FREQUENCY_BIN_COUNT);
					const data = new Uint8Array(inputAnalyser.frequencyBinCount);
					inputAnalyser.getByteFrequencyData(data);
					return data;
				},
				getOutputFrequencyData() {
					if (!outputAnalyser) return new Uint8Array(FALLBACK_FREQUENCY_BIN_COUNT);
					const data = new Uint8Array(outputAnalyser.frequencyBinCount);
					outputAnalyser.getByteFrequencyData(data);
					return data;
				},
				getInputTimeDomainData() {
					if (!inputAnalyser) return new Uint8Array(FALLBACK_TIME_DOMAIN_SIZE).fill(FALLBACK_TIME_DOMAIN_FILL);
					const data = new Uint8Array(inputAnalyser.fftSize);
					inputAnalyser.getByteTimeDomainData(data);
					return data;
				},
				getOutputTimeDomainData() {
					if (!outputAnalyser) return new Uint8Array(FALLBACK_TIME_DOMAIN_SIZE).fill(FALLBACK_TIME_DOMAIN_FILL);
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
}
//#endregion
export { grokRealtime };

//# sourceMappingURL=adapter.js.map