import { Ollama } from "ollama";
import { generateId } from "@tanstack/ai-utils";
//#region src/utils/client.ts
/**
* Creates an Ollama client instance. A `fetch` replaces the client's fetch.
*/
function createOllamaClient(config = {}, fetch) {
	return new Ollama({
		host: config.baseURL || config.host || "http://localhost:11434",
		headers: config.defaultHeaders ?? config.headers,
		...fetch && { fetch }
	});
}
/**
* Gets Ollama host from environment variables
* Falls back to default localhost
*/
function getOllamaHostFromEnv() {
	return (typeof globalThis !== "undefined" && globalThis.window ? globalThis.window.env : typeof process !== "undefined" ? process.env : void 0)?.["OLLAMA_HOST"] || "http://localhost:11434";
}
/**
* Generates a unique ID with a prefix
*/
function generateId$1(prefix = "msg") {
	return generateId(prefix);
}
//#endregion
export { createOllamaClient, generateId$1 as generateId, getOllamaHostFromEnv };

//# sourceMappingURL=client.js.map