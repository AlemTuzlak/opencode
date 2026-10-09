import { snapToDurationOption } from "./snap.js";
import { arrayBufferToBase64 } from "@tanstack/ai-utils";
//#region src/activities/generateVideo/adapter.ts
var LARGE_VIDEO_BYTES = 10485760;
/**
* The fallback when nothing hosts a provider video stream: buffer it into a
* base64 `data:` URL. A result that already has a `url` passes through.
*/
async function inlineVideoStream(video) {
	const { body, contentType, ...rest } = video;
	if (rest.url !== void 0) return {
		...rest,
		url: rest.url
	};
	if (!body) throw new Error("Video result has no url and no body");
	const buffer = await new Response(body).arrayBuffer();
	if (buffer.byteLength > LARGE_VIDEO_BYTES) console.warn(`[generateVideo] buffered ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MiB of video into memory for a base64 data: URL. Workers/serverless runtimes commonly run out of memory above ~10 MiB. Add withGenerationPersistence with artifactUrl to stream it into your storage instead.`);
	return {
		...rest,
		url: `data:${contentType ?? "video/mp4"};base64,${arrayBufferToBase64(buffer)}`
	};
}
/**
* Abstract base class for video generation adapters.
* Extend this class to implement a video adapter for a specific provider.
*
* @experimental Video generation is an experimental feature and may change.
*
* Generic parameters match VideoAdapter - all pre-resolved by the provider function.
*/
var BaseVideoAdapter = class {
	kind = "video";
	supportsFileSources = false;
	model;
	config;
	constructor(config = {}, model) {
		this.config = config;
		this.model = model;
	}
	/**
	* @deprecated Implement and call `getVideo`. This is `getVideo` with a
	* provider stream buffered into a base64 `data:` URL.
	*/
	async getVideoUrl(jobId) {
		if (!this.getVideo) throw new Error(`${this.name}: video adapter must implement getVideo()`);
		return await inlineVideoStream(await this.getVideo(jobId));
	}
	/**
	* Default implementation returns `{ kind: 'none' }`. Adapters that have
	* declared their per-model duration map should override this.
	*/
	availableDurations() {
		return { kind: "none" };
	}
	/**
	* Uses `availableDurations()`. Adapters that declare a duration map only
	* need to override that method.
	*/
	snapDuration(input) {
		return snapToDurationOption(input, this.availableDurations());
	}
	generateId() {
		return `${this.name}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
	}
};
//#endregion
export { BaseVideoAdapter, inlineVideoStream };

//# sourceMappingURL=adapter.js.map