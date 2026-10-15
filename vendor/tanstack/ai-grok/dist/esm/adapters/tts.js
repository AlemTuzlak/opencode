import { getGrokApiKeyFromEnv } from "../utils/client.js";
import { arrayBufferToBase64 } from "../utils/audio.js";
import { generateId } from "../utils/index.js";
import { BaseTTSAdapter } from "@tanstack/ai/adapters";
//#region src/adapters/tts.ts
var DEFAULT_GROK_BASE_URL = "https://api.x.ai/v1";
/**
* Grok Text-to-Speech Adapter.
*
* Talks to `POST {baseURL}/tts` per
* https://docs.x.ai/developers/model-capabilities/audio/text-to-speech
*/
var GrokSpeechAdapter = class extends BaseTTSAdapter {
	name = "grok";
	apiKey;
	baseURL;
	defaultHeaders;
	constructor(config, model) {
		super(model, config);
		this.apiKey = config.apiKey;
		this.baseURL = (config.baseURL ?? DEFAULT_GROK_BASE_URL).replace(/\/+$/, "");
		this.defaultHeaders = config.defaultHeaders ?? {};
	}
	async generateSpeech(options) {
		const { logger } = options;
		const { model, text, voice, format, modelOptions } = options;
		logger.request(`activity=generateSpeech provider=grok model=${model}`, {
			provider: "grok",
			model
		});
		const { body, codec, sampleRateForContentType } = buildTTSRequestBody({
			text,
			voice,
			format,
			modelOptions
		});
		try {
			const response = await fetch(`${this.baseURL}/tts`, {
				method: "POST",
				headers: {
					...this.defaultHeaders,
					Authorization: `Bearer ${this.apiKey}`,
					"Content-Type": "application/json"
				},
				body: JSON.stringify(body)
			});
			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Grok TTS request failed: ${response.status} ${errorText}`);
			}
			const arrayBuffer = await response.arrayBuffer();
			const audio = arrayBufferToBase64(arrayBuffer);
			return {
				id: generateId(this.name),
				model,
				audio,
				format: codec,
				contentType: getContentType(codec, sampleRateForContentType)
			};
		} catch (error) {
			logger.errors("grok.generateSpeech fatal", {
				error,
				source: "grok.generateSpeech"
			});
			throw error;
		}
	}
};
/**
* Build the JSON body for `POST /v1/tts`, resolving codec / sample-rate / voice
* defaults in one place.
*
* Returns the request `body`, the resolved `codec`, and the `sampleRateForContentType`
* used by the caller to label the response via `getContentType`.
*/
function buildTTSRequestBody(options) {
	const { text, voice, format, modelOptions } = options;
	const codec = pickCodec(modelOptions?.codec, format);
	const callerSampleRate = modelOptions?.sample_rate;
	const pcmDefault = 24e3;
	const needsRateInContentType = codec === "pcm";
	const outputFormat = { codec };
	if (callerSampleRate !== void 0) outputFormat.sample_rate = callerSampleRate;
	else if (needsRateInContentType) outputFormat.sample_rate = pcmDefault;
	if (codec === "mp3" && modelOptions?.bit_rate !== void 0) outputFormat.bit_rate = modelOptions.bit_rate;
	const sampleRateForContentType = callerSampleRate ?? pcmDefault;
	const body = {
		text,
		voice_id: voice ?? "eve",
		language: modelOptions?.language ?? "en",
		output_format: outputFormat
	};
	if (modelOptions?.optimize_streaming_latency !== void 0) body.optimize_streaming_latency = modelOptions.optimize_streaming_latency;
	if (modelOptions?.text_normalization !== void 0) body.text_normalization = modelOptions.text_normalization;
	return {
		body,
		codec,
		sampleRateForContentType
	};
}
/**
* Maps the cross-provider `TTSOptions.format` onto Grok's supported codecs.
* `opus`, `aac`, and `flac` are not supported by xAI TTS (which only exposes
* mp3/wav/pcm/mulaw/alaw) — we fall back to mp3. An explicit
* `modelOptions.codec` always wins.
*/
function pickCodec(codecOverride, format) {
	if (codecOverride) return codecOverride;
	if (!format) return "mp3";
	switch (format) {
		case "mp3":
		case "wav":
		case "pcm": return format;
		case "flac":
		case "opus":
		case "aac": return "mp3";
		default: return "mp3";
	}
}
function getContentType(codec, sampleRate) {
	switch (codec) {
		case "mp3": return "audio/mpeg";
		case "wav": return "audio/wav";
		case "pcm": return `audio/L16;rate=${sampleRate}`;
		case "mulaw": return sampleRate === 8e3 ? "audio/basic" : `audio/PCMU;rate=${sampleRate}`;
		case "alaw": return sampleRate === 8e3 ? "audio/x-alaw-basic" : `audio/PCMA;rate=${sampleRate}`;
	}
}
/**
* Creates a Grok speech (TTS) adapter with an explicit API key.
*
* @example
* ```typescript
* const adapter = createGrokSpeech('grok-tts', 'xai-...')
* const result = await generateSpeech({
*   adapter,
*   text: 'Hello from Grok',
*   voice: 'eve',
* })
* ```
*/
function createGrokSpeech(model, apiKey, config) {
	return new GrokSpeechAdapter({
		apiKey,
		...config
	}, model);
}
/**
* Creates a Grok speech (TTS) adapter, reading the API key from
* `XAI_API_KEY` in the environment.
*
* @throws Error if `XAI_API_KEY` is not set.
*/
function grokSpeech(model, config) {
	return createGrokSpeech(model, getGrokApiKeyFromEnv(), config);
}
//#endregion
export { GrokSpeechAdapter, buildTTSRequestBody, createGrokSpeech, getContentType, grokSpeech };

//# sourceMappingURL=tts.js.map