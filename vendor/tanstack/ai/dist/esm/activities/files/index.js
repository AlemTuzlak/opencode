//#region src/activities/files/index.ts
/** The adapter kind this activity handles */
var kind = "files";
/**
* Upload a file to a provider's Files API and return its handle. The handle
* carries the provider name as a literal type, so passing it to another
* provider's lifecycle call is a compile error.
*
* @example
* ```ts
* const files = openaiFiles()
* const handle = await uploadFile({ adapter: files, input: { data, mimeType: 'image/png' } })
* ```
*/
async function uploadFile(options) {
	return options.adapter.upload(options.input);
}
/**
* Resolve a lifecycle id from either a raw id string or a {@link FileHandle}
* (whose `id` — not its `uri`/wire value — is the lifecycle currency).
*/
function toLifecycleId(id) {
	return typeof id === "string" ? id : id.id;
}
/**
* Fetch metadata for a previously uploaded file. Accepts the handle itself
* (preferred — the provider-literal type rejects a foreign provider's handle
* at compile time) or its raw lifecycle id.
*
* @throws if the provider's files adapter has no `get` (e.g. fal storage).
*/
async function getFile(options) {
	const { adapter } = options;
	if (!adapter.get) throw new Error(`${adapter.name}: files adapter does not support get() — this provider has no file-retrieval API.`);
	return adapter.get(toLifecycleId(options.id));
}
/**
* Delete a previously uploaded file. Accepts the handle itself (preferred —
* the provider-literal type rejects a foreign provider's handle at compile
* time) or its raw lifecycle id.
*
* @throws if the provider's files adapter has no `delete` (e.g. fal storage).
*/
async function deleteFile(options) {
	const { adapter } = options;
	if (!adapter.delete) throw new Error(`${adapter.name}: files adapter does not support delete() — this provider has no file-deletion API.`);
	return adapter.delete(toLifecycleId(options.id));
}
/**
* Build a `{ type: 'file' }` content source from an uploaded
* {@link FileHandle}, for use in a chat message (image/audio/document part
* `source`).
*
* The source's `value` is the handle's wire form: the handle URL when the
* provider exposes one (Gemini, fal, Grok), otherwise the opaque id (OpenAI,
* Anthropic). `provider` records the issuer, so an adapter for a different
* provider rejects the source rather than sending a handle it cannot resolve.
*
* @example
* ```ts
* const handle = await uploadFile({ adapter: openaiFiles(), input })
* messages.push({ role: 'user', content: [
*   { type: 'image', source: fileSourceFromHandle(handle) },
* ] })
* ```
*/
function fileSourceFromHandle(handle) {
	return {
		type: "file",
		value: handle.uri ?? handle.id,
		provider: handle.provider,
		...handle.mimeType ? { mimeType: handle.mimeType } : {}
	};
}
//#endregion
export { deleteFile, fileSourceFromHandle, getFile, kind, uploadFile };

//# sourceMappingURL=index.js.map