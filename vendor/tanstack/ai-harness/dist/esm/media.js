import { kindOf, mediaIdOf } from "./media-ref.js";
import { generateTranscription } from "@tanstack/ai";
import { resolveBlobRange, retrieveBlob, withGenerationPersistence } from "@tanstack/ai-persistence";
//#region src/media.ts
/**
* A media request that failed. `status` is the HTTP status a route answers:
* 404 (not found, or another thread's), 413 (too big), 415 (type not allowed).
*/
var MediaError = class extends Error {
	status;
	constructor(status, message) {
		super(message);
		this.name = "MediaError";
		this.status = status;
	}
};
var DEFAULT_MAX_BYTES = 104857600;
var DATA_URL_MAX_BYTES = 1048576;
var ALL_KINDS = [
	"image",
	"audio",
	"video",
	"document"
];
function uploadRunId(threadId) {
	return `upload:${threadId}`;
}
function toMediaRecord(record, kind) {
	const isUpload = record.runId === uploadRunId(record.threadId);
	const segments = isUpload ? [] : record.runId.split(":");
	const [runId] = segments;
	const subagentRunId = segments.findLast((segment) => segment.startsWith("subagent-"));
	return {
		id: record.artifactId,
		threadId: record.threadId,
		kind,
		mimeType: record.mimeType,
		name: record.name,
		size: record.size,
		source: isUpload ? "user" : "generated",
		createdAt: record.createdAt,
		...runId ? { runId } : {},
		...subagentRunId ? { subagentRunId } : {}
	};
}
/** The byte length of a body, or `undefined` for a stream. */
function sizeOf(body) {
	if (typeof body === "string") return new TextEncoder().encode(body).byteLength;
	if (body instanceof Blob) return body.size;
	if (body instanceof ReadableStream) return void 0;
	return body.byteLength;
}
/**
* Base64 of `bytes`. It uses `btoa`, not the Node `Buffer`, so it runs on
* workerd too.
*/
function toBase64(bytes) {
	const chunk = 32768;
	let binary = "";
	for (let offset = 0; offset < bytes.length; offset += chunk) binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
	return btoa(binary);
}
/**
* The media store of one thread, on the persistence `artifacts` and `blobs`
* stores. It sees only the media of `threadId`: an id of another thread reads
* as not found.
*
* `put` throws a `MediaError` with 413 (over `maxBytes`) or 415 (a MIME type
* with no media kind, or a kind not in `kinds`). `load` throws a `MediaError`
* with 404 when the record or its bytes are missing.
*
* @example
* const media = createMediaStore({ persistence, threadId })
* const record = await media.put(bytes, { mimeType: 'image/png', name: 'cat.png' })
* const url = await media.dataUrl(record.id)
*/
function createMediaStore({ persistence, threadId, options = {} }) {
	const { artifacts, blobs } = persistence.stores;
	const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
	const kinds = options.kinds ?? ALL_KINDS;
	const tooBig = () => new MediaError(413, `The file is bigger than the limit of ${maxBytes} bytes.`);
	async function artifact(id) {
		const record = await artifacts.get(id);
		return record?.threadId === threadId ? record : null;
	}
	async function get(id) {
		const record = await artifact(id);
		const kind = record ? kindOf(record.mimeType) : void 0;
		return record && kind ? toMediaRecord(record, kind) : null;
	}
	async function load(id, range) {
		const record = await artifact(id);
		const blob = record ? await retrieveBlob(persistence, record, range ? { range: resolveBlobRange(record.size, range) } : void 0) : null;
		if (!blob) throw new MediaError(404, `Media ${id} was not found.`);
		return new Uint8Array(await blob.arrayBuffer());
	}
	return {
		/** Store a user file. Returns its record. */
		async put(body, info) {
			const kind = kindOf(info.mimeType);
			if (kind === void 0) throw new MediaError(415, `Files of type ${info.mimeType} are not supported.`);
			if (!kinds.includes(kind)) throw new MediaError(415, `This harness does not accept ${kind} files.`);
			const size = sizeOf(body);
			if (size !== void 0 && size > maxBytes) throw tooBig();
			const id = crypto.randomUUID();
			const runId = uploadRunId(threadId);
			const blobKey = `artifacts/${runId}/${id}`;
			let seen = 0;
			const counted = body instanceof ReadableStream ? body.pipeThrough(new TransformStream({ transform(bytes, controller) {
				seen += bytes.byteLength;
				if (seen > maxBytes) controller.error(tooBig());
				else controller.enqueue(bytes);
			} })) : body;
			try {
				await blobs.put(blobKey, counted, { contentType: info.mimeType });
			} catch (error) {
				if (seen <= maxBytes) throw error;
				await blobs.delete(blobKey);
				throw tooBig();
			}
			const record = {
				artifactId: id,
				runId,
				threadId,
				blobKey,
				name: info.name,
				mimeType: info.mimeType,
				size: size ?? seen,
				createdAt: Date.now()
			};
			await artifacts.save(record);
			return toMediaRecord(record, kind);
		},
		/** The record of `id`, or `null` when it is missing or another thread's. */
		get,
		/** The bytes of `id`, or one `range` of them. */
		load,
		/** A data URL for a file up to 1 MB. `undefined` above that. */
		async dataUrl(id) {
			const record = await get(id);
			if (!record || record.size > DATA_URL_MAX_BYTES) return void 0;
			return `data:${record.mimeType};base64,${toBase64(await load(id))}`;
		}
	};
}
/**
* Generation middleware that keeps the media an agent makes and publishes a
* record for each new file. It is `withGenerationPersistence` plus a result
* transform that runs after it.
*
* A failed save or a failed `publish` does not fail the generation: the agent
* gets its result, and `onError` gets the error, so the caller can warn.
*
* @example
* const middleware = mediaCapture({
*   persistence,
*   threadId,
*   publish: (record) => console.log(`saved ${record.name}`),
*   onError: (error) => console.warn('media not kept', error),
* })
* await generateImage({ adapter, prompt, threadId, middleware })
*/
function mediaCapture({ persistence, threadId, options = {}, publish, onError }) {
	const store = createMediaStore({
		persistence,
		threadId,
		options
	});
	const persist = withGenerationPersistence(persistence, {
		threadId,
		maxArtifactBytes: options.maxBytes ?? DEFAULT_MAX_BYTES
	});
	return [{
		...persist,
		async onStart(ctx) {
			const from = ctx.resultTransforms.length;
			await persist.onStart?.(ctx);
			const added = ctx.resultTransforms.splice(from);
			for (const transform of added) ctx.resultTransforms.push(async (result, transformCtx) => {
				try {
					return await transform(result, transformCtx);
				} catch (error) {
					onError?.(error);
					return;
				}
			});
		}
	}, {
		name: "harness:media-capture",
		onStart(ctx) {
			const runId = ctx.runId ?? ctx.requestId;
			ctx.resultTransforms.push(async (result) => {
				const refs = (result.artifacts ?? []).filter((ref) => ref.role === "output" && ref.runId === runId);
				for (const ref of refs) try {
					const record = await store.get(ref.artifactId);
					if (record) await publish(record);
				} catch (error) {
					onError?.(error);
				}
			});
		}
	}];
}
function textPart(content) {
	return {
		type: "text",
		content
	};
}
function cannotRead(model, kind) {
	return `${model} cannot read ${kind} files. ${kind === "audio" ? "Add media.transcribe" : `Use a model that reads ${kind} files`}, or send a text summary.`;
}
function hasMediaRef(message) {
	return Array.isArray(message.content) && message.content.some((part) => mediaIdOf(part) !== void 0);
}
/**
* Chat middleware that gives the model the bytes of `harness-media:` parts.
* It changes only what the adapter gets (`providerMessages`), so the saved
* transcript keeps the small `harness-media:` URLs.
*
* - A part of a kind in `accepted` becomes a base64 data source. With
*   `accepted` undefined, every kind is sent.
* - Audio not in `accepted` becomes a transcript when `transcribe` is set.
* - Any other kind not in `accepted` stops the run with a clear error before
*   the model call.
* - A part whose file is gone becomes a short text note.
*
* List it after `withPersistence` and after any middleware that returns
* `messages`: a later `messages` result resets the provider messages.
*
* @example
* chat({
*   adapter,
*   messages,
*   middleware: [withPersistence(persistence), mediaMiddleware({ store })],
* })
*/
function mediaMiddleware({ store, accepted, transcribe }) {
	const runs = /* @__PURE__ */ new WeakMap();
	async function resolve(ctx, part, id) {
		const record = await store.get(id);
		if (!record) return textPart(`[${part.type} not found: ${id}]`);
		const isAccepted = accepted === void 0 || accepted.includes(record.kind);
		const transcriber = isAccepted || record.kind !== "audio" ? void 0 : transcribe;
		if (!isAccepted && transcriber === void 0) throw new Error(cannotRead(ctx.model, record.kind));
		const bytes = await store.load(id).catch((error) => {
			if (error instanceof MediaError && error.status === 404) return void 0;
			throw error;
		});
		if (!bytes) return textPart(`[${record.kind} not found: ${record.name}]`);
		if (transcriber === void 0) return {
			...part,
			source: {
				type: "data",
				value: toBase64(bytes),
				mimeType: record.mimeType
			}
		};
		const transcript = await generateTranscription({
			adapter: transcriber,
			audio: new Blob([bytes], { type: record.mimeType }),
			...ctx.signal ? { abortSignal: ctx.signal } : {}
		});
		return textPart(`[audio transcript: ${record.name}] ${transcript.text}`);
	}
	async function resolveMessage(ctx, cache, message) {
		const { content } = message;
		if (!Array.isArray(content) || !hasMediaRef(message)) return message;
		const parts = [];
		for (const part of content) {
			const id = part.type === "text" ? void 0 : mediaIdOf(part);
			if (part.type === "text" || id === void 0) {
				parts.push(part);
				continue;
			}
			let pending = cache.get(id);
			if (!pending) {
				pending = resolve(ctx, part, id);
				cache.set(id, pending);
			}
			parts.push(await pending);
		}
		return {
			...message,
			content: parts
		};
	}
	return {
		name: "harness:media",
		async onConfig(ctx, config) {
			const messages = config.providerMessages ?? config.messages;
			if (!messages.some(hasMediaRef)) return void 0;
			let cache = runs.get(ctx);
			if (!cache) {
				cache = /* @__PURE__ */ new Map();
				runs.set(ctx, cache);
			}
			const providerMessages = [];
			for (const message of messages) providerMessages.push(await resolveMessage(ctx, cache, message));
			return { providerMessages };
		}
	};
}
//#endregion
export { MediaError, createMediaStore, mediaCapture, mediaMiddleware, toBase64 };

//# sourceMappingURL=media.js.map