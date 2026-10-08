import { getGrokApiKeyFromEnv, withGrokDefaults } from "../utils/client.js";
import { OpenAI, toFile } from "openai";
import { BaseFilesAdapter, normalizeFileUploadInput } from "@tanstack/ai/adapters";
//#region src/adapters/files.ts
/**
* Bounds xAI accepts for a public URL's `expires_after`, in seconds:
* one hour to thirty days.
*/
var MIN_EXPIRES_AFTER_SECONDS = 3600;
var MAX_EXPIRES_AFTER_SECONDS = 2592e3;
/**
* Grok (xAI) Files adapter.
*
* Uploads to the xAI Files API, then mints a **public URL** for the stored
* object and uses that URL as the handle's wire reference. xAI's own
* `file_id` form is only accepted on `input_file` (documents) and only by
* agentic-capable models, while its image path takes a URL. A public URL
* works for both, so one handle covers every modality and every chat model.
*
* Pair with `grokText()`: reference the returned handle via
* `fileSourceFromHandle(handle)`.
*
* Limits xAI enforces: 50 MiB per file, and PNG, JPEG, MP4, or PDF only.
*/
var GrokFilesAdapter = class extends BaseFilesAdapter {
	name = "grok";
	client;
	expiresAfter;
	constructor(config) {
		super();
		const { expiresAfter, ...clientOptions } = config;
		if (expiresAfter !== void 0) {
			if (!Number.isInteger(expiresAfter) || expiresAfter < MIN_EXPIRES_AFTER_SECONDS || expiresAfter > MAX_EXPIRES_AFTER_SECONDS) throw new Error(`grok: expiresAfter must be a whole number of seconds between ${MIN_EXPIRES_AFTER_SECONDS} and ${MAX_EXPIRES_AFTER_SECONDS} (received ${expiresAfter}).`);
		}
		this.client = new OpenAI(withGrokDefaults(clientOptions));
		this.expiresAfter = expiresAfter;
	}
	async upload(input) {
		const { blob, mimeType, filename } = normalizeFileUploadInput(input);
		const file = await toFile(blob, filename, { ...mimeType ? { type: mimeType } : {} });
		const uploaded = await this.client.files.create({
			file,
			purpose: "assistants"
		});
		const publicUrl = await this.client.post(`/files/${uploaded.id}/public-url`, { body: this.expiresAfter !== void 0 ? { expires_after: this.expiresAfter } : {} });
		if (!publicUrl.public_url) throw new Error(`grok: files/${uploaded.id}/public-url returned no public_url, so the handle has no wire reference.`);
		return {
			id: uploaded.id,
			provider: "grok",
			uri: publicUrl.public_url,
			...mimeType ? { mimeType } : {},
			...uploaded.bytes !== void 0 ? { sizeBytes: uploaded.bytes } : {},
			...uploaded.filename ? { filename: uploaded.filename } : {},
			...publicUrl.expires_at ? { expiresAt: publicUrl.expires_at * 1e3 } : {}
		};
	}
	/**
	* Fetch a stored file and its public URL.
	*
	* This mints the public URL (a POST), because `retrieve` does not report
	* it. After {@link revokePublicUrl}, a `get()` gives the file a public URL
	* again. Do not call it for a file whose URL you revoked.
	*/
	async get(id) {
		const file = await this.client.files.retrieve(id);
		const publicUrl = await this.client.post(`/files/${id}/public-url`, { body: {} });
		return {
			id: file.id,
			provider: "grok",
			...publicUrl.public_url ? { uri: publicUrl.public_url } : {},
			...file.bytes !== void 0 ? { sizeBytes: file.bytes } : {},
			...file.filename ? { filename: file.filename } : {},
			...publicUrl.expires_at ? { expiresAt: publicUrl.expires_at * 1e3 } : {}
		};
	}
	async delete(id) {
		await this.client.files.delete(id);
	}
	/**
	* Revoke a file's public URL without deleting the file. The handle's `uri`
	* stops resolving; the stored object and its `id` survive. A later
	* {@link get} mints a public URL again.
	*/
	async revokePublicUrl(id) {
		await this.client.post(`/files/${id}/public-url/revoke`, { body: {} });
	}
};
/**
* Create a Grok Files adapter with an explicit API key.
*/
function createGrokFiles(apiKey, config) {
	return new GrokFilesAdapter({
		apiKey,
		...config
	});
}
/**
* Create a Grok Files adapter, reading the API key from `XAI_API_KEY`.
*/
function grokFiles(config) {
	return createGrokFiles(getGrokApiKeyFromEnv(), config);
}
//#endregion
export { GrokFilesAdapter, createGrokFiles, grokFiles };

//# sourceMappingURL=files.js.map