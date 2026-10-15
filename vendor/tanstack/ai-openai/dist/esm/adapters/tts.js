import { getOpenAIApiKeyFromEnv } from "../utils/client.js";
import { validateAudioInput, validateInstructions, validateSpeed } from "../audio/audio-provider-options.js";
import OpenAI$1 from "openai";
import { arrayBufferToBase64, generateId } from "@tanstack/ai-utils";
import { BaseTTSAdapter } from "@tanstack/ai/adapters";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
//#region src/adapters/tts.ts
/**
* OpenAI Text-to-Speech Adapter
*
* Tree-shakeable adapter for OpenAI TTS functionality.
* Supports tts-1, tts-1-hd, and gpt-4o-audio-preview models.
*
* Features:
* - Multiple voice options: alloy, ash, ballad, coral, echo, fable, onyx, nova, sage, shimmer, verse
* - Multiple output formats: mp3, opus, aac, flac, wav, pcm
* - Speed control (0.25 to 4.0)
*/
var OpenAITTSAdapter = class extends BaseTTSAdapter {
	name = "openai";
	client;
	constructor(config, model) {
		super(model, {});
		this.client = new OpenAI$1(config);
	}
	async generateSpeech(options) {
		const { model, text, voice, format, speed, modelOptions } = options;
		validateAudioInput({
			input: text,
			model: this.model,
			voice: "alloy"
		});
		if (speed !== void 0) validateSpeed({
			speed,
			model: this.model,
			input: "",
			voice: "alloy"
		});
		if (modelOptions) validateInstructions({
			...modelOptions,
			model,
			input: "",
			voice: "alloy"
		});
		const request = {
			model,
			input: text,
			voice: voice || "alloy",
			response_format: format,
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
			const outputFormat = request.response_format || "mp3";
			const contentType = {
				mp3: "audio/mpeg",
				opus: "audio/opus",
				aac: "audio/aac",
				flac: "audio/flac",
				wav: "audio/wav",
				pcm: "audio/pcm"
			}[outputFormat] || "audio/mpeg";
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
};
/**
* Creates an OpenAI speech adapter with explicit API key.
* Type resolution happens here at the call site.
*
* @param model - The model name (e.g., 'tts-1', 'tts-1-hd')
* @param apiKey - Your OpenAI API key
* @param config - Optional additional configuration
* @returns Configured OpenAI speech adapter instance with resolved types
*
* @example
* ```typescript
* const adapter = createOpenaiSpeech('tts-1-hd', "sk-...");
*
* const result = await generateSpeech({
*   adapter,
*   text: 'Hello, world!',
*   voice: 'nova'
* });
* ```
*/
function createOpenaiSpeech(model, apiKey, config) {
	return new OpenAITTSAdapter({
		apiKey,
		...config
	}, model);
}
/**
* Creates an OpenAI speech adapter with automatic API key detection from environment variables.
* Type resolution happens here at the call site.
*
* Looks for `OPENAI_API_KEY` in:
* - `process.env` (Node.js)
* - `window.env` (Browser with injected env)
*
* @param model - The model name (e.g., 'tts-1', 'tts-1-hd')
* @param config - Optional configuration (excluding apiKey which is auto-detected)
* @returns Configured OpenAI speech adapter instance with resolved types
* @throws Error if OPENAI_API_KEY is not found in environment
*
* @example
* ```typescript
* // Automatically uses OPENAI_API_KEY from environment
* const adapter = openaiSpeech('tts-1');
*
* const result = await generateSpeech({
*   adapter,
*   text: 'Welcome to TanStack AI!',
*   voice: 'alloy',
*   format: 'mp3'
* });
* ```
*/
function openaiSpeech(model, config) {
	return createOpenaiSpeech(model, getOpenAIApiKeyFromEnv(), config);
}
//#endregion
export { OpenAITTSAdapter, createOpenaiSpeech, openaiSpeech };

//# sourceMappingURL=tts.js.map