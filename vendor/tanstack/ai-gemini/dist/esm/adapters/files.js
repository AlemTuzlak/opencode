import { createGeminiClient, getGeminiApiKeyFromEnv } from "../utils/client.js";
import { BaseFilesAdapter, normalizeFileUploadInput } from "@tanstack/ai/adapters";
//#region src/adapters/files.ts
/**
* Gemini Files adapter — uploads media to the Gemini Files API and references
* it by its file URI. Pair with `geminiText()` / `geminiImage()`: reference the
* returned handle via `fileSourceFromHandle(handle)`, which uses the handle URI
* (Gemini fetches it server-side as `fileData.fileUri`).
*/
var GeminiFilesAdapter = class extends BaseFilesAdapter {
	name = "gemini";
	client;
	constructor(config) {
		super();
		this.client = createGeminiClient(config);
	}
	async upload(input) {
		const { blob, mimeType } = normalizeFileUploadInput(input);
		return toFileHandle(await this.client.files.upload({
			file: blob,
			...mimeType ? { config: { mimeType } } : {}
		}));
	}
	async get(id) {
		return toFileHandle(await this.client.files.get({ name: id }));
	}
	async delete(id) {
		await this.client.files.delete({ name: id });
	}
};
function toFileHandle(file) {
	if (!file.name) throw new Error("gemini: files.upload returned a file without a name");
	const expiresAt = file.expirationTime ? Date.parse(file.expirationTime) : void 0;
	return {
		id: file.name,
		provider: "gemini",
		...file.uri ? { uri: file.uri } : {},
		...file.mimeType ? { mimeType: file.mimeType } : {},
		...file.sizeBytes ? { sizeBytes: Number(file.sizeBytes) } : {},
		...expiresAt !== void 0 && !Number.isNaN(expiresAt) ? { expiresAt } : {}
	};
}
/**
* Create a Gemini Files adapter with an explicit API key.
*/
function createGeminiFiles(apiKey, config) {
	return new GeminiFilesAdapter({
		...config,
		apiKey
	});
}
/**
* Create a Gemini Files adapter, reading the API key from `GOOGLE_API_KEY` /
* `GEMINI_API_KEY`.
*/
function geminiFiles(config) {
	return createGeminiFiles(getGeminiApiKeyFromEnv(), config);
}
//#endregion
export { GeminiFilesAdapter, createGeminiFiles, geminiFiles };

//# sourceMappingURL=files.js.map