//#region src/vertex/auth.ts
var MistralVertexAuthError = class extends Error {
	constructor(message, options) {
		super(message, options);
		this.name = "MistralVertexAuthError";
	}
};
var MISTRAL_VERTEX_LOCATIONS = ["us-central1", "europe-west4"];
function isMistralVertexLocation(location) {
	return MISTRAL_VERTEX_LOCATIONS.includes(location);
}
function isMissingGoogleAuthLibrary(error) {
	if (!(error instanceof Error) || !("code" in error)) return false;
	const code = error.code;
	if (code !== "ERR_MODULE_NOT_FOUND" && code !== "MODULE_NOT_FOUND") return false;
	return error.message.includes("google-auth-library");
}
function nonEmpty(value) {
	if (value === void 0 || value.length === 0) return;
	return value;
}
function readEnv(name) {
	if (typeof process === "undefined" || process.env === void 0) return;
	return nonEmpty(process.env[name]);
}
function resolveMistralVertexProject(config) {
	return nonEmpty(config.project) ?? readEnv("GOOGLE_CLOUD_PROJECT") ?? readEnv("GOOGLE_VERTEX_PROJECT");
}
function resolveMistralVertexLocation(config) {
	const location = nonEmpty(config.location) ?? readEnv("GOOGLE_CLOUD_LOCATION") ?? readEnv("GOOGLE_VERTEX_LOCATION");
	if (location === void 0) throw new MistralVertexAuthError("Mistral Vertex needs a location. Pass location on the factory, or set GOOGLE_CLOUD_LOCATION or GOOGLE_VERTEX_LOCATION. Use us-central1 or europe-west4.");
	if (!isMistralVertexLocation(location)) throw new MistralVertexAuthError("Mistral Vertex location must be us-central1 or europe-west4. There is no global endpoint.");
	return location;
}
function resolveMistralVertexModelUrl(model, config) {
	const project = resolveMistralVertexProject(config);
	if (project === void 0) throw new MistralVertexAuthError("Mistral Vertex needs a project. Pass project on the factory, or set GOOGLE_CLOUD_PROJECT or GOOGLE_VERTEX_PROJECT.");
	const location = resolveMistralVertexLocation(config);
	return `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/mistralai/models/${model}`;
}
async function resolveMistralVertexAccessToken(config) {
	if (config.getAccessToken !== void 0) return config.getAccessToken();
	if (config.authClient !== void 0) {
		const authorization = (await config.authClient.getRequestHeaders()).get("Authorization");
		if (authorization === null || !authorization.startsWith("Bearer ")) throw new MistralVertexAuthError("Mistral Vertex authClient.getRequestHeaders() must return an Authorization Bearer token.");
		return authorization.slice(7);
	}
	try {
		const { GoogleAuth } = await import("google-auth-library");
		const token = await (await new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] }).getClient()).getAccessToken();
		if (token.token === null || token.token === void 0) throw new MistralVertexAuthError("Mistral Vertex could not load a Google access token from Application Default Credentials.");
		return token.token;
	} catch (error) {
		if (error instanceof MistralVertexAuthError) throw error;
		if (isMissingGoogleAuthLibrary(error)) throw new MistralVertexAuthError("Mistral Vertex needs google-auth-library, or pass authClient or getAccessToken. Install google-auth-library next to @tanstack/ai-mistral.");
		throw new MistralVertexAuthError("Mistral Vertex could not load a Google access token from Application Default Credentials.", { cause: error });
	}
}
//#endregion
export { MistralVertexAuthError, resolveMistralVertexAccessToken, resolveMistralVertexLocation, resolveMistralVertexModelUrl, resolveMistralVertexProject };

//# sourceMappingURL=auth.js.map