import { createAnthropicClient } from "../utils/client.js";
import { BaseFilesAdapter, normalizeFileUploadInput } from "@tanstack/ai/adapters";
import { toFile } from "@anthropic-ai/sdk";
//#region src/adapters/files.ts
/** Beta header required for the Anthropic Files API. */
var FILES_API_BETA = "files-api-2025-04-14";
/**
* Anthropic Files adapter — uploads media to the Anthropic Files API (beta) and
* references it by `file_id`. Pair with `anthropicText()`: reference the
* returned handle in an image/document message via `fileSourceFromHandle`.
*/
var AnthropicFilesAdapter = class extends BaseFilesAdapter {
	name = "anthropic";
	client;
	constructor(config) {
		super();
		this.client = createAnthropicClient(config);
	}
	async upload(input) {
		const { blob, mimeType, filename } = normalizeFileUploadInput(input);
		const file = await toFile(blob, filename, { ...mimeType ? { type: mimeType } : {} });
		return toFileHandle(await this.client.beta.files.upload({
			file,
			betas: [FILES_API_BETA]
		}));
	}
	async get(id) {
		return toFileHandle(await this.client.beta.files.retrieveMetadata(id, { betas: [FILES_API_BETA] }));
	}
	async delete(id) {
		await this.client.beta.files.delete(id, { betas: [FILES_API_BETA] });
	}
};
function toFileHandle(file) {
	return {
		id: file.id,
		provider: "anthropic",
		mimeType: file.mime_type,
		sizeBytes: file.size_bytes,
		filename: file.filename
	};
}
/**
* Create an Anthropic Files adapter with an explicit API key.
*/
function createAnthropicFiles(apiKey, config) {
	return new AnthropicFilesAdapter({
		...config,
		apiKey
	});
}
/**
* Create an Anthropic Files adapter, reading the API key from `ANTHROPIC_API_KEY`.
*/
function anthropicFiles(config) {
	return new AnthropicFilesAdapter(config ?? {});
}
//#endregion
export { AnthropicFilesAdapter, anthropicFiles, createAnthropicFiles };

//# sourceMappingURL=files.js.map