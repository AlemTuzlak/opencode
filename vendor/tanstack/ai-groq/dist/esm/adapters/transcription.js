import { getGroqApiKeyFromEnv, withGroqDefaults } from "../utils/client.js";
import { base64ToArrayBuffer, generateId } from "@tanstack/ai-utils";
import { BaseTranscriptionAdapter } from "@tanstack/ai/adapters";
//#region src/adapters/transcription.ts
/**
* Flattens the `openai` SDK's `HeadersLike` config value into a plain record so
* it can be merged into the raw `fetch` request this adapter issues. Handles
* the shapes callers actually pass (`Headers`, an entries array, or a plain
* object); null/undefined values are dropped.
*
* ponytail: doesn't unwrap the SDK's internal `NullableHeaders` class; forward
* that shape here if the SDK ever hands it to adapter config.
*/
function normalizeHeaders(headers) {
	const out = {};
	if (!headers) return out;
	const assign = (key, value) => {
		if (value != null) out[key] = String(value);
	};
	if (headers instanceof Headers) headers.forEach((value, key) => assign(key, value));
	else if (Array.isArray(headers)) for (const [key, value] of headers) assign(key, value);
	else for (const [key, value] of Object.entries(headers)) assign(key, value);
	return out;
}
/**
* Groq Transcription (Speech-to-Text) Adapter
*
* Tree-shakeable adapter for Groq audio transcription. Supports
* whisper-large-v3 and whisper-large-v3-turbo.
*
* Features:
* - Audio file uploads (File, Blob, ArrayBuffer, base64/data URL)
* - Remote audio URLs passed directly via Groq's `url` field — no upload needed
* - Verbose JSON response with segment and word timestamps
* - Language detection or specification (ISO-639-1)
* - Confidence scores derived from segment avg_logprob
*/
var GroqTranscriptionAdapter = class extends BaseTranscriptionAdapter {
	name = "groq";
	apiKey;
	baseURL;
	defaultHeaders;
	constructor(config, model) {
		super(model, {});
		const resolved = withGroqDefaults(config);
		this.apiKey = resolved.apiKey;
		this.baseURL = resolved.baseURL ?? "https://api.groq.com/openai/v1";
		this.defaultHeaders = normalizeHeaders(resolved.defaultHeaders);
	}
	async transcribe(options) {
		const { model, audio, language, prompt, responseFormat, modelOptions } = options;
		if (responseFormat === "srt" || responseFormat === "vtt") throw new Error(`Groq transcription does not support responseFormat='${responseFormat}'. Supported values: 'json', 'text', 'verbose_json'.`);
		const effectiveFormat = responseFormat ?? "verbose_json";
		const useVerbose = effectiveFormat === "verbose_json";
		const form = new FormData();
		form.append("model", model);
		form.append("response_format", effectiveFormat);
		if (language !== void 0) form.append("language", language);
		if (prompt !== void 0) form.append("prompt", prompt);
		if (modelOptions?.temperature !== void 0) form.append("temperature", String(modelOptions.temperature));
		if (modelOptions?.timestamp_granularities !== void 0) for (const g of modelOptions.timestamp_granularities) form.append("timestamp_granularities[]", g);
		if (typeof audio === "string" && /^https?:\/\//.test(audio)) form.append("url", audio);
		else form.append("file", this.prepareAudioFile(audio));
		try {
			options.logger.request(`activity=transcription provider=${this.name} model=${model} verbose=${useVerbose}`, {
				provider: this.name,
				model
			});
			const response = await fetch(`${this.baseURL}/audio/transcriptions`, {
				method: "POST",
				headers: {
					...this.defaultHeaders,
					Authorization: `Bearer ${this.apiKey}`
				},
				body: form
			});
			if (!response.ok) {
				const message = ((await response.json().catch(() => null))?.error)?.message ?? `Groq API error ${response.status}`;
				throw new Error(message);
			}
			if (useVerbose) {
				const data = await response.json();
				const requestId = data.x_groq?.id ?? generateId(this.name);
				const segments = data.segments?.map((seg) => ({
					id: seg.id,
					start: seg.start,
					end: seg.end,
					text: seg.text,
					confidence: Math.exp(seg.avg_logprob)
				}));
				const words = data.words?.map((w) => ({
					word: w.word,
					start: w.start,
					end: w.end
				}));
				return {
					id: requestId,
					model,
					text: data.text,
					...data.language !== void 0 && { language: data.language },
					...data.duration !== void 0 && { duration: data.duration },
					...segments !== void 0 && { segments },
					...words !== void 0 && { words }
				};
			} else if (effectiveFormat === "text") {
				const text = await response.text();
				return {
					id: generateId(this.name),
					model,
					text,
					...language !== void 0 && { language }
				};
			} else {
				const data = await response.json();
				return {
					id: data.x_groq?.id ?? generateId(this.name),
					model,
					text: data.text,
					...language !== void 0 && { language }
				};
			}
		} catch (error) {
			options.logger.errors(`${this.name}.transcribe fatal`, {
				error,
				source: `${this.name}.transcribe`
			});
			throw error;
		}
	}
	prepareAudioFile(audio) {
		if (typeof File !== "undefined" && audio instanceof File) return audio;
		if (typeof Blob !== "undefined" && audio instanceof Blob) {
			this.ensureFileSupport();
			return new File([audio], "audio.mp3", { type: audio.type || "audio/mpeg" });
		}
		if (typeof ArrayBuffer !== "undefined" && audio instanceof ArrayBuffer) {
			this.ensureFileSupport();
			return new File([audio], "audio.mp3", { type: "audio/mpeg" });
		}
		if (typeof audio === "string") {
			this.ensureFileSupport();
			if (audio.startsWith("data:")) {
				const parts = audio.split(",");
				const header = parts[0];
				const base64Data = parts[1] || "";
				const mimeType = (header?.match(/data:([^;]+)/))?.[1] || "audio/mpeg";
				const bytes = base64ToArrayBuffer(base64Data);
				const extension = mimeType.split("/")[1] || "mp3";
				return new File([bytes], `audio.${extension}`, { type: mimeType });
			}
			const bytes = base64ToArrayBuffer(audio);
			return new File([bytes], "audio.mp3", { type: "audio/mpeg" });
		}
		throw new Error("Invalid audio input type");
	}
	ensureFileSupport() {
		if (typeof File === "undefined") throw new Error("`File` is not available in this environment. Use Node.js 20 or newer, or pass a File object directly.");
	}
};
/**
* Creates a Groq transcription adapter with an explicit API key.
* Type resolution happens here at the call site.
*
* @param model - The model name (e.g., 'whisper-large-v3-turbo')
* @param apiKey - Your Groq API key
* @param config - Optional additional configuration
* @returns Configured Groq transcription adapter instance
*
* @example
* ```typescript
* const adapter = createGroqTranscription('whisper-large-v3-turbo', 'gsk_...');
*
* const result = await generateTranscription({
*   adapter,
*   audio: audioFile,
*   language: 'en',
* });
* ```
*/
function createGroqTranscription(model, apiKey, config) {
	return new GroqTranscriptionAdapter({
		apiKey,
		...config
	}, model);
}
/**
* Creates a Groq transcription adapter using the `GROQ_API_KEY` environment
* variable. Type resolution happens here at the call site.
*
* Looks for `GROQ_API_KEY` in:
* - `process.env` (Node.js)
* - `window.env` (browser with injected env)
*
* @param model - The model name (e.g., 'whisper-large-v3-turbo')
* @param config - Optional configuration (excluding apiKey which is auto-detected)
* @returns Configured Groq transcription adapter instance
* @throws Error if GROQ_API_KEY is not found in environment
*
* @example
* ```typescript
* const adapter = groqTranscription('whisper-large-v3-turbo');
*
* const result = await generateTranscription({
*   adapter,
*   audio: 'https://example.com/audio.mp3',
* });
*
* console.log(result.text)
* ```
*/
function groqTranscription(model, config) {
	return createGroqTranscription(model, getGroqApiKeyFromEnv(), config);
}
//#endregion
export { GroqTranscriptionAdapter, createGroqTranscription, groqTranscription };

//# sourceMappingURL=transcription.js.map