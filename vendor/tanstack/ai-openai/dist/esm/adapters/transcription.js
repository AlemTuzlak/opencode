import { getOpenAIApiKeyFromEnv } from "../utils/client.js";
import OpenAI$1 from "openai";
import { base64ToArrayBuffer, generateId } from "@tanstack/ai-utils";
import { BaseTranscriptionAdapter } from "@tanstack/ai/adapters";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
//#region src/adapters/transcription.ts
var DIARIZE_MODELS = ["gpt-4o-transcribe-diarize"];
var DIARIZE_RESPONSE_FORMATS = [
	"json",
	"text",
	"diarized_json"
];
function isDiarizeModel(model) {
	return DIARIZE_MODELS.includes(model);
}
function mapDiarizedSegmentId(id, index) {
	const match = /^seg_(\d+)$/.exec(id);
	if (match) return Number(match[1]);
	if (id.trim() !== "") {
		const numericId = Number(id);
		if (!Number.isNaN(numericId)) return numericId;
	}
	return index;
}
/**
* Build TokenUsage from transcription response.
* Whisper-1 uses duration-based billing, GPT-4o models use token-based billing.
*/
/**
* Duration-billed usage: zeroed token fields with the billed seconds carried
* on `billed` and, for backward compatibility, the deprecated
* `durationSeconds`. Shared by the gpt-4o duration branch and the whisper-1
* path so the two fields can't drift apart.
*/
function durationUsage(seconds) {
	return {
		promptTokens: 0,
		completionTokens: 0,
		totalTokens: 0,
		billed: {
			quantity: seconds,
			unit: "seconds"
		},
		durationSeconds: seconds
	};
}
function buildTranscriptionUsage(model, duration, response) {
	const usage = response?.usage;
	if (model.startsWith("gpt-4o")) {
		if (!usage) return;
		if (usage.type === "duration") return durationUsage(usage.seconds);
		const result = {
			promptTokens: usage.input_tokens || 0,
			completionTokens: usage.output_tokens || 0,
			totalTokens: usage.total_tokens || 0
		};
		const inputDetails = usage.input_token_details;
		const promptTokensDetails = {
			...inputDetails?.audio_tokens ? { audioTokens: inputDetails.audio_tokens } : {},
			...inputDetails?.text_tokens ? { textTokens: inputDetails.text_tokens } : {}
		};
		if (Object.keys(promptTokensDetails).length > 0) result.promptTokensDetails = promptTokensDetails;
		if (usage.output_tokens) result.completionTokensDetails = { textTokens: usage.output_tokens };
		return result;
	}
	if (duration !== void 0 && duration > 0) return durationUsage(duration);
}
/**
* OpenAI Transcription (Speech-to-Text) Adapter
*
* Tree-shakeable adapter for OpenAI audio transcription functionality.
* Supports whisper-1, gpt-4o-transcribe, gpt-4o-mini-transcribe, and gpt-4o-transcribe-diarize.
*
* Features:
* - Multiple transcription models with different capabilities
* - Language detection or specification
* - Multiple output formats: json, text, srt, verbose_json, vtt, diarized_json
* - Word and segment-level timestamps (with verbose_json — whisper-1 only;
*   gpt-4o-transcribe and gpt-4o-mini-transcribe accept only json/text and
*   reject verbose_json with HTTP 400)
* - Speaker diarization (with gpt-4o-transcribe-diarize, which accepts json,
*   text, and diarized_json)
*/
var OpenAITranscriptionAdapter = class extends BaseTranscriptionAdapter {
	name = "openai";
	client;
	constructor(config, model) {
		super(model, {});
		this.client = new OpenAI$1(config);
	}
	async transcribe(options) {
		const { model, language } = options;
		try {
			const { request, responseMode } = this.buildTranscriptionRequest(options);
			options.logger.request(`activity=transcription provider=${this.name} model=${model} verbose=${responseMode === "verbose"} diarized=${responseMode === "diarized"}`, {
				provider: this.name,
				model
			});
			if (responseMode === "diarized") {
				const response = await this.client.audio.transcriptions.create(request);
				if (!Array.isArray(response.segments)) throw new Error(`OpenAI diarized transcription response did not include segments (model=${model}, response_format=diarized_json).`);
				const segments = response.segments.map((segment, index) => ({
					id: mapDiarizedSegmentId(segment.id, index),
					start: segment.start,
					end: segment.end,
					text: segment.text,
					speaker: segment.speaker
				}));
				const usage = buildTranscriptionUsage(model, response.duration, response);
				return {
					id: generateId(this.name),
					model,
					text: response.text,
					duration: response.duration,
					segments,
					...usage !== void 0 && { usage }
				};
			}
			if (responseMode === "verbose") {
				const response = await this.client.audio.transcriptions.create({
					...request,
					response_format: "verbose_json"
				});
				const segments = response.segments?.map((seg) => ({
					id: seg.id,
					start: seg.start,
					end: seg.end,
					text: seg.text,
					confidence: Math.exp(seg.avg_logprob)
				}));
				const words = response.words?.map((w) => ({
					word: w.word,
					start: w.start,
					end: w.end
				}));
				const usage = buildTranscriptionUsage(model, response.duration, response);
				return {
					id: generateId(this.name),
					model,
					text: response.text,
					language: response.language,
					duration: response.duration,
					...segments !== void 0 && { segments },
					...words !== void 0 && { words },
					...usage !== void 0 && { usage }
				};
			}
			const response = await this.client.audio.transcriptions.create(request);
			const usage = typeof response === "string" ? void 0 : buildTranscriptionUsage(model, void 0, response);
			return {
				id: generateId(this.name),
				model,
				text: typeof response === "string" ? response : response.text,
				...language !== void 0 && { language },
				...usage !== void 0 && { usage }
			};
		} catch (error) {
			options.logger.errors(`${this.name}.transcribe fatal`, {
				error: toRunErrorPayload(error, `${this.name}.transcribe failed`),
				source: `${this.name}.transcribe`
			});
			throw error;
		}
	}
	buildTranscriptionRequest(options) {
		const { model, audio, language, prompt, responseFormat, modelOptions } = options;
		const file = this.prepareAudioFile(audio);
		const isDiarizeTranscriptionModel = isDiarizeModel(model);
		const topLevelResponseFormat = responseFormat;
		const effectiveResponseFormat = topLevelResponseFormat ?? modelOptions?.response_format;
		if (topLevelResponseFormat !== void 0 && modelOptions?.response_format !== void 0 && topLevelResponseFormat !== modelOptions.response_format) throw new Error(`Conflicting response formats: responseFormat="${topLevelResponseFormat}" and modelOptions.response_format="${modelOptions.response_format}". Provide only one.`);
		this.validateDiarizationOptions({
			model,
			prompt,
			responseFormat: topLevelResponseFormat,
			modelOptions
		});
		const responseMode = this.resolveResponseMode({
			model,
			isDiarizeTranscriptionModel,
			effectiveResponseFormat
		});
		const responseFormatValue = responseMode === "diarized" ? "diarized_json" : this.mapResponseFormat(effectiveResponseFormat);
		const request = {
			...modelOptions,
			model,
			file
		};
		delete request.stream;
		if (language !== void 0) request.language = language;
		if (prompt !== void 0) request.prompt = prompt;
		if (isDiarizeTranscriptionModel && modelOptions?.chunking_strategy === void 0) request.chunking_strategy = "auto";
		request.response_format = responseFormatValue;
		return {
			request,
			responseMode
		};
	}
	resolveResponseMode({ model, isDiarizeTranscriptionModel, effectiveResponseFormat }) {
		if (effectiveResponseFormat === "diarized_json" || isDiarizeTranscriptionModel && effectiveResponseFormat === void 0) return "diarized";
		if (effectiveResponseFormat === "verbose_json" || effectiveResponseFormat === void 0 && model === "whisper-1") return "verbose";
		return "plain";
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
	validateDiarizationOptions({ model, prompt, responseFormat, modelOptions }) {
		const isDiarizeTranscriptionModel = isDiarizeModel(model);
		const modelOptionsResponseFormat = modelOptions?.response_format;
		if (!isDiarizeTranscriptionModel && (responseFormat === "diarized_json" || modelOptionsResponseFormat === "diarized_json" || modelOptions?.known_speaker_names !== void 0 || modelOptions?.known_speaker_references !== void 0)) throw new Error(`OpenAI speaker diarization options (response_format: 'diarized_json', known_speaker_names, known_speaker_references) are only supported with OpenAI diarization transcription models; model is "${model}".`);
		if (!isDiarizeTranscriptionModel) return;
		const unsupportedResponseFormat = [this.mapResponseFormat(responseFormat), ...modelOptionsResponseFormat !== void 0 ? [this.mapResponseFormat(modelOptionsResponseFormat)] : []].find((format) => !DIARIZE_RESPONSE_FORMATS.includes(format));
		if (unsupportedResponseFormat !== void 0) throw new Error(`OpenAI diarization transcription models only support json, text, and diarized_json response formats; received "${unsupportedResponseFormat}".`);
		if (prompt !== void 0 || modelOptions?.prompt !== void 0) throw new Error("OpenAI diarization transcription models do not support prompts.");
		if (modelOptions?.include !== void 0) throw new Error("OpenAI diarization transcription models do not support the include option.");
		if (modelOptions?.timestamp_granularities !== void 0) throw new Error("OpenAI diarization transcription models do not support timestamp_granularities.");
		if (modelOptions?.known_speaker_names === void 0 !== (modelOptions?.known_speaker_references === void 0)) throw new Error("OpenAI diarization known_speaker_names and known_speaker_references must both be provided together.");
		if (modelOptions?.known_speaker_names !== void 0) {
			if (modelOptions.known_speaker_names.length > 4) throw new Error("OpenAI diarization transcription models support at most 4 known speaker names.");
		}
		if (modelOptions?.known_speaker_references !== void 0) {
			if (modelOptions.known_speaker_references.length > 4) throw new Error("OpenAI diarization transcription models support at most 4 known speaker references.");
		}
		if (modelOptions?.known_speaker_names !== void 0 && modelOptions.known_speaker_references !== void 0 && modelOptions.known_speaker_names.length !== modelOptions.known_speaker_references.length) throw new Error(`OpenAI diarization known_speaker_names and known_speaker_references must have matching lengths; received ${modelOptions.known_speaker_names.length} names and ${modelOptions.known_speaker_references.length} references.`);
	}
	mapResponseFormat(format) {
		if (!format) return "json";
		return format;
	}
};
/**
* Creates an OpenAI transcription adapter with explicit API key.
* Type resolution happens here at the call site.
*
* @param model - The model name (e.g., 'whisper-1')
* @param apiKey - Your OpenAI API key
* @param config - Optional additional configuration
* @returns Configured OpenAI transcription adapter instance with resolved types
*
* @example
* ```typescript
* const adapter = createOpenaiTranscription('whisper-1', "sk-...");
*
* const result = await generateTranscription({
*   adapter,
*   audio: audioFile,
*   language: 'en'
* });
* ```
*/
function createOpenaiTranscription(model, apiKey, config) {
	return new OpenAITranscriptionAdapter({
		apiKey,
		...config
	}, model);
}
/**
* Creates an OpenAI transcription adapter with automatic API key detection from environment variables.
* Type resolution happens here at the call site.
*
* Looks for `OPENAI_API_KEY` in:
* - `process.env` (Node.js)
* - `window.env` (Browser with injected env)
*
* @param model - The model name (e.g., 'whisper-1')
* @param config - Optional configuration (excluding apiKey which is auto-detected)
* @returns Configured OpenAI transcription adapter instance with resolved types
* @throws Error if OPENAI_API_KEY is not found in environment
*
* @example
* ```typescript
* // Automatically uses OPENAI_API_KEY from environment
* const adapter = openaiTranscription('whisper-1');
*
* const result = await generateTranscription({
*   adapter,
*   audio: audioFile
* });
*
* console.log(result.text)
* ```
*/
function openaiTranscription(model, config) {
	return createOpenaiTranscription(model, getOpenAIApiKeyFromEnv(), config);
}
//#endregion
export { OpenAITranscriptionAdapter, createOpenaiTranscription, openaiTranscription };

//# sourceMappingURL=transcription.js.map