import { getOpenAIApiKeyFromEnv } from "../utils/client.js";
import { imagePartToFile } from "../image/image-input-to-file.js";
import { getOpenAIVideoDurationOptions, toApiSeconds, validateVideoSeconds, validateVideoSize } from "../video/video-provider-options.js";
import OpenAI$1 from "openai";
import { BaseVideoAdapter, snapToDurationOption } from "@tanstack/ai/adapters";
import { resolveMediaPrompt } from "@tanstack/ai";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
//#region src/adapters/video.ts
/**
* OpenAI Video Generation Adapter
*
* Tree-shakeable adapter for OpenAI video generation functionality using Sora-2.
* Uses a jobs/polling architecture for async video generation.
*
* @experimental Video generation is an experimental feature and may change.
*
* Features:
* - Async job-based video generation
* - Status polling for job progress
* - URL retrieval for completed videos
* - Model-specific type-safe provider options
*/
var OpenAIVideoAdapter = class extends BaseVideoAdapter {
	name = "openai";
	client;
	clientConfig;
	constructor(config, model) {
		super({}, model);
		this.clientConfig = config;
		const { allowUrlFetch: _allowUrlFetch, ...clientOptions } = config;
		this.client = new OpenAI$1(clientOptions);
	}
	async createVideoJob(options) {
		const { model, size, duration, modelOptions } = options;
		const resolvedSize = size ?? modelOptions?.size;
		validateVideoSize(model, resolvedSize);
		const seconds = duration ?? modelOptions?.seconds;
		validateVideoSeconds(model, seconds);
		const resolved = resolveMediaPrompt(options.prompt);
		if (resolved.videos.length > 0) throw new Error(`${this.name}.createVideoJob does not support video prompt parts (model: ${model}).`);
		if (resolved.audios.length > 0) throw new Error(`${this.name}.createVideoJob does not support audio prompt parts (model: ${model}).`);
		if (resolved.images.length > 1) throw new Error(`${this.name}: Sora accepts at most one input_reference image; received ${resolved.images.length}.`);
		const request = {
			model,
			prompt: resolved.text
		};
		const [inputReference] = resolved.images;
		if (inputReference) request.input_reference = await imagePartToFile(inputReference, "input-reference", this.clientConfig.allowUrlFetch ?? false);
		if (resolvedSize) request.size = resolvedSize;
		if (seconds !== void 0) {
			const apiSeconds = toApiSeconds(seconds);
			if (apiSeconds !== void 0) request.seconds = apiSeconds;
		}
		try {
			options.logger.request(`activity=video.create provider=${this.name} model=${model} size=${request.size ?? "default"} seconds=${request.seconds ?? "default"}`, {
				provider: this.name,
				model
			});
			return {
				jobId: (await this.getVideosClient().create(request)).id,
				model
			};
		} catch (error) {
			options.logger.errors(`${this.name}.createVideoJob fatal`, {
				error: toRunErrorPayload(error, `${this.name}.createVideoJob failed`),
				source: `${this.name}.createVideoJob`
			});
			if (error?.message?.includes("videos") || error?.code === "invalid_api") throw new Error(`Video generation API is not available. The API may require special access. Original error: ${error.message}`);
			throw error;
		}
	}
	/**
	* The video API on the OpenAI SDK is still experimental and shipped on some
	* SDK versions but not others; access through `videosClient` lets us treat
	* the path uniformly even when the SDK lacks first-class typings here.
	*/
	getVideosClient() {
		return this.client.videos;
	}
	async getVideoStatus(jobId) {
		try {
			const response = await this.getVideosClient().retrieve(jobId);
			return {
				jobId,
				status: this.mapStatus(response.status),
				progress: response.progress,
				...response.error?.message !== void 0 && { error: response.error.message }
			};
		} catch (error) {
			if (error.status === 404) return {
				jobId,
				status: "failed",
				error: "Job not found"
			};
			throw error;
		}
	}
	async getVideo(jobId) {
		try {
			const videosClient = this.getVideosClient();
			const videoInfo = await videosClient.retrieve(jobId);
			if (videoInfo.url) return {
				jobId,
				url: videoInfo.url,
				...videoInfo.expires_at !== void 0 && { expiresAt: new Date(videoInfo.expires_at) }
			};
			const response = await videosClient.downloadContent(jobId);
			if (!response.body) throw new Error("Video download returned no body");
			return {
				jobId,
				body: response.body,
				contentType: response.headers.get("content-type") || "video/mp4"
			};
		} catch (error) {
			if (error.status === 404) throw new Error(`Video job not found: ${jobId}`);
			if (error.status === 400) throw new Error(`Video is not ready for download. Check status first. Job ID: ${jobId}`);
			throw error;
		}
	}
	availableDurations() {
		return getOpenAIVideoDurationOptions(this.model);
	}
	/**
	* Returns the API string (`'4' | '8' | '12'`). Ties keep the earlier
	* option, so `6` and `"6s"` snap to `'4'`.
	*/
	snapDuration(input) {
		return snapToDurationOption(input, getOpenAIVideoDurationOptions(this.model));
	}
	mapStatus(apiStatus) {
		switch (apiStatus) {
			case "queued":
			case "pending": return "pending";
			case "processing":
			case "in_progress": return "processing";
			case "completed":
			case "succeeded": return "completed";
			case "failed":
			case "error":
			case "cancelled": return "failed";
			default: return "processing";
		}
	}
};
/**
* Creates an OpenAI video adapter with an explicit API key.
* Type resolution happens here at the call site.
*
* @experimental Video generation is an experimental feature and may change.
*
* @param model - The model name (e.g., 'sora-2')
* @param apiKey - Your OpenAI API key
* @param config - Optional additional configuration
* @returns Configured OpenAI video adapter instance with resolved types
*
* @example
* ```typescript
* const adapter = createOpenaiVideo('sora-2', 'your-api-key');
*
* const { jobId } = await generateVideo({
*   adapter,
*   prompt: 'A beautiful sunset over the ocean'
* });
* ```
*/
function createOpenaiVideo(model, apiKey, config) {
	return new OpenAIVideoAdapter({
		apiKey,
		...config
	}, model);
}
/**
* Creates an OpenAI video adapter with automatic API key detection from environment variables.
* Type resolution happens here at the call site.
*
* Looks for `OPENAI_API_KEY` in:
* - `process.env` (Node.js)
* - `window.env` (Browser with injected env)
*
* @experimental Video generation is an experimental feature and may change.
*
* @param model - The model name (e.g., 'sora-2')
* @param config - Optional configuration (excluding apiKey which is auto-detected)
* @returns Configured OpenAI video adapter instance with resolved types
* @throws Error if OPENAI_API_KEY is not found in environment
*
* @example
* ```typescript
* // Automatically uses OPENAI_API_KEY from environment
* const adapter = openaiVideo('sora-2');
*
* // Create a video generation job
* const { jobId } = await generateVideo({
*   adapter,
*   prompt: 'A cat playing piano'
* });
*
* // Poll for status
* const status = await getVideoJobStatus({
*   adapter,
*   jobId
* });
* ```
*/
function openaiVideo(model, config) {
	return createOpenaiVideo(model, getOpenAIApiKeyFromEnv(), config);
}
//#endregion
export { OpenAIVideoAdapter, createOpenaiVideo, openaiVideo };

//# sourceMappingURL=video.js.map