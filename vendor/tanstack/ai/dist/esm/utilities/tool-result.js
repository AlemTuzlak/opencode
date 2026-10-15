//#region src/utilities/tool-result.ts
var CONTENT_PART_TYPES = /* @__PURE__ */ new Set([
	"text",
	"image",
	"audio",
	"video",
	"document"
]);
function isToolResultOutcome(value) {
	return value === "cancelled" || value === "denied";
}
/**
* Structural check for a single `ContentPart`. A text part must carry a string
* `content`. Every other part carries a source with a string `value`; a file
* source's `value` is a non-empty opaque handle, and its optional `provider`
* is a string.
*/
function isContentPart(value) {
	if (typeof value !== "object" || value === null) return false;
	const part = value;
	if (typeof part.type !== "string" || !CONTENT_PART_TYPES.has(part.type)) return false;
	if (part.type === "text") return typeof part.content === "string";
	const source = part.source;
	if (typeof source !== "object" || source === null) return false;
	const src = source;
	if (typeof src.value !== "string") return false;
	if (src.type === "file") return src.value.length > 0 && (src.provider === void 0 || typeof src.provider === "string");
	if (src.type === "data") return typeof src.mimeType === "string";
	return src.type === "url";
}
/**
* True iff `value` is a NON-EMPTY array whose every element is a valid
* `ContentPart`. Empty arrays and mixed arrays return false so they continue
* to be treated as ordinary (stringified) data — this keeps the auto-detection
* footgun narrow.
*/
function isContentPartArray(value) {
	return Array.isArray(value) && value.length > 0 && value.every(isContentPart);
}
/**
* Error text for a failed tool result: `output.error` when it is a string,
* else the output itself when it is a string, else a generic message.
* `StreamProcessor` and `chat()` history share it, so a reload shows the
* same text as the live stream.
*/
function toolResultErrorText(output) {
	if (output && typeof output === "object" && "error" in output && typeof output.error === "string") return output.error;
	return typeof output === "string" ? output : "Tool execution failed";
}
/** Parse tool result content as JSON. Plain text stays a string. */
function parseToolOutput(content) {
	try {
		return JSON.parse(content);
	} catch {
		return content;
	}
}
/**
* Normalize a tool's return value for transport:
* - string            → unchanged
* - ContentPart array → unchanged (multimodal, passed through to the adapter)
* - anything else     → `JSON.stringify`
*/
function normalizeToolResult(result) {
	if (typeof result === "string") return result;
	if (isContentPartArray(result)) return result;
	return JSON.stringify(result);
}
//#endregion
export { isContentPart, isContentPartArray, isToolResultOutcome, normalizeToolResult, parseToolOutput, toolResultErrorText };

//# sourceMappingURL=tool-result.js.map