import { createGeminiClient, getGeminiApiKeyFromEnv } from "../utils/client.js";
import "../utils/index.js";
import { FileState } from "@google/genai";
//#region src/files/index.ts
/**
* Upload a file via the Gemini Files API and wait until it is `ACTIVE`.
*
* Large media (notably video) must be uploaded rather than inlined as base64;
* the Files API processes uploads asynchronously. This wraps the upload +
* poll-until-ready loop and returns a reference you can drop into message
* content as a `url` source (see {@link geminiVideoPart}).
*
* @throws if the upload has no URI, or processing fails or times out.
*/
async function uploadGeminiFile(file, options = {}) {
	const { apiKey = getGeminiApiKeyFromEnv(), mimeType, pollIntervalMs = 5e3, timeoutMs = 3e5 } = options;
	const client = createGeminiClient({ apiKey });
	let uploaded = await client.files.upload({
		file,
		...mimeType && { config: { mimeType } }
	});
	const fileName = uploaded.name;
	if (!fileName) throw new Error("Gemini file upload did not return a file name.");
	const deadline = Date.now() + timeoutMs;
	while (uploaded.state === FileState.PROCESSING) {
		if (Date.now() > deadline) throw new Error(`Gemini file processing timed out after ${timeoutMs}ms (${fileName}).`);
		await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
		uploaded = await client.files.get({ name: fileName });
	}
	if (uploaded.state === FileState.FAILED) throw new Error(`Gemini file processing failed: ${uploaded.error?.message ?? String(uploaded.state)}`);
	if (!uploaded.uri) throw new Error("Gemini file upload did not return a URI.");
	return {
		name: fileName,
		uri: uploaded.uri,
		mimeType: uploaded.mimeType ?? mimeType ?? "application/octet-stream"
	};
}
/**
* Build a TanStack AI video content part from an uploaded Gemini file.
*
* Pass `metadata` to control understanding — e.g.
* `{ processing: 'agentic' }` to route through the agentic Interactions path,
* or `{ fps, startOffset, endOffset }` for single-pass sampling controls.
*/
function geminiVideoPart(file, metadata) {
	return {
		type: "video",
		source: {
			type: "url",
			value: file.uri,
			mimeType: file.mimeType
		},
		...metadata && { metadata }
	};
}
//#endregion
export { geminiVideoPart, uploadGeminiFile };

//# sourceMappingURL=index.js.map