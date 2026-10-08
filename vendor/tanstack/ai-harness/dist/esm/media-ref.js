//#region src/media-ref.ts
/** The URL scheme of a content part that points to a harness media file. */
var MEDIA_URL_PREFIX = "harness-media:";
function isRecord(value) {
	return typeof value === "object" && value !== null;
}
function isMediaKind(value) {
	return value === "image" || value === "audio" || value === "video" || value === "document";
}
function isOptionalString(value) {
	return value === void 0 || typeof value === "string";
}
/**
* True for a value with the shape of a `MediaRecord`, for example the answer
* of an upload or the value of a `harness.media` event.
*
* @example
* const value: unknown = await response.json()
* if (isMediaRecord(value)) console.log(value.name)
*/
function isMediaRecord(value) {
	if (!isRecord(value)) return false;
	return isOptionalString(value.runId) && isOptionalString(value.subagentRunId) && typeof value.id === "string" && typeof value.threadId === "string" && isMediaKind(value.kind) && typeof value.mimeType === "string" && typeof value.name === "string" && typeof value.size === "number" && (value.source === "user" || value.source === "generated") && typeof value.createdAt === "number";
}
/**
* The media kind of a MIME type, or `undefined` when the harness does not
* store that type. `image/*`, `audio/*`, and `video/*` map to their kind.
* `application/pdf` and `text/*` are documents.
*
* @example
* kindOf('image/png') // 'image'
* kindOf('application/zip') // undefined
*/
function kindOf(mimeType) {
	const [type = ""] = mimeType.toLowerCase().split(";");
	const [top = "", sub] = type.trim().split("/");
	if (!sub) return void 0;
	switch (top) {
		case "image":
		case "audio":
		case "video": return top;
		case "text": return "document";
		case "application": return sub === "pdf" ? "document" : void 0;
		default: return;
	}
}
var mimeTypes = /* @__PURE__ */ new Map([
	["png", "image/png"],
	["jpg", "image/jpeg"],
	["jpeg", "image/jpeg"],
	["gif", "image/gif"],
	["webp", "image/webp"],
	["mp3", "audio/mpeg"],
	["wav", "audio/wav"],
	["ogg", "audio/ogg"],
	["m4a", "audio/mp4"],
	["flac", "audio/flac"],
	["mp4", "video/mp4"],
	["webm", "video/webm"],
	["mov", "video/quicktime"],
	["pdf", "application/pdf"],
	["txt", "text/plain"],
	["md", "text/markdown"],
	["csv", "text/csv"],
	["html", "text/html"]
]);
/**
* The MIME type of a file name, a path, or a URL path, by its extension.
* Returns `undefined` for no extension or an extension it does not know.
* It knows the common image, audio, video, PDF, and text types.
*
* @example
* mimeTypeOf('cat.PNG') // 'image/png'
* mimeTypeOf('notes') // undefined
*/
function mimeTypeOf(fileName) {
	const extension = /\.([^./\\]+)$/.exec(fileName)?.[1];
	return extension === void 0 ? void 0 : mimeTypes.get(extension.toLowerCase());
}
/**
* The content part that sends a stored media file to a turn. Its source is
* the URL `harness-media:<id>`. The harness swaps it for the bytes only when
* it calls the model, so the transcript stays small.
*
* @example
* session.prompt([{ type: 'text', content: 'What is this?' }, mediaPart(record)])
*/
function mediaPart(record) {
	return {
		type: record.kind,
		source: {
			type: "url",
			value: `${MEDIA_URL_PREFIX}${record.id}`,
			mimeType: record.mimeType
		}
	};
}
/**
* The media id of a part made by `mediaPart`, or `undefined` for any other
* value (text, a data source, a normal URL).
*
* @example
* const ids = parts.map(mediaIdOf).filter((id) => id !== undefined)
*/
function mediaIdOf(part) {
	if (!isRecord(part) || !isMediaKind(part.type) || !isRecord(part.source)) return;
	const { type, value } = part.source;
	if (type !== "url" || typeof value !== "string") return void 0;
	if (!value.startsWith("harness-media:")) return void 0;
	return value.slice(14) || void 0;
}
/**
* The media records saved on a message in `metadata.harness.media`: the
* media a turn made, kept on its last assistant message. Entries with a bad
* shape are skipped. Returns `[]` when there are none.
*
* @example
* for (const media of mediaOfMessage(message)) console.log(media.name)
*/
function mediaOfMessage(message) {
	const harness = message.metadata?.harness;
	const media = isRecord(harness) ? harness.media : void 0;
	return Array.isArray(media) ? media.filter(isMediaRecord) : [];
}
//#endregion
export { MEDIA_URL_PREFIX, isMediaRecord, kindOf, mediaIdOf, mediaOfMessage, mediaPart, mimeTypeOf };

//# sourceMappingURL=media-ref.js.map