//#region src/utilities/content-source.ts
/**
* Narrow a {@link ContentPartSource} to the provider-file-reference arm.
*
* Issuer adapters use this to route a file source to their native wire field;
* everyone else is protected by the core preflight (see
* {@link assertMessagesFileSourceSupport}) plus a defensive throw at their own
* mapping site.
*/
function isFileSource(source) {
	return source.type === "file";
}
/**
* Resolve the handle `providerName` should send for a file source.
*
* A file source carries one opaque handle (`value`) and, optionally, the
* provider that issued it. An adapter always knows which provider it talks
* to, so a source that names no provider is taken as-is.
*
* @throws when the source names a different issuing provider. A handle only
* resolves at the provider that minted it.
*/
function fileReferenceFor(source, providerName) {
	if (source.provider !== void 0 && source.provider !== providerName) throw new Error(`${providerName}: file source was issued by ${source.provider}. A provider file handle only works with the provider that issued it. Upload the file with ${providerName}Files(), or pass a data or url source instead.`);
	return source.value;
}
/**
* Build the standard error a non-issuer adapter throws when it encounters a
* `{ type: 'file' }` source it can't consume — either because the provider has
* no file-reference input surface, or because the endpoint requires raw bytes
* (image edits, Veo) rather than a reference.
*
* @param detail Optional context appended to the message (e.g. a modality or
* endpoint name, or a pointer to the adapter that does support references).
* When provided it replaces the generic remediation tail, so a site-specific
* hint ("pass inline bytes") is never contradicted by generic advice.
*/
function unsupportedFileSourceError(providerName, detail) {
	return /* @__PURE__ */ new Error(`${providerName} does not support provider file-handle sources ({ type: 'file' })` + (detail ? ` ${detail}.` : ". Pass a data or url source, or upload via the provider's files adapter where supported."));
}
/** True when a content-part-like value carries a `{ type: 'file' }` source. */
function partHasFileSource(part) {
	if (typeof part !== "object" || part === null) return false;
	const source = part.source;
	return typeof source === "object" && source !== null && source.type === "file";
}
/**
* True when `value` is a content part with a file source, or an array
* (possibly nested — fused embedding items) that contains one.
*/
function inputHasFileSource(value) {
	if (Array.isArray(value)) return value.some(inputHasFileSource);
	return partHasFileSource(value);
}
/**
* Fail-closed preflight for media prompts and embedding inputs
* (`generateImage` / `generateVideo` / `embed`): throws when the input
* carries a `{ type: 'file' }` source and the adapter hasn't declared
* `supportsFileSources`. Runs in the activity dispatcher — the same layer
* that validates modality — so an adapter that predates the file arm can
* never receive one. Walks a single part, an array of parts, and nested
* arrays (fused embedding items).
*/
function assertPromptFileSourceSupport(adapter, prompt) {
	if (adapter.supportsFileSources === true) return;
	if (inputHasFileSource(prompt)) throw unsupportedFileSourceError(adapter.name);
}
/**
* Fail-closed preflight for chat messages: throws when any message content
* part carries a `{ type: 'file' }` source and the adapter hasn't declared
* `supportsFileSources`. See {@link assertPromptFileSourceSupport}.
*/
function assertMessagesFileSourceSupport(adapter, messages) {
	if (adapter.supportsFileSources === true) return;
	for (const message of messages) {
		if (typeof message !== "object" || message === null) continue;
		const content = message.content;
		if (!Array.isArray(content)) continue;
		for (const part of content) if (partHasFileSource(part)) throw unsupportedFileSourceError(adapter.name);
	}
}
//#endregion
export { assertMessagesFileSourceSupport, assertPromptFileSourceSupport, fileReferenceFor, isFileSource, unsupportedFileSourceError };

//# sourceMappingURL=content-source.js.map