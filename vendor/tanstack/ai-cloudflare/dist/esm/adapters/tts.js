import { resolveConfigFromEnv } from "../utils/config.js";
import { outputToBase64, runModel } from "../utils/run.js";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
import { generateId } from "@tanstack/ai-utils";
import { BaseTTSAdapter } from "@tanstack/ai/adapters";
//#region src/adapters/tts.ts
var CONTENT_TYPES = {
	mp3: "audio/mpeg",
	opus: "audio/opus",
	aac: "audio/aac",
	flac: "audio/flac",
	wav: "audio/wav",
	pcm: "audio/pcm"
};
/**
* Cloudflare text-to-speech adapter for Workers AI models such as Deepgram
* Aura. `voice` maps to `speaker` and `format` to `encoding`; the audio comes
* back base64-encoded.
*/
var CloudflareTTSAdapter = class extends BaseTTSAdapter {
	cfConfig;
	name = "cloudflare";
	constructor(cfConfig, model) {
		super(model, {});
		this.cfConfig = cfConfig;
	}
	async generateSpeech(options) {
		const { model, logger, text, voice, format = "mp3" } = options;
		const inputs = {
			...voice && { speaker: voice },
			encoding: format === "wav" || format === "pcm" ? "linear16" : format,
			...format === "wav" && { container: "wav" },
			...options.modelOptions,
			text
		};
		try {
			logger.request(`activity=tts provider=${this.name} model=${model} chars=${text.length}`, {
				provider: this.name,
				model
			});
			const output = await runModel(this.cfConfig, model, inputs, { signal: options.abortSignal });
			const audio = output && typeof output === "object" && "audio" in output ? output.audio : await outputToBase64(output);
			return {
				id: generateId(this.name),
				model,
				audio,
				format,
				contentType: CONTENT_TYPES[format]
			};
		} catch (error) {
			logger.errors(`${this.name}.generateSpeech fatal`, {
				error: toRunErrorPayload(error, `${this.name}.generateSpeech failed`),
				source: `${this.name}.generateSpeech`
			});
			throw error;
		}
	}
};
function createCloudflareTTS(model, config) {
	return new CloudflareTTSAdapter(config, model);
}
function cloudflareTTS(model, config) {
	return new CloudflareTTSAdapter(resolveConfigFromEnv(config), model);
}
//#endregion
export { CloudflareTTSAdapter, cloudflareTTS, createCloudflareTTS };

//# sourceMappingURL=tts.js.map