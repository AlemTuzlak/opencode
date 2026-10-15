import { getGroqApiKeyFromEnv, withGroqDefaults } from "../utils/client.js";
import { validateAudioInput } from "../audio/audio-provider-options.js";
import OpenAI from "openai";
import { arrayBufferToBase64, generateId } from "@tanstack/ai-utils";
import { BaseTTSAdapter } from "@tanstack/ai/adapters";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
//#region src/adapters/tts.ts
/**
* Groq Text-to-Speech Adapter
*
* Tree-shakeable adapter for Groq TTS functionality. Groq exposes an
* OpenAI-compatible `/audio/speech` endpoint, so the adapter drives it with
* the OpenAI SDK via a `baseURL` override (the same pattern as the Groq text
* adapter).
*
* Supports `canopylabs/orpheus-v1-english` and
* `canopylabs/orpheus-arabic-saudi`.
*
* Features:
* - English voices: autumn(f), diana(f), hannah(f), austin(m), daniel(m), troy(m)
* - Arabic voices: fahad(m), sultan(m), lulwa(f), noura(f)
* - Output formats: flac, mp3, mulaw, ogg, wav (default wav)
* - Speed control
* - Configurable sample rate via `modelOptions`
*/
var GroqTTSAdapter = class extends BaseTTSAdapter {
	name = "groq";
	client;
	constructor(config, model) {
		super(model, {});
		this.client = new OpenAI(withGroqDefaults(config));
	}
	async generateSpeech(options) {
		const { model, text, voice, format, speed, modelOptions } = options;
		validateAudioInput({
			input: text,
			model: this.model
		});
		const request = {
			model,
			input: text,
			voice: voice ?? "autumn",
			response_format: format ?? "wav",
			...speed !== void 0 && { speed },
			...modelOptions ?? {}
		};
		try {
			options.logger.request(`activity=tts provider=${this.name} model=${model} format=${request.response_format ?? "default"} voice=${request.voice}`, {
				provider: this.name,
				model
			});
			const arrayBuffer = await (await this.client.audio.speech.create(request)).arrayBuffer();
			const base64 = arrayBufferToBase64(arrayBuffer);
			const outputFormat = request.response_format ?? "wav";
			const contentType = this.getContentType(outputFormat);
			return {
				id: generateId(this.name),
				model,
				audio: base64,
				format: outputFormat,
				contentType
			};
		} catch (error) {
			options.logger.errors(`${this.name}.generateSpeech fatal`, {
				error: toRunErrorPayload(error, `${this.name}.generateSpeech failed`),
				source: `${this.name}.generateSpeech`
			});
			throw error;
		}
	}
	getContentType(format) {
		return {
			flac: "audio/flac",
			mp3: "audio/mpeg",
			mulaw: "audio/basic",
			ogg: "audio/ogg",
			wav: "audio/wav"
		}[format] || "audio/wav";
	}
};
/**
* Creates a Groq speech adapter with explicit API key.
* Type resolution happens here at the call site.
*
* @param model - The model name (e.g., 'canopylabs/orpheus-v1-english')
* @param apiKey - Your Groq API key
* @param config - Optional additional configuration
* @returns Configured Groq speech adapter instance with resolved types
*
* @example
* ```typescript
* const adapter = createGroqSpeech('canopylabs/orpheus-v1-english', 'gsk_...')
*
* const result = await generateSpeech({
*   adapter,
*   text: 'Hello, world!',
*   voice: 'autumn',
* })
* ```
*/
function createGroqSpeech(model, apiKey, config) {
	return new GroqTTSAdapter({
		apiKey,
		...config
	}, model);
}
/**
* Creates a Groq speech adapter with automatic API key detection from
* environment variables.
*
* Looks for `GROQ_API_KEY` in the environment.
*
* @param model - The model name (e.g., 'canopylabs/orpheus-v1-english')
* @param config - Optional configuration (excluding apiKey which is auto-detected)
* @returns Configured Groq speech adapter instance with resolved types
* @throws Error if GROQ_API_KEY is not found in environment
*
* @example
* ```typescript
* const adapter = groqSpeech('canopylabs/orpheus-v1-english')
*
* const result = await generateSpeech({
*   adapter,
*   text: 'Welcome to TanStack AI!',
*   voice: 'autumn',
*   format: 'wav',
* })
* ```
*/
function groqSpeech(model, config) {
	return createGroqSpeech(model, getGroqApiKeyFromEnv(), config);
}
//#endregion
export { GroqTTSAdapter, createGroqSpeech, groqSpeech };

//# sourceMappingURL=tts.js.map