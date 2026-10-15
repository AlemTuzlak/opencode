import { getGrokApiKeyFromEnv } from "../utils/client.js";
import { toAudioFile } from "../utils/audio.js";
import { generateId } from "../utils/index.js";
import { BaseTranscriptionAdapter } from "@tanstack/ai/adapters";
//#region src/adapters/transcription.ts
var DEFAULT_GROK_BASE_URL = "https://api.x.ai/v1";
/**
* Grok Speech-to-Text Adapter.
*
* Talks to `POST {baseURL}/stt` per
* https://docs.x.ai/developers/rest-api-reference/inference/voice
*/
var GrokTranscriptionAdapter = class extends BaseTranscriptionAdapter {
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
	async transcribe(options) {
		const { logger } = options;
		const { model, audio, language, modelOptions } = options;
		logger.request(`activity=generateTranscription provider=grok model=${model}`, {
			provider: "grok",
			model
		});
		const form = buildTranscriptionFormData({
			file: toAudioFile(audio, modelOptions?.audio_format),
			language,
			modelOptions
		});
		try {
			const response = await fetch(`${this.baseURL}/stt`, {
				method: "POST",
				headers: {
					...this.defaultHeaders,
					Authorization: `Bearer ${this.apiKey}`
				},
				body: form
			});
			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(`Grok transcription request failed: ${response.status} ${errorText}`);
			}
			const data = await response.json();
			const words = data.words?.map((w) => {
				const tw = {
					word: w.text,
					start: w.start,
					end: w.end
				};
				if (w.confidence !== void 0) tw.confidence = w.confidence;
				if (w.speaker !== void 0) tw.speaker = w.speaker;
				return tw;
			});
			const resolvedLanguage = data.language ?? language;
			const usage = data.duration !== void 0 && data.duration > 0 ? {
				promptTokens: 0,
				completionTokens: 0,
				totalTokens: 0,
				billed: {
					quantity: data.duration,
					unit: "seconds"
				},
				durationSeconds: data.duration
			} : void 0;
			return {
				id: generateId(this.name),
				model,
				text: data.text,
				...resolvedLanguage !== void 0 && { language: resolvedLanguage },
				duration: data.duration,
				...words !== void 0 && { words },
				...usage !== void 0 && { usage }
			};
		} catch (error) {
			logger.errors("grok.transcribe fatal", {
				error,
				source: "grok.transcribe"
			});
			throw error;
		}
	}
};
/**
* Build the multipart/form-data body for `POST /v1/stt`, coercing SDK-level
* model options into xAI's wire format (booleans as `'true'`/`'false'`
* strings, numeric fields stringified, etc.).
*
* Wire-field mapping:
*   - `modelOptions.inverse_text_normalization` → `format` (xAI's chosen
*     wire-field name for the ITN boolean; the SDK surfaces it under the
*     clearer `inverse_text_normalization` key).
*   - `modelOptions.audio_format`, `sample_rate`, `multichannel`, `channels`,
*     `diarize` map to same-named form fields.
*/
function buildTranscriptionFormData(options) {
	const { file, language, modelOptions } = options;
	const form = new FormData();
	form.set("file", file);
	if (language) form.set("language", language);
	if (modelOptions?.audio_format !== void 0) form.set("audio_format", modelOptions.audio_format);
	if (modelOptions?.sample_rate !== void 0) form.set("sample_rate", String(modelOptions.sample_rate));
	if (modelOptions?.inverse_text_normalization !== void 0) form.set("format", modelOptions.inverse_text_normalization ? "true" : "false");
	if (modelOptions?.multichannel !== void 0) form.set("multichannel", modelOptions.multichannel ? "true" : "false");
	if (modelOptions?.channels !== void 0) form.set("channels", String(modelOptions.channels));
	if (modelOptions?.diarize !== void 0) form.set("diarize", modelOptions.diarize ? "true" : "false");
	return form;
}
/**
* Creates a Grok transcription adapter with an explicit API key.
*
* @example
* ```typescript
* const adapter = createGrokTranscription('grok-stt', 'xai-...')
* const result = await generateTranscription({
*   adapter,
*   audio: audioFile,
*   language: 'en',
* })
* ```
*/
function createGrokTranscription(model, apiKey, config) {
	return new GrokTranscriptionAdapter({
		apiKey,
		...config
	}, model);
}
/**
* Creates a Grok transcription adapter, reading the API key from
* `XAI_API_KEY` in the environment.
*
* @throws Error if `XAI_API_KEY` is not set.
*/
function grokTranscription(model, config) {
	return createGrokTranscription(model, getGrokApiKeyFromEnv(), config);
}
//#endregion
export { GrokTranscriptionAdapter, buildTranscriptionFormData, createGrokTranscription, grokTranscription };

//# sourceMappingURL=transcription.js.map