import { AudioPlayer, AudioStreamer, base64ToArrayBuffer } from "./utils.js";
import { GeminiLiveClient } from "./client.js";
import { createRealtimeEventEmitter } from "@tanstack/ai";
//#region src/realtime/adapter.ts
/**
* Creates a Gemini realtime adapter for client-side use.
*
* @param options - Optional configuration
* @returns A RealtimeAdapter for use with RealtimeClient
*
* @example
* ```typescript
* import { RealtimeClient } from '@tanstack/ai-client'
* import { geminiRealtime } from '@tanstack/ai-gemini'
*
* const client = new RealtimeClient({
*   getToken: () => fetch('/api/realtime-token').then(r => r.json()),
*   adapter: geminiRealtime(),
*   onGoAway: () => client.updateSession({ ... }) // Resume session with new config (available only for Gemini Live adapter)
* })
*
* ```
*/
function geminiRealtime(options = {}) {
	return {
		provider: "gemini",
		connect(token, clientTools) {
			return createWebSocketConnection(token, options.model, clientTools);
		}
	};
}
/**
* Creates a WebSocket connection to Gemini's realtime API
*/
async function createWebSocketConnection(token, model = "gemini-3.8-live", tools) {
	const { emit, on: realtimeEventEmitterOn } = createRealtimeEventEmitter();
	let currentMode = "idle";
	let currentMessageId = null;
	let messageIdCounter = 0;
	function generateMessageId() {
		return `gemini-msg-${Date.now()}-${++messageIdCounter}`;
	}
	const client = new GeminiLiveClient(token.token, model, tools);
	let message = {
		id: "",
		role: "assistant",
		timestamp: 0,
		parts: []
	};
	let pendingAssistantResponse = "";
	client.onClose = () => {
		emit("status_change", { status: "idle" });
		emit("mode_change", { mode: "idle" });
	};
	client.onError = (error) => {
		emit("error", { error });
		emit("status_change", { status: "error" });
		emit("mode_change", { mode: "idle" });
	};
	client.onReceiveResponse = (response) => {
		switch (response.type) {
			case "text":
				message.parts.push({
					type: "text",
					content: response.data
				});
				break;
			case "audio": {
				const pcm = base64ToArrayBuffer(response.data.audioData);
				message.parts.push({
					type: "audio",
					transcript: response.data.transcript,
					audioData: pcm
				});
				if (currentMode !== "speaking") {
					currentMode = "speaking";
					emit("mode_change", { mode: "speaking" });
				}
				audioPlayer.play(pcm).catch((error) => emit("error", { error }));
				break;
			}
			case "go_away":
				emit("go_away", { timeLeft: response.data.timeLeft });
				break;
			case "usage_metadata":
				emit("usage", {
					completionTokens: response.data.responseTokenCount ?? 0,
					promptTokens: response.data.promptTokenCount ?? 0,
					totalTokens: response.data.totalTokenCount ?? 0
				});
				break;
			case "input_transcription":
				if (response.data.finished && currentMode !== "thinking") {
					currentMode = "thinking";
					emit("mode_change", { mode: "thinking" });
				}
				emit("transcript", {
					isFinal: response.data.finished,
					transcript: response.data.text,
					role: "user"
				});
				break;
			case "output_transcription":
				pendingAssistantResponse += response.data.text;
				emit("transcript", {
					isFinal: response.data.finished,
					transcript: pendingAssistantResponse,
					role: "assistant"
				});
				break;
			case "interrupted":
				audioPlayer.interrupt();
				currentMode = "listening";
				emit("mode_change", { mode: "listening" });
				emit("interrupted", { messageId: currentMessageId ?? void 0 });
				break;
			case "tool_call":
				for (const tool of response.data.functionCalls || []) if (tool.id && tool.name) emit("tool_call", {
					toolCallId: tool.id,
					input: tool.args,
					toolName: tool.name
				});
				break;
			case "turn_complete":
				currentMessageId = generateMessageId();
				message.id = currentMessageId;
				message.timestamp = Date.now();
				message.parts.push({
					type: "text",
					content: pendingAssistantResponse
				});
				emit("message_complete", { message });
				pendingAssistantResponse = "";
				message = {
					id: "",
					role: "assistant",
					timestamp: 0,
					parts: []
				};
				currentMode = "listening";
				emit("mode_change", { mode: "listening" });
				break;
			case "setup_complete":
				emit("status_change", { status: "connected" });
				break;
			case "error": emit("error", { error: new Error(response.data) });
		}
	};
	await client.connect();
	const audioStreamer = new AudioStreamer(client);
	const audioPlayer = new AudioPlayer();
	try {
		await audioPlayer.init();
		await audioStreamer.start();
	} catch (error) {
		audioStreamer.stop();
		audioPlayer.destroy();
		client.disconnect();
		throw error;
	}
	return {
		async disconnect() {
			audioStreamer.stop();
			audioPlayer.destroy();
			client.disconnect();
			currentMode = "idle";
			emit("status_change", { status: "idle" });
		},
		async startAudioCapture() {
			audioStreamer.startAudioCapture();
			currentMode = "listening";
			emit("mode_change", { mode: "listening" });
		},
		stopAudioCapture() {
			audioStreamer.stopAudioCapture();
			currentMode = "idle";
			emit("mode_change", { mode: "idle" });
		},
		sendText(text) {
			client.sendTextMessage(text);
			currentMode = "thinking";
			emit("mode_change", { mode: "thinking" });
		},
		sendImage(imageData, mimeType) {
			client.sendImageMessage(imageData, mimeType);
			currentMode = "thinking";
			emit("mode_change", { mode: "thinking" });
		},
		sendToolResult(callId, result) {
			client.sendToolResponse([{
				id: callId,
				response: { result }
			}]);
		},
		updateSession(config) {
			client.updateSession(config).catch((error) => emit("error", { error }));
			emit("status_change", { status: "reconnecting" });
		},
		updateToken(newToken) {
			client.updateToken(newToken);
			emit("status_change", { status: "reconnecting" });
		},
		interrupt() {
			audioPlayer.interrupt();
			currentMode = "listening";
			emit("mode_change", { mode: "listening" });
			emit("interrupted", { messageId: currentMessageId ?? void 0 });
		},
		on: realtimeEventEmitterOn,
		getAudioVisualization() {
			return {
				get inputLevel() {
					return audioStreamer.inputLevel;
				},
				get outputLevel() {
					return audioPlayer.outputLevel;
				},
				getInputFrequencyData() {
					return audioStreamer.inputFrequencyData;
				},
				getOutputFrequencyData() {
					return audioPlayer.outputFrequencyData;
				},
				getInputTimeDomainData() {
					return audioStreamer.inputTimeDomainData;
				},
				getOutputTimeDomainData() {
					return audioPlayer.outputTimeDomainData;
				},
				get inputSampleRate() {
					return audioStreamer.inputSampleRate;
				},
				get outputSampleRate() {
					return audioPlayer.outputSampleRate;
				}
			};
		}
	};
}
//#endregion
export { geminiRealtime };

//# sourceMappingURL=adapter.js.map