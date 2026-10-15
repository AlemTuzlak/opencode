import { VertexAuthError } from "./errors.js";
//#region src/auth.ts
function nonEmpty(value) {
	if (value === void 0 || value.length === 0) return;
	return value;
}
function readEnv(name) {
	if (typeof process === "undefined" || process.env === void 0) return;
	return nonEmpty(process.env[name]);
}
/**
* Resolves Vertex Gemini client options.
*
* Factory fields win. Then env. Then ADC inside `@google/genai`.
* Does not read `GEMINI_API_KEY` or `GOOGLE_API_KEY`.
*/
function resolveVertexGeminiOptions(config = {}) {
	const project = nonEmpty(config.project) ?? readEnv("GOOGLE_CLOUD_PROJECT") ?? readEnv("GOOGLE_VERTEX_PROJECT");
	const location = nonEmpty(config.location) ?? readEnv("GOOGLE_CLOUD_LOCATION") ?? readEnv("GOOGLE_VERTEX_LOCATION");
	const apiKey = nonEmpty(config.apiKey) ?? readEnv("GOOGLE_VERTEX_API_KEY");
	if (apiKey === void 0 && (project === void 0 || location === void 0)) throw new VertexAuthError("Vertex Gemini needs project and location, or an express apiKey. Pass project and location on the factory, or set GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION. For express mode, pass apiKey or set GOOGLE_VERTEX_API_KEY.");
	return {
		...config,
		vertexai: true,
		...project === void 0 ? {} : { project },
		...location === void 0 ? {} : { location },
		...apiKey === void 0 ? {} : { apiKey }
	};
}
//#endregion
export { resolveVertexGeminiOptions };

//# sourceMappingURL=auth.js.map