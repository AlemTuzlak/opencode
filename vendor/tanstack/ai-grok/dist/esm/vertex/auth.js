//#region src/vertex/auth.ts
var GrokVertexAuthError = class extends Error {
	constructor(message, options) {
		super(message, options);
		this.name = "GrokVertexAuthError";
	}
};
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
function toVertexGrokModelId(model) {
	if (model.startsWith("xai/")) return model;
	return `xai/${model}`;
}
function resolveGrokVertexProject(config) {
	return nonEmpty(config.project) ?? readEnv("GOOGLE_CLOUD_PROJECT") ?? readEnv("GOOGLE_VERTEX_PROJECT");
}
function resolveGrokVertexLocation(config) {
	return nonEmpty(config.location) ?? readEnv("GOOGLE_CLOUD_LOCATION") ?? readEnv("GOOGLE_VERTEX_LOCATION") ?? "global";
}
function resolveGrokVertexBaseURL(config) {
	if (config.baseURL !== void 0 && config.baseURL.length > 0) return config.baseURL.replace(/\/+$/, "");
	const project = resolveGrokVertexProject(config);
	if (project === void 0) throw new GrokVertexAuthError("Grok Vertex needs a project, or a baseURL. Pass project on the factory, or set GOOGLE_CLOUD_PROJECT or GOOGLE_VERTEX_PROJECT.");
	const location = resolveGrokVertexLocation(config);
	if (location === "global") return `https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/endpoints/openapi`;
	return `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/endpoints/openapi`;
}
async function resolveGrokVertexAccessToken(config) {
	if (config.getAccessToken !== void 0) return config.getAccessToken();
	if (config.authClient !== void 0) {
		const authorization = (await config.authClient.getRequestHeaders()).get("Authorization");
		if (authorization === null || !authorization.startsWith("Bearer ")) throw new GrokVertexAuthError("Grok Vertex authClient.getRequestHeaders() must return an Authorization Bearer token.");
		return authorization.slice(7);
	}
	try {
		const { GoogleAuth } = await import("google-auth-library");
		const token = await (await new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/cloud-platform"] }).getClient()).getAccessToken();
		if (token.token === null || token.token === void 0) throw new GrokVertexAuthError("Grok Vertex could not load a Google access token from Application Default Credentials.");
		return token.token;
	} catch (error) {
		if (error instanceof GrokVertexAuthError) throw error;
		if (isMissingGoogleAuthLibrary(error)) throw new GrokVertexAuthError("Grok Vertex needs google-auth-library, or pass authClient or getAccessToken. Install google-auth-library next to @tanstack/ai-grok.");
		throw new GrokVertexAuthError("Grok Vertex could not load a Google access token from Application Default Credentials.", { cause: error });
	}
}
//#endregion
export { GrokVertexAuthError, resolveGrokVertexAccessToken, resolveGrokVertexBaseURL, resolveGrokVertexLocation, resolveGrokVertexProject, toVertexGrokModelId };

//# sourceMappingURL=auth.js.map