import { buildGeminiUsage } from "../usage.js";
import { createGeminiClient, generateId, getGeminiApiKeyFromEnv } from "../utils/client.js";
import "../utils/index.js";
import { GEMINI_TTS_VOICES } from "../model-meta.js";
import { BaseTTSAdapter } from "@tanstack/ai/adapters";
//#region src/adapters/tts.ts
/**
* Gemini Text-to-Speech Adapter
*
* Tree-shakeable adapter for Gemini TTS functionality.
*
* **IMPORTANT**: Gemini TTS uses the Live API (WebSocket-based) which requires
* different handling than traditional REST APIs. This adapter provides a
* simplified interface but may have limitations.
*
* @experimental Gemini TTS is an experimental feature and may change.
*
* Models:
* - gemini-2.5-flash-preview-tts
*/
var GeminiTTSAdapter = class extends BaseTTSAdapter {
	name = "gemini";
	/**
	* Gemini multi-speaker TTS tops out at 2 voices, and reports no timings.
	*/
	capabilities = { maxSpeakers: 2 };
	client;
	constructor(config, model) {
		super(model, config);
		this.client = createGeminiClient(config);
	}
	/**
	* Generate speech from text using Gemini's TTS model.
	*
	* @experimental This implementation is experimental and may change.
	* @see https://ai.google.dev/gemini-api/docs/speech-generation
	*/
	async generateSpeech(options) {
		const { model, modelOptions, voice, logger, turns } = options;
		logger.request(`activity=generateSpeech provider=gemini model=${model}`, {
			provider: "gemini",
			model
		});
		const speechConfig = {};
		const text = turns ? turns.map((turn) => `${turn.voice}: ${turn.text}`).join("\n") : options.text;
		if (turns) speechConfig.multiSpeakerVoiceConfig = { speakerVoiceConfigs: [...new Set(turns.map((turn) => turn.voice))].map(toGeminiVoice).map((voiceName) => ({
			speaker: voiceName,
			voiceConfig: { prebuiltVoiceConfig: { voiceName } }
		})) };
		else if (modelOptions?.multiSpeakerVoiceConfig) {
			const speakerConfigs = modelOptions.multiSpeakerVoiceConfig.speakerVoiceConfigs;
			if (!Array.isArray(speakerConfigs) || speakerConfigs.length < 1 || speakerConfigs.length > 2) throw new Error(`Gemini TTS multiSpeakerVoiceConfig.speakerVoiceConfigs must contain 1 or 2 speakers; received ${Array.isArray(speakerConfigs) ? speakerConfigs.length : "non-array"}.`);
			speechConfig.multiSpeakerVoiceConfig = modelOptions.multiSpeakerVoiceConfig;
		} else {
			const defaultVoiceName = voice !== void 0 ? toGeminiVoice(voice) : "Kore";
			speechConfig.voiceConfig = { prebuiltVoiceConfig: { voiceName: (modelOptions?.voiceConfig)?.prebuiltVoiceConfig?.voiceName ?? defaultVoiceName } };
		}
		if (modelOptions?.languageCode) speechConfig.languageCode = modelOptions.languageCode;
		try {
			const response = await this.client.models.generateContent({
				model,
				contents: [{
					role: "user",
					parts: [{ text }]
				}],
				config: {
					responseModalities: ["AUDIO"],
					speechConfig,
					...modelOptions?.systemInstruction && { systemInstruction: modelOptions.systemInstruction }
				}
			});
			const parts = (response.candidates?.[0])?.content?.parts;
			if (!parts || parts.length === 0) throw new Error("No audio output received from Gemini TTS");
			const audioPart = parts.find((part) => part.inlineData?.mimeType?.startsWith("audio/"));
			if (!audioPart || !audioPart.inlineData || !audioPart.inlineData.data) throw new Error("No audio data in Gemini TTS response");
			const audioBase64 = audioPart.inlineData.data;
			const mimeType = audioPart.inlineData.mimeType;
			const usageField = response.usageMetadata ? { usage: buildGeminiUsage(response.usageMetadata) } : {};
			const pcm = parsePcmMimeType(mimeType);
			if (pcm) {
				const wavBase64 = wrapPcmBase64AsWav(audioBase64, pcm.sampleRate, pcm.channels, pcm.bitsPerSample);
				return {
					id: generateId(this.name),
					model,
					audio: wavBase64,
					format: "wav",
					contentType: "audio/wav",
					...usageField
				};
			}
			const format = (mimeType.split(";")[0] ?? "").split("/")[1] || "wav";
			return {
				id: generateId(this.name),
				model,
				audio: audioBase64,
				format,
				contentType: mimeType,
				...usageField
			};
		} catch (error) {
			logger.errors("gemini.generateSpeech fatal", {
				error,
				source: "gemini.generateSpeech"
			});
			throw error;
		}
	}
};
/** Narrow a caller-supplied voice string to a known Gemini voice, or throw. */
function toGeminiVoice(voice) {
	const match = GEMINI_TTS_VOICES.find((known) => known === voice);
	if (!match) throw new Error(`Invalid Gemini TTS voice "${voice}". Valid voices are: ${GEMINI_TTS_VOICES.join(", ")}.`);
	return match;
}
function parsePcmMimeType(mimeType) {
	const normalized = mimeType.toLowerCase();
	if (((normalized.split(";")[0] ?? "").split("/")[1] ?? "").includes("wav")) return void 0;
	const bitDepthMatch = /^audio\/l(\d+)/.exec(normalized);
	if (!(bitDepthMatch !== null || normalized.startsWith("audio/pcm") || normalized.startsWith("audio/x-pcm") || normalized.includes("codec=pcm"))) return void 0;
	const rateMatch = /rate=(\d+)/.exec(normalized);
	const channelsMatch = /channels=(\d+)/.exec(normalized);
	const bitsPerSample = bitDepthMatch ? Number(bitDepthMatch[1]) : 16;
	return {
		sampleRate: rateMatch ? Number(rateMatch[1]) : 24e3,
		channels: channelsMatch ? Number(channelsMatch[1]) : 1,
		bitsPerSample
	};
}
function wrapPcmBase64AsWav(pcmBase64, sampleRate, channels = 1, bitsPerSample = 16) {
	if (bitsPerSample !== 16) throw new Error(`Unsupported PCM bit depth ${bitsPerSample}: only 16-bit PCM can be wrapped as WAV.`);
	const pcmBytes = typeof Buffer !== "undefined" ? new Uint8Array(Buffer.from(pcmBase64, "base64")) : decodeBase64(pcmBase64);
	const byteRate = sampleRate * channels * bitsPerSample / 8;
	const blockAlign = channels * bitsPerSample / 8;
	const dataSize = pcmBytes.byteLength;
	const buffer = new ArrayBuffer(44 + dataSize);
	const view = new DataView(buffer);
	writeAscii(view, 0, "RIFF");
	view.setUint32(4, 36 + dataSize, true);
	writeAscii(view, 8, "WAVE");
	writeAscii(view, 12, "fmt ");
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, channels, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, byteRate, true);
	view.setUint16(32, blockAlign, true);
	view.setUint16(34, bitsPerSample, true);
	writeAscii(view, 36, "data");
	view.setUint32(40, dataSize, true);
	new Uint8Array(buffer, 44).set(pcmBytes);
	if (typeof Buffer !== "undefined") return Buffer.from(buffer).toString("base64");
	let binary = "";
	const bytes = new Uint8Array(buffer);
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary);
}
function decodeBase64(b64) {
	const binary = atob(b64);
	const out = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
	return out;
}
function writeAscii(view, offset, text) {
	for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i));
}
/**
* Creates a Gemini TTS adapter with explicit API key.
* Type resolution happens here at the call site.
*
* @experimental Gemini TTS is an experimental feature and may change.
*
* @param model - The model name (e.g., 'gemini-2.5-flash-preview-tts')
* @param apiKey - Your Google API key
* @param config - Optional additional configuration
* @returns Configured Gemini TTS adapter instance with resolved types
*
* @example
* ```typescript
* const adapter = createGeminiSpeech('gemini-2.5-flash-preview-tts', "your-api-key");
*
* const result = await generateSpeech({
*   adapter,
*   text: 'Hello, world!'
* });
* ```
*/
function createGeminiSpeech(model, apiKey, config) {
	return new GeminiTTSAdapter({
		...config,
		apiKey
	}, model);
}
/**
* Creates a Gemini speech adapter with automatic API key detection from environment variables.
* Type resolution happens here at the call site.
*
* @experimental Gemini TTS is an experimental feature and may change.
*
* Looks for `GOOGLE_API_KEY` or `GEMINI_API_KEY` in:
* - `process.env` (Node.js)
* - `window.env` (Browser with injected env)
*
* @param model - The model name (e.g., 'gemini-2.5-flash-preview-tts')
* @param config - Optional configuration (excluding apiKey which is auto-detected)
* @returns Configured Gemini speech adapter instance with resolved types
* @throws Error if GOOGLE_API_KEY or GEMINI_API_KEY is not found in environment
*
* @example
* ```typescript
* // Automatically uses GOOGLE_API_KEY from environment
* const adapter = geminiSpeech('gemini-2.5-flash-preview-tts');
*
* const result = await generateSpeech({
*   adapter,
*   text: 'Welcome to TanStack AI!'
* });
* ```
*/
function geminiSpeech(model, config) {
	return createGeminiSpeech(model, getGeminiApiKeyFromEnv(), config);
}
//#endregion
export { GeminiTTSAdapter, createGeminiSpeech, geminiSpeech };

//# sourceMappingURL=tts.js.map