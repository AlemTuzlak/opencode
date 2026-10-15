import { isBindingConfig, resolveConfigFromEnv } from "../utils/config.js";
import { runModel } from "../utils/run.js";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
import { arrayBufferToBase64, generateId } from "@tanstack/ai-utils";
import { BaseTranscriptionAdapter } from "@tanstack/ai/adapters";
//#region src/adapters/transcription.ts
async function toBytes(audio, fetchImpl, signal) {
	if (typeof audio === "string") {
		if (/^https?:\/\//.test(audio)) {
			const response = await fetchImpl(audio, { signal });
			if (!response.ok) throw new Error(`Could not fetch audio from ${audio} (${response.status})`);
			return {
				bytes: await response.arrayBuffer(),
				contentType: response.headers.get("content-type") ?? "audio/mpeg"
			};
		}
		const match = /^data:([^;]+);base64,(.*)$/.exec(audio);
		const base64 = match?.[2] ?? audio;
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);
		for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
		return {
			bytes: bytes.buffer,
			contentType: match?.[1] ?? "audio/mpeg"
		};
	}
	if (audio instanceof ArrayBuffer) return {
		bytes: audio,
		contentType: "audio/mpeg"
	};
	return {
		bytes: await audio.arrayBuffer(),
		contentType: audio.type || "audio/mpeg"
	};
}
/**
* Cloudflare transcription adapter. Whisper models take base64 audio in the
* `audio` input; Deepgram Nova takes the raw bytes. Both return text plus
* timed words, and Whisper also returns segments.
*/
var CloudflareTranscriptionAdapter = class extends BaseTranscriptionAdapter {
	cfConfig;
	name = "cloudflare";
	constructor(cfConfig, model) {
		super(model, {});
		this.cfConfig = cfConfig;
	}
	async transcribe(options) {
		const { model, logger, language, prompt } = options;
		try {
			logger.request(`activity=transcription provider=${this.name} model=${model}`, {
				provider: this.name,
				model
			});
			const fetchImpl = (isBindingConfig(this.cfConfig) ? void 0 : this.cfConfig.fetch) ?? fetch;
			const { bytes, contentType } = await toBytes(options.audio, fetchImpl, options.abortSignal);
			const output = model.startsWith("@cf/deepgram/") ? await this.runNova(model, bytes, contentType, options) : await this.runWhisper(model, bytes, {
				language,
				prompt,
				...options.modelOptions
			}, options.abortSignal);
			return {
				id: generateId(this.name),
				model,
				...output
			};
		} catch (error) {
			logger.errors(`${this.name}.transcribe fatal`, {
				error: toRunErrorPayload(error, `${this.name}.transcribe failed`),
				source: `${this.name}.transcribe`
			});
			throw error;
		}
	}
	async runWhisper(model, bytes, inputs, signal) {
		const { language, prompt, ...rest } = inputs;
		const output = await runModel(this.cfConfig, model, {
			...language && { language },
			...prompt && { initial_prompt: prompt },
			...rest,
			audio: arrayBufferToBase64(bytes)
		}, { signal });
		if (typeof output.text !== "string") throw new Error(`Workers AI ${model} returned no transcript`);
		return {
			text: output.text,
			language: output.transcription_info?.language,
			duration: output.transcription_info?.duration,
			segments: output.segments?.map((segment, id) => ({
				id,
				start: segment.start,
				end: segment.end,
				text: segment.text.trim()
			})),
			words: toWords(output.words)
		};
	}
	async runNova(model, bytes, contentType, options) {
		const output = await runModel(this.cfConfig, model, {
			...options.language && { language: options.language },
			...options.modelOptions
		}, {
			signal: options.abortSignal,
			binary: {
				field: "audio",
				body: bytes,
				contentType
			}
		});
		const alternative = output.results?.channels?.[0]?.alternatives?.[0];
		if (typeof alternative?.transcript !== "string") throw new Error(`Workers AI ${model} returned no transcript`);
		return {
			text: alternative.transcript,
			duration: output.metadata?.duration,
			words: toWords(alternative?.words)
		};
	}
};
function toWords(words) {
	return words?.map((w) => ({
		word: (w.word ?? "").trim(),
		start: w.start ?? 0,
		end: w.end ?? 0
	}));
}
function createCloudflareTranscription(model, config) {
	return new CloudflareTranscriptionAdapter(config, model);
}
function cloudflareTranscription(model, config) {
	return new CloudflareTranscriptionAdapter(resolveConfigFromEnv(config), model);
}
//#endregion
export { CloudflareTranscriptionAdapter, cloudflareTranscription, createCloudflareTranscription };

//# sourceMappingURL=transcription.js.map