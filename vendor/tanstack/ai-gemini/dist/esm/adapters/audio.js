import { buildGeminiUsage } from "../usage.js";
import { createGeminiClient, generateId, getGeminiApiKeyFromEnv } from "../utils/client.js";
import "../utils/index.js";
import { BaseAudioAdapter } from "@tanstack/ai/adapters";
//#region src/adapters/audio.ts
/**
* Gemini Lyria Music Generation Adapter.
*
* Tree-shakeable adapter for Google Lyria music generation via the Gemini API.
*
* Models:
* - `lyria-3-pro-preview` — flagship model, full-length songs with verses,
*   choruses, and bridges. Outputs MP3 or WAV at 48 kHz stereo.
* - `lyria-3-clip-preview` — 30-second clips in MP3.
*
* @see https://ai.google.dev/gemini-api/docs/music-generation
*
* @example
* ```typescript
* const adapter = geminiAudio('lyria-3-pro-preview')
* const result = await generateAudio({
*   adapter,
*   prompt: 'An upbeat jazz track with saxophone and drums',
* })
* ```
*/
var GeminiAudioAdapter = class extends BaseAudioAdapter {
	name = "gemini";
	client;
	constructor(config, model) {
		super(model, config);
		this.client = createGeminiClient(config);
	}
	async generateAudio(options) {
		const { model, prompt, modelOptions, logger } = options;
		logger.request(`activity=generateAudio provider=gemini model=${model}`, {
			provider: "gemini",
			model
		});
		try {
			const response = await this.client.models.generateContent({
				model,
				contents: [{
					role: "user",
					parts: [{ text: prompt }]
				}],
				config: {
					responseModalities: ["AUDIO", "TEXT"],
					...modelOptions?.seed != null ? { seed: modelOptions.seed } : {}
				}
			});
			const audioPart = (response.candidates?.[0]?.content?.parts ?? []).find((part) => part.inlineData?.mimeType?.startsWith("audio/"));
			if (!audioPart?.inlineData?.data) throw new Error("No audio data in Gemini Lyria response");
			const contentType = audioPart.inlineData.mimeType;
			return {
				id: generateId(this.name),
				model,
				audio: {
					b64Json: audioPart.inlineData.data,
					...contentType !== void 0 && { contentType }
				},
				...response.usageMetadata ? { usage: buildGeminiUsage(response.usageMetadata) } : {}
			};
		} catch (error) {
			logger.errors("gemini.generateAudio fatal", {
				error,
				source: "gemini.generateAudio"
			});
			throw error;
		}
	}
};
/**
* Creates a Gemini Lyria audio adapter with an explicit API key.
*
* @param model - The Lyria model name (e.g., 'lyria-3-pro-preview')
* @param apiKey - Your Google API key
* @param config - Optional additional configuration
*
* @example
* ```typescript
* const adapter = createGeminiAudio('lyria-3-pro-preview', 'your-api-key')
* const result = await generateAudio({
*   adapter,
*   prompt: 'Ambient electronic music with soft pads',
* })
* ```
*/
function createGeminiAudio(model, apiKey, config) {
	return new GeminiAudioAdapter({
		...config,
		apiKey
	}, model);
}
/**
* Creates a Gemini Lyria audio adapter with automatic API key detection.
*
* Looks for `GOOGLE_API_KEY` or `GEMINI_API_KEY` in the environment.
*
* @param model - The Lyria model name (e.g., 'lyria-3-pro-preview')
* @param config - Optional configuration (excluding apiKey)
*
* @example
* ```typescript
* const adapter = geminiAudio('lyria-3-pro-preview')
* const result = await generateAudio({
*   adapter,
*   prompt: 'An orchestral piece with strings and brass',
* })
* ```
*/
function geminiAudio(model, config) {
	return createGeminiAudio(model, getGeminiApiKeyFromEnv(), config);
}
//#endregion
export { GeminiAudioAdapter, createGeminiAudio, geminiAudio };

//# sourceMappingURL=audio.js.map