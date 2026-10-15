import { createGeminiClient, getGeminiApiKeyFromEnv } from "../utils/client.js";
import "../utils/index.js";
import { getGeminiVideoDurationOptions, isInteractionsVideoModel, parseGeminiOmniVideoSize } from "../video/video-provider-options.js";
import { GenerateVideosOperation, VideoGenerationReferenceType } from "@google/genai";
import { fileReferenceFor, isFileSource, resolveMediaPrompt, unsupportedFileSourceError } from "@tanstack/ai";
import { BaseVideoAdapter } from "@tanstack/ai/adapters";
import { arrayBufferToBase64 } from "@tanstack/ai-utils";
//#region src/adapters/video.ts
/**
* Extract a human-readable message from a long-running operation's error,
* which the SDK types as `Record<string, unknown>` (a google.rpc.Status).
*/
function operationErrorMessage(error) {
	if (typeof error.message === "string" && error.message.length > 0) return error.message;
	return JSON.stringify(error);
}
/**
* Convert a TanStack image prompt part into the genai `Image` shape Veo
* accepts: base64 `imageBytes` (data sources, data: URIs, fetched HTTP
* URLs) or a `gcsUri` passthrough for Cloud Storage references.
*
* Unlike `generateContent` (chat / native image generation), Veo's predict
* API has no `fileData.fileUri` equivalent — `Image` only accepts
* `imageBytes` or `gcsUri`. An HTTP(S) URL therefore has to be fetched and
* inlined locally, which buffers the whole image in memory; that only happens
* when the caller opts in via `allowUrlFetch`, otherwise it throws. Prefer a
* `gs://` reference on memory-constrained runtimes.
*/
async function imagePartToVeoImage(part, allowUrlFetch) {
	if (part.source.type === "data") return {
		imageBytes: part.source.value,
		mimeType: part.source.mimeType || "image/png"
	};
	if (isFileSource(part.source)) throw unsupportedFileSourceError("gemini", "for Veo video generation, which needs inline image bytes or a gs:// reference — pass a data: URI or gs:// URL");
	const url = part.source.value;
	if (url.startsWith("gs://")) return {
		gcsUri: url,
		...part.source.mimeType && { mimeType: part.source.mimeType }
	};
	if (url.startsWith("data:")) {
		const match = url.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
		if (!match || !match[2]) throw new Error("gemini: only base64 data: URIs are supported for video image inputs.");
		return {
			imageBytes: match[3] ?? "",
			mimeType: match[1] || part.source.mimeType || "image/png"
		};
	}
	if (!allowUrlFetch) throw new Error(`gemini Veo: HTTP(S) URL image inputs are not fetched by default because Veo accepts only inline bytes, so the image would be downloaded and buffered in memory (risking OOM on constrained runtimes). Pass a data: URI or a gs:// reference, or set \`allowUrlFetch: true\` on the adapter config to opt into fetching. URL: ${url}`);
	const response = await fetch(url);
	if (!response.ok) throw new Error(`Failed to fetch image input (${response.status} ${response.statusText}): ${url}`);
	const blob = await response.blob();
	const buffer = await blob.arrayBuffer();
	return {
		imageBytes: arrayBufferToBase64(buffer),
		mimeType: part.source.mimeType || blob.type || "image/png"
	};
}
/**
* Convert an image or video prompt part into an Interactions API content
* block. Data sources become inline base64 `data`; URL sources pass through
* as `uri` (Files API URIs — mirrors the Interactions text adapter).
*/
function mediaPartToInteractionsContent(part) {
	const sourceValue = isFileSource(part.source) ? fileReferenceFor(part.source, "gemini") : part.source.value;
	const mimeType = part.source.mimeType;
	if (part.type === "image") return part.source.type === "data" ? {
		type: "image",
		data: sourceValue,
		mime_type: mimeType
	} : {
		type: "image",
		uri: sourceValue,
		mime_type: mimeType
	};
	return part.source.type === "data" ? {
		type: "video",
		data: sourceValue,
		mime_type: mimeType
	} : {
		type: "video",
		uri: sourceValue,
		mime_type: mimeType
	};
}
/**
* Pull the generated video out of a completed interaction. Prefers the
* SDK's `output_video` sugar, then walks `steps` back-to-front for the last
* `model_output` step carrying a video content block (the wire shape the
* raw REST response uses).
*/
function extractInteractionVideo(interaction) {
	const direct = interaction.output_video;
	if (direct && (direct.data || direct.uri)) return {
		data: direct.data,
		uri: direct.uri,
		mimeType: direct.mime_type || "video/mp4"
	};
	const steps = interaction.steps ?? [];
	for (let i = steps.length - 1; i >= 0; i--) {
		const step = steps[i];
		if (step?.type !== "model_output") continue;
		for (const block of step.content ?? []) if (block.type === "video" && (block.data || block.uri)) return {
			data: block.data,
			uri: block.uri,
			mimeType: block.mime_type || "video/mp4"
		};
	}
}
/**
* Map Interactions usage onto the canonical TokenUsage shape. Omni reports
* video output via `output_tokens_by_modality`; fall back to the video
* modality entry when the total is absent.
*/
function interactionUsageToTokenUsage(usage) {
	if (!usage) return void 0;
	const videoTokens = usage.output_tokens_by_modality?.find((entry) => entry.modality === "video")?.tokens;
	const promptTokens = usage.total_input_tokens ?? 0;
	const completionTokens = usage.total_output_tokens ?? videoTokens ?? 0;
	return {
		promptTokens,
		completionTokens,
		totalTokens: usage.total_tokens ?? promptTokens + completionTokens
	};
}
/**
* Gemini Video Generation Adapter (Veo + Gemini Omni Flash)
*
* Tree-shakeable adapter for Google video generation, routing by model:
*
* **Veo models** run as a long-running operation: `createVideoJob` starts
* the operation via the `:predictLongRunning` endpoint, `getVideoStatus`
* polls it, and `getVideo` extracts the generated video's URI once it
* completes. Image prompt parts are routed by `metadata.role`:
* - `'start_frame'` (or the first un-roled image) → the input image the
*   video starts from
* - `'end_frame'` → `lastFrame` (the frame the video ends on)
* - `'reference'` / `'character'` → `referenceImages` (asset references,
*   Veo 3.1)
*
* Note: the returned Veo video URI is served by the Gemini Files API and
* requires the API key (`x-goog-api-key` header or `?key=` query
* parameter) to download.
*
* **Gemini Omni Flash** (`gemini-omni-1.1-flash`) only serves the Interactions API:
* `createVideoJob` creates a background interaction with
* `response_modalities: ['video']`, `getVideoStatus` polls it by id, and
* `getVideo` returns the inline base64 MP4 as a `data:` URL (or the
* Files API URI when the server delivers by reference). Image and video
* prompt parts are sent as interaction content blocks, grouped as images,
* then videos, then the text prompt (interleaving is not preserved); pass
* `modelOptions.previous_interaction_id` to conversationally edit a prior
* Omni generation. `size` is an `aspectRatio_resolution` template
* (`'16:9'` or `'16:9_1080p'`); the optional suffix maps onto
* `response_format.resolution` (`'360p' | '720p' | '1080p' | '4k'`,
* default 720p).
*
* @experimental Video generation is an experimental feature and may change.
*/
var GeminiVideoAdapter = class extends BaseVideoAdapter {
	name = "gemini";
	supportsFileSources = true;
	client;
	allowUrlFetch;
	constructor(config, model) {
		super({}, model);
		this.client = createGeminiClient(config);
		this.allowUrlFetch = config.allowUrlFetch ?? false;
	}
	async createVideoJob(options) {
		const { prompt, size, duration, logger } = options;
		logger.request(`activity=video.create provider=${this.name} model=${this.model} size=${size ?? "default"} duration=${duration ?? "default"}`, {
			provider: this.name,
			model: this.model
		});
		if (isInteractionsVideoModel(this.model)) return await this.createInteractionsVideoJob(options);
		const modelOptions = options.modelOptions;
		try {
			const resolved = resolveMediaPrompt(prompt);
			if (resolved.videos.length > 0) throw new Error(`${this.name}.createVideoJob does not support video prompt parts (model: ${this.model}).`);
			if (resolved.audios.length > 0) throw new Error(`${this.name}.createVideoJob does not support audio prompt parts (model: ${this.model}).`);
			const { image, lastFrame, referenceImages } = await this.routeImageParts(resolved.images);
			const config = {
				...modelOptions,
				...size !== void 0 && { aspectRatio: size },
				...duration !== void 0 && { durationSeconds: duration },
				...lastFrame && { lastFrame },
				...referenceImages.length > 0 && { referenceImages }
			};
			const operation = await this.client.models.generateVideos({
				model: this.model,
				prompt: resolved.text,
				...image && { image },
				config
			});
			if (!operation.name) throw new Error("Veo did not return an operation name for the video generation job.");
			return {
				jobId: operation.name,
				model: this.model
			};
		} catch (error) {
			logger.errors(`${this.name}.createVideoJob fatal`, {
				error,
				source: `${this.name}.createVideoJob`
			});
			throw error;
		}
	}
	/**
	* Gemini Omni Flash job creation via the Interactions API. Creates a
	* background interaction requesting video output; the interaction id is
	* the job id polled by `getVideoStatus` / `getVideo`.
	*/
	async createInteractionsVideoJob(options) {
		const { prompt, size, duration, logger } = options;
		const modelOptions = options.modelOptions;
		try {
			const resolved = resolveMediaPrompt(prompt);
			if (resolved.audios.length > 0) throw new Error(`${this.name}.createVideoJob does not support audio prompt parts (model: ${this.model}).`);
			const content = [...resolved.images.map(mediaPartToInteractionsContent), ...resolved.videos.map(mediaPartToInteractionsContent)];
			if (resolved.text) content.push({
				type: "text",
				text: resolved.text
			});
			if (content.length === 0) throw new Error(`${this.name}.createVideoJob: the prompt produced no content to send (model: ${this.model}).`);
			const durations = this.availableDurations();
			if (duration !== void 0 && durations.kind === "range" && (duration < durations.min || duration > durations.max)) throw new Error(`${this.name}.createVideoJob: duration ${duration}s is outside the ${durations.min}–${durations.max}s range supported by ${this.model}. Use snapDuration() to snap arbitrary values into range.`);
			const parsedSize = size !== void 0 ? parseGeminiOmniVideoSize(size) : void 0;
			const responseFormat = parsedSize !== void 0 || duration !== void 0 ? { response_format: {
				type: "video",
				...parsedSize !== void 0 && {
					aspect_ratio: parsedSize.aspectRatio,
					...parsedSize.resolution !== void 0 && { resolution: parsedSize.resolution }
				},
				...duration !== void 0 && { duration: `${duration}s` }
			} } : {};
			const interaction = await this.client.interactions.create({
				...modelOptions,
				model: this.model,
				input: [{
					type: "user_input",
					content
				}],
				response_modalities: ["video"],
				background: true,
				...responseFormat
			});
			if (!interaction.id) throw new Error("Gemini Omni did not return an interaction id for the video generation job.");
			return {
				jobId: interaction.id,
				model: this.model
			};
		} catch (error) {
			logger.errors(`${this.name}.createVideoJob fatal`, {
				error,
				source: `${this.name}.createVideoJob`
			});
			throw error;
		}
	}
	/**
	* Route image prompt parts onto Veo's request fields by `metadata.role`.
	*/
	async routeImageParts(parts) {
		let image;
		let lastFrame;
		const referenceImages = [];
		for (const part of parts) {
			const role = part.metadata?.role;
			switch (role) {
				case "end_frame":
					if (lastFrame) throw new Error(`${this.name}: Veo accepts at most one 'end_frame' image.`);
					lastFrame = await imagePartToVeoImage(part, this.allowUrlFetch);
					break;
				case "reference":
				case "character":
					referenceImages.push({
						image: await imagePartToVeoImage(part, this.allowUrlFetch),
						referenceType: VideoGenerationReferenceType.ASSET
					});
					break;
				case "start_frame":
				case void 0:
					if (image) throw new Error(`${this.name}: Veo accepts at most one starting image; received multiple 'start_frame'/un-roled images. Use metadata.role ('end_frame', 'reference') to disambiguate the others.`);
					image = await imagePartToVeoImage(part, this.allowUrlFetch);
					break;
				case "mask":
				case "control": throw new Error(`${this.name}: unsupported image role "${role}" for Veo video generation.`);
			}
		}
		return {
			image,
			lastFrame,
			referenceImages
		};
	}
	async getVideoStatus(jobId) {
		if (isInteractionsVideoModel(this.model)) return await this.getInteractionsVideoStatus(jobId);
		const operation = await this.getOperation(jobId);
		if (!operation.done) return {
			jobId,
			status: "processing"
		};
		if (operation.error) return {
			jobId,
			status: "failed",
			error: operationErrorMessage(operation.error)
		};
		if ((operation.response?.generatedVideos ?? []).length === 0) {
			const reasons = operation.response?.raiMediaFilteredReasons;
			return {
				jobId,
				status: "failed",
				error: reasons?.length ? `Video was filtered by Responsible-AI: ${reasons.join("; ")}` : "Veo returned no generated videos."
			};
		}
		return {
			jobId,
			status: "completed"
		};
	}
	/**
	* Poll an Omni background interaction. `in_progress` maps to
	* 'processing'; a `completed` interaction with no video content (e.g.
	* filtered output) is surfaced as a failure so `getVideo` doesn't
	* throw on an empty response. `requires_action` also fails: the adapter
	* never sends tools, so it can only arise via
	* `previous_interaction_id` chaining onto a tool-bearing interaction —
	* and such an interaction never progresses without a client response,
	* so polling it would spin until timeout.
	*/
	async getInteractionsVideoStatus(jobId) {
		const interaction = await this.getInteraction(jobId);
		const status = interaction.status;
		if (status === "in_progress") return {
			jobId,
			status: "processing"
		};
		if (status === "requires_action") return {
			jobId,
			status: "failed",
			error: "Gemini Omni interaction is waiting on a client action (tool response), which the video jobs flow does not support."
		};
		if (status === "completed") {
			if (!extractInteractionVideo(interaction)) return {
				jobId,
				status: "failed",
				error: "Gemini Omni completed the interaction without returning a video (the output may have been filtered)."
			};
			return {
				jobId,
				status: "completed"
			};
		}
		return {
			jobId,
			status: "failed",
			error: `Gemini Omni video generation ended with status "${status}".`
		};
	}
	async getVideo(jobId) {
		if (isInteractionsVideoModel(this.model)) return await this.getInteractionsVideoUrl(jobId);
		const operation = await this.getOperation(jobId);
		if (!operation.done) throw new Error(`Video is not ready yet. Check status first. Job ID: ${jobId}`);
		if (operation.error) throw new Error(`Video generation failed: ${operationErrorMessage(operation.error)}`);
		const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
		if (!uri) {
			const reasons = operation.response?.raiMediaFilteredReasons;
			throw new Error(reasons?.length ? `Video was filtered by Responsible-AI: ${reasons.join("; ")}` : `Video URL not found in operation response. Job ID: ${jobId}`);
		}
		return {
			jobId,
			url: uri
		};
	}
	/**
	* Extract the finished Omni video. Inline base64 output (the API default)
	* becomes a `data:` URL — matching the OpenAI Sora adapter's inline
	* delivery — and URI delivery passes through (Files API URIs need the API
	* key to download, like Veo). Usage carries the video-modality output
	* tokens (Omni bills per second of video, reported as tokens).
	*/
	async getInteractionsVideoUrl(jobId) {
		const interaction = await this.getInteraction(jobId);
		const status = interaction.status;
		if (status === "in_progress") throw new Error(`Video is not ready yet. Check status first. Job ID: ${jobId}`);
		if (status !== "completed") throw new Error(`Video generation failed: Gemini Omni interaction ended with status "${status}". Job ID: ${jobId}`);
		const video = extractInteractionVideo(interaction);
		if (!video) throw new Error(`Video not found in interaction response (the output may have been filtered). Job ID: ${jobId}`);
		const usage = interactionUsageToTokenUsage(interaction.usage);
		return {
			jobId,
			url: video.uri ?? `data:${video.mimeType};base64,${video.data}`,
			...usage && { usage }
		};
	}
	availableDurations() {
		return getGeminiVideoDurationOptions(this.model);
	}
	/**
	* Fetch the long-running operation by name. The SDK's
	* `operations.getVideosOperation` needs a real `GenerateVideosOperation`
	* instance (it calls `_fromAPIResponse` on it), so reconstruct one from
	* the job ID rather than passing an object literal.
	*/
	async getOperation(jobId) {
		const operation = new GenerateVideosOperation();
		operation.name = jobId;
		return await this.client.operations.getVideosOperation({ operation });
	}
	/**
	* Fetch an Omni background interaction by id.
	*/
	async getInteraction(jobId) {
		return await this.client.interactions.get(jobId);
	}
};
function createGeminiVideo(model, apiKey, config) {
	return new GeminiVideoAdapter({
		apiKey,
		...config
	}, model);
}
function geminiVideo(model, config) {
	return createGeminiVideo(model, getGeminiApiKeyFromEnv(), config);
}
//#endregion
export { GeminiVideoAdapter, createGeminiVideo, geminiVideo };

//# sourceMappingURL=video.js.map