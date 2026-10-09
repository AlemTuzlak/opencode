import { getGrokApiKeyFromEnv, withGrokDefaults } from "../utils/client.js";
import { getGrokVideoDurationOptions, isGrokVideoReferenceModel, isGrokVideoSourceModel, parseGrokVideoSize, validateVideoSize } from "../video/video-provider-options.js";
import { isFileSource, resolveMediaPrompt, unsupportedFileSourceError } from "@tanstack/ai";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
import { BaseVideoAdapter } from "@tanstack/ai/adapters";
//#region src/adapters/video.ts
/**
* xAI bills video generation in "USD ticks": 10^10 ticks per US dollar
* (e.g. one grok-imagine-video-1.5 second costs $0.08 = 800_000_000 ticks).
*/
var USD_TICKS_PER_DOLLAR = 1e10;
/**
* Convert a TanStack image / video part to the URL string accepted by xAI's
* Imagine video endpoints: public URLs pass through (fetched by xAI's
* servers), data sources become base64 data URIs.
*/
function mediaPartToUrl(part) {
	if (isFileSource(part.source)) throw unsupportedFileSourceError("grok");
	if (part.source.type === "url") return part.source.value;
	return `data:${part.source.mimeType};base64,${part.source.value}`;
}
function buildGrokVideoUsage(response) {
	const seconds = response.video?.duration;
	const ticks = response.usage?.cost_in_usd_ticks;
	if (seconds === void 0 && ticks === void 0) return void 0;
	return {
		promptTokens: 0,
		completionTokens: 0,
		totalTokens: 0,
		...seconds !== void 0 && {
			billed: {
				quantity: seconds,
				unit: "seconds"
			},
			unitsBilled: seconds
		},
		...ticks !== void 0 && { cost: ticks / USD_TICKS_PER_DOLLAR }
	};
}
/**
* Grok Video Generation Adapter (xAI Imagine API)
*
* Tree-shakeable adapter for the grok-imagine video models using the
* async jobs/polling architecture: create a generation request, poll it,
* then read the completed video URL.
*
* Both models support text-to-video and image-to-video;
* `grok-imagine-video-1.5` is xAI's documented default and adds native
* 1080p generation plus reference-to-video inputs. Source-video edit
* and extend are `grok-imagine-video` only.
*
* The Imagine video endpoints are not part of the OpenAI SDK surface (and
* xAI rejects the SDK's multipart paths), so requests are plain JSON calls
* issued with the configured `fetch` (or the global one).
*
* @experimental Video generation is an experimental feature and may change.
*
* Features:
* - Async job-based video generation (1–15 second clips with audio)
* - Aspect-ratio sizing via the "aspectRatio_resolution" size template
*   (e.g. '16:9_720p'), consistent with the grok-imagine image models
* - Image-to-video via an `image` prompt part (starting frame URL or data URI)
* - Reference-to-video via image prompt parts with
*   `metadata.role: 'reference'` or `'character'` (→ `reference_images`)
*   and preset voices via `modelOptions.reference_audios`
*   (grok-imagine-video-1.5 only)
* - Video editing / extension on `grok-imagine-video` via a source
*   `video` prompt part and `modelOptions.mode: 'edit' | 'extend'`
*   (`/v1/videos/edits` / `/v1/videos/extensions`; in extend mode
*   `duration` is the added tail)
* - Usage reporting: billed seconds (`usage.billed`) and exact cost
*/
var GrokVideoAdapter = class extends BaseVideoAdapter {
	name = "grok";
	clientConfig;
	constructor(config, model) {
		super({}, model);
		this.clientConfig = withGrokDefaults(config);
	}
	async request(path, init) {
		return await (this.clientConfig.fetch ?? globalThis.fetch.bind(globalThis))(`${this.clientConfig.baseURL}${path}`, {
			...init,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.clientConfig.apiKey}`
			}
		});
	}
	/**
	* Reads the error message out of an Imagine API error body
	* (`{"code": "...", "error": "..."}`), falling back to the raw text.
	*/
	async errorMessage(response) {
		const body = await response.text();
		try {
			const parsed = JSON.parse(body);
			if (typeof parsed === "object" && parsed !== null && "error" in parsed && typeof parsed.error === "string") return parsed.error;
		} catch {}
		return body;
	}
	async createVideoJob(options) {
		const { model, size, modelOptions, logger } = options;
		const { mode, ...wireOptions } = modelOptions ?? {};
		if (mode !== void 0 && mode !== "edit" && mode !== "extend") throw new Error(`${this.name}: unknown modelOptions.mode '${String(mode)}'. Expected 'edit' or 'extend'.`);
		const resolved = resolveMediaPrompt(options.prompt);
		if (resolved.audios.length > 0) throw new Error(`${this.name}.createVideoJob does not support audio prompt parts (model: ${model}). To reference a preset voice, pass modelOptions.reference_audios (e.g. [{ voice_id: 'eve' }]).`);
		if (!isGrokVideoSourceModel(model) && (mode !== void 0 || resolved.videos.length > 0)) throw new Error(`${this.name}: ${model} does not support video editing or extension. Use 'grok-imagine-video' for /v1/videos/edits and /v1/videos/extensions.`);
		if (resolved.videos.length > 1) throw new Error(`${this.name}: ${model} accepts at most one source video; received ${resolved.videos.length}.`);
		const [sourceVideo] = resolved.videos;
		if (sourceVideo && mode === void 0) throw new Error(`${this.name}: a video prompt part needs modelOptions.mode set to 'edit' (rewrite the clip) or 'extend' (append to it).`);
		if (!sourceVideo && mode !== void 0) throw new Error(`${this.name}: modelOptions.mode '${mode}' requires a video prompt part carrying the source clip.`);
		if (mode !== void 0 && sourceVideo) return await this.createSourceVideoJob({
			model,
			mode,
			sourceVideo,
			resolved,
			wireOptions,
			size,
			genericDuration: options.duration,
			logger
		});
		validateVideoSize(model, size);
		const { duration: rawOptionDuration, reference_images: explicitReferenceImages, reference_audios: referenceAudios, ...generationOptions } = wireOptions;
		const rawDuration = rawOptionDuration ?? options.duration;
		const duration = rawDuration != null ? this.snapDuration(rawDuration) : void 0;
		const startFrames = [];
		const referenceImages = [];
		for (const part of resolved.images) {
			const role = part.metadata?.role;
			switch (role) {
				case "mask":
				case "control":
				case "end_frame": throw new Error(`${this.name}: the Imagine video API has no '${role}' image input on model ${model}. Use an un-roled / 'start_frame' image as the starting frame, or 'reference' images.`);
				case "reference":
				case "character":
					referenceImages.push({ url: mediaPartToUrl(part) });
					break;
				case "start_frame":
				case void 0:
					startFrames.push(part);
					break;
				default: throw new Error(`${this.name}: unknown image metadata.role '${String(role)}'. Expected 'start_frame', 'reference', or 'character'.`);
			}
		}
		if (startFrames.length > 1) throw new Error(`${this.name}: ${model} accepts at most one starting-frame image; received ${startFrames.length}. Use metadata.role: 'reference' for reference-to-video inputs.`);
		const finalReferenceImages = explicitReferenceImages ?? (referenceImages.length > 0 ? referenceImages : void 0);
		const referenceImageCount = finalReferenceImages?.length ?? 0;
		const referenceAudioCount = referenceAudios?.length ?? 0;
		const hasReference = referenceImageCount > 0 || referenceAudioCount > 0;
		if (!isGrokVideoReferenceModel(model) && hasReference) throw new Error(`${this.name}: ${model} does not support reference-to-video inputs. Use 'grok-imagine-video-1.5' for reference_images / reference_audios.`);
		if (referenceAudioCount > 3) throw new Error(`${this.name}: ${model} accepts at most 3 reference voices; received ${referenceAudioCount}.`);
		if (referenceImageCount > 7) throw new Error(`${this.name}: ${model} accepts at most 7 reference images; received ${referenceImageCount}.`);
		const [startFrame] = startFrames;
		const parsedSize = size !== void 0 ? parseGrokVideoSize(size) : void 0;
		const resolvedResolution = generationOptions.resolution ?? parsedSize?.resolution;
		if (hasReference && resolvedResolution === "1080p") throw new Error(`${this.name}: reference-to-video is capped at 720p on ${model}.`);
		const request = {
			model,
			prompt: resolved.text,
			...startFrame && { image: { url: mediaPartToUrl(startFrame) } },
			...referenceImageCount > 0 && { reference_images: finalReferenceImages },
			...referenceAudioCount > 0 && { reference_audios: referenceAudios },
			...parsedSize && {
				aspect_ratio: parsedSize.aspectRatio,
				...parsedSize.resolution !== void 0 && { resolution: parsedSize.resolution }
			},
			...generationOptions,
			...duration !== void 0 && { duration }
		};
		return await this.postVideoJob("/videos/generations", request, {
			model,
			logger,
			logLine: `activity=video.create provider=${this.name} model=${model} mode=generate size=${size ?? "default"} duration=${duration ?? "default"}`
		});
	}
	/**
	* Build and post an edit / extension request. Both endpoints take only
	* `model`, `prompt`, and the source `video` (plus `duration` — the length
	* of the added tail — for extensions): output geometry is inherited from
	* the source clip, capped at 720p, and edit outputs also inherit the
	* source length. Rather than sending fields the API documents as ignored,
	* the inapplicable options are rejected with actionable errors.
	*/
	async createSourceVideoJob(args) {
		const { model, mode, sourceVideo, resolved, wireOptions, logger } = args;
		const endpoint = mode === "edit" ? "/videos/edits" : "/videos/extensions";
		if (resolved.images.length > 0) throw new Error(`${this.name}: '${mode}' mode takes only the source video — image prompt parts are not supported by ${endpoint}.`);
		const { aspect_ratio: aspectRatio, resolution, duration: modeDuration, reference_images: referenceImagesOption, reference_audios: referenceAudiosOption, ...passthrough } = wireOptions;
		if ((referenceImagesOption?.length ?? 0) > 0 || (referenceAudiosOption?.length ?? 0) > 0) throw new Error(`${this.name}: reference inputs are only supported by video generation, not '${mode}' mode.`);
		if (args.size !== void 0 || aspectRatio != null || resolution != null) throw new Error(`${this.name}: '${mode}' mode does not accept size / aspect_ratio / resolution — the output inherits the source clip's geometry (capped at 720p).`);
		const rawDuration = modeDuration ?? args.genericDuration;
		if (mode === "edit" && rawDuration != null) throw new Error(`${this.name}: 'edit' mode does not accept a duration — the output inherits the source clip's length. Use mode 'extend' to append seconds to the clip.`);
		const duration = rawDuration != null ? this.snapDuration(rawDuration) : void 0;
		const request = {
			model,
			prompt: resolved.text,
			video: { url: mediaPartToUrl(sourceVideo) },
			...passthrough,
			...duration !== void 0 && { duration }
		};
		return await this.postVideoJob(endpoint, request, {
			model,
			logger,
			logLine: `activity=video.create provider=${this.name} model=${model} mode=${mode} duration=${duration ?? "default"}`
		});
	}
	/**
	* POST a create-job request body to one of the Imagine video endpoints
	* (`/videos/generations`, `/videos/edits`, `/videos/extensions`) and read
	* the `request_id` out of the shared response shape.
	*/
	async postVideoJob(endpoint, request, context) {
		const { model, logger, logLine } = context;
		try {
			logger.request(logLine, {
				provider: this.name,
				model
			});
			const response = await this.request(endpoint, {
				method: "POST",
				body: JSON.stringify(request)
			});
			if (!response.ok) throw new Error(`grok: ${endpoint} request failed (${response.status} ${response.statusText}): ${await this.errorMessage(response)}`);
			const result = await response.json();
			if (!result.request_id) throw new Error(`grok: ${endpoint} response contained no request_id`);
			return {
				jobId: result.request_id,
				model
			};
		} catch (error) {
			logger.errors(`${this.name}.createVideoJob fatal`, {
				error: toRunErrorPayload(error, `${this.name}.createVideoJob failed`),
				source: `${this.name}.createVideoJob`
			});
			throw error;
		}
	}
	async retrieveJob(jobId) {
		const response = await this.request(`/videos/${jobId}`);
		if (!response.ok) {
			const error = /* @__PURE__ */ new Error(`grok: video status request failed (${response.status} ${response.statusText}): ${await this.errorMessage(response)}`);
			error.status = response.status;
			throw error;
		}
		return await response.json();
	}
	async getVideoStatus(jobId) {
		let response;
		try {
			response = await this.retrieveJob(jobId);
		} catch (error) {
			if (error.status === 404) return {
				jobId,
				status: "failed",
				error: "Job not found"
			};
			throw error;
		}
		return {
			jobId,
			status: this.mapStatus(response.status),
			...response.progress !== void 0 && { progress: response.progress },
			...response.error !== void 0 && { error: response.error }
		};
	}
	async getVideo(jobId) {
		let response;
		try {
			response = await this.retrieveJob(jobId);
		} catch (error) {
			if (error.status === 404) throw new Error(`Video job not found: ${jobId}`);
			throw error;
		}
		if (this.mapStatus(response.status) === "failed") throw new Error(`Video generation failed${response.error ? `: ${response.error}` : ""}. Job ID: ${jobId}`);
		const url = response.video?.url;
		if (!url) throw new Error(`Video is not ready for download. Check status first. Job ID: ${jobId}`);
		const usage = buildGrokVideoUsage(response);
		return {
			jobId,
			url,
			...usage && { usage }
		};
	}
	/**
	* Maps Imagine API job statuses onto the generic video status set. The
	* API reports 'pending' while queued/generating (with a numeric
	* `progress`), then a terminal 'done' / 'failed' / 'expired'.
	*/
	mapStatus(apiStatus) {
		switch (apiStatus) {
			case "pending":
			case "queued": return "pending";
			case "done":
			case "completed":
			case "succeeded": return "completed";
			case "failed":
			case "expired":
			case "error":
			case "cancelled": return "failed";
			case void 0:
			default: return "processing";
		}
	}
	/**
	* Both grok-imagine video models accept a continuous 1–15 integer-second
	* range. Consumers can use this to render UI without provider knowledge.
	*/
	availableDurations() {
		return getGrokVideoDurationOptions(this.model);
	}
};
/**
* Creates a Grok video adapter with an explicit API key.
* Type resolution happens here at the call site.
*
* @experimental Video generation is an experimental feature and may change.
*
* @param model - The model name (e.g., 'grok-imagine-video-1.5')
* @param apiKey - Your xAI API key
* @param config - Optional additional configuration
* @returns Configured Grok video adapter instance with resolved types
*
* @example
* ```typescript
* const adapter = createGrokVideo('grok-imagine-video-1.5', 'xai-...');
*
* const { jobId } = await generateVideo({
*   adapter,
*   prompt: 'A beautiful sunset over the ocean',
*   size: '16:9_720p',
*   duration: 5
* });
* ```
*/
function createGrokVideo(model, apiKey, config) {
	return new GrokVideoAdapter({
		apiKey,
		...config
	}, model);
}
/**
* Creates a Grok video adapter with automatic API key detection from environment variables.
* Type resolution happens here at the call site.
*
* Looks for `XAI_API_KEY` in:
* - `process.env` (Node.js)
* - `window.env` (Browser with injected env)
*
* @experimental Video generation is an experimental feature and may change.
*
* @param model - The model name (e.g., 'grok-imagine-video-1.5')
* @param config - Optional configuration (excluding apiKey which is auto-detected)
* @returns Configured Grok video adapter instance with resolved types
* @throws Error if XAI_API_KEY is not found in environment
*
* @example
* ```typescript
* // Automatically uses XAI_API_KEY from environment
* const adapter = grokVideo('grok-imagine-video-1.5');
*
* // Image-to-video: an optional image prompt part is the starting frame.
* const { jobId } = await generateVideo({
*   adapter,
*   prompt: [
*     { type: 'text', content: 'Make the cat start playing the piano' },
*     { type: 'image', source: { type: 'url', value: 'https://example.com/cat.png' } },
*   ],
* });
*
* // Poll for status
* const status = await getVideoJobStatus({ adapter, jobId });
* ```
*/
function grokVideo(model, config) {
	return createGrokVideo(model, getGrokApiKeyFromEnv(), config);
}
//#endregion
export { GrokVideoAdapter, createGrokVideo, grokVideo };

//# sourceMappingURL=video.js.map