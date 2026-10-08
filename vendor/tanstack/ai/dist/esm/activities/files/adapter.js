import { base64ToArrayBuffer } from "@tanstack/ai-utils";
//#region src/activities/files/adapter.ts
/**
* Files Adapter
*
* Base class and interface for the `files` activity — a provider's native Files
* API (upload a media asset once, reference it later by the returned handle
* instead of re-sending base64 or a public URL each request).
*
* Providers with a native surface expose a factory (`openaiFiles()`,
* `anthropicFiles()`, `geminiFiles()`, `falFiles()`). `upload` is required;
* `get`/`delete` are optional because not every provider has a lifecycle API
* (fal's storage is upload-only).
*/
/**
* Normalize a {@link FileUploadInput} to a `Blob` (plus best-effort MIME /
* filename) so provider adapters can hand it straight to their SDK. A `Blob`
* input passes through; base64 `{ data }` is decoded to bytes. Shared so
* provider files adapters don't each re-implement the decode.
*/
function normalizeFileUploadInput(input) {
	if (input instanceof Blob) return {
		blob: input,
		mimeType: input.type || void 0
	};
	const bytes = base64ToArrayBuffer(input.data);
	return {
		blob: new Blob([bytes], { type: input.mimeType }),
		mimeType: input.mimeType,
		filename: input.filename
	};
}
/**
* Abstract base for provider files adapters. Subclasses bind `TName` to their
* provider literal, set `name`, implement `upload`, and may add `get`/`delete`
* (declared on {@link FilesAdapter}, not here, since not every provider has a
* lifecycle API).
*/
var BaseFilesAdapter = class {
	kind = "files";
};
//#endregion
export { BaseFilesAdapter, normalizeFileUploadInput };

//# sourceMappingURL=adapter.js.map