import { getOpenAIApiKeyFromEnv } from "../utils/client.js";
import { OpenAI, toFile } from "openai";
import { BaseFilesAdapter, normalizeFileUploadInput } from "@tanstack/ai/adapters";
//#region src/adapters/files.ts
/**
* OpenAI Files adapter — uploads media to the OpenAI Files API and references
* it by `file_id`. Pair with `openaiText()` (Responses API): reference the
* returned handle in a message via `fileSourceFromHandle(handle)`.
*/
var OpenAIFilesAdapter = class extends BaseFilesAdapter {
	name = "openai";
	client;
	purpose;
	constructor(config) {
		super();
		const { purpose, ...clientOptions } = config;
		this.client = new OpenAI(clientOptions);
		this.purpose = purpose ?? "user_data";
	}
	async upload(input) {
		const { blob, mimeType, filename } = normalizeFileUploadInput(input);
		const file = await toFile(blob, filename, { ...mimeType ? { type: mimeType } : {} });
		return toFileHandle(await this.client.files.create({
			file,
			purpose: this.purpose
		}));
	}
	async get(id) {
		return toFileHandle(await this.client.files.retrieve(id));
	}
	async delete(id) {
		await this.client.files.delete(id);
	}
};
function toFileHandle(file) {
	return {
		id: file.id,
		provider: "openai",
		sizeBytes: file.bytes,
		filename: file.filename,
		...file.expires_at ? { expiresAt: file.expires_at * 1e3 } : {}
	};
}
/**
* Create an OpenAI Files adapter with an explicit API key.
*/
function createOpenaiFiles(apiKey, config) {
	return new OpenAIFilesAdapter({
		...config,
		apiKey
	});
}
/**
* Create an OpenAI Files adapter, reading the API key from `OPENAI_API_KEY`.
*/
function openaiFiles(config) {
	return createOpenaiFiles(getOpenAIApiKeyFromEnv(), config);
}
//#endregion
export { OpenAIFilesAdapter, createOpenaiFiles, openaiFiles };

//# sourceMappingURL=files.js.map