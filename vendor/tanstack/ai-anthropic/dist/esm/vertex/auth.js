//#region src/vertex/auth.ts
var AnthropicVertexAuthError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "AnthropicVertexAuthError";
	}
};
function nonEmpty(value) {
	if (value === void 0 || value.length === 0) return;
	return value;
}
function readEnv(name) {
	if (typeof process === "undefined" || process.env === void 0) return;
	return nonEmpty(process.env[name]);
}
function resolveAnthropicVertexOptions(config = {}) {
	const { project, location, reasoning: _reasoning, ...rest } = config;
	const projectId = nonEmpty(project) ?? readEnv("GOOGLE_CLOUD_PROJECT") ?? readEnv("GOOGLE_VERTEX_PROJECT") ?? readEnv("ANTHROPIC_VERTEX_PROJECT_ID");
	const region = nonEmpty(location) ?? readEnv("GOOGLE_CLOUD_LOCATION") ?? readEnv("GOOGLE_VERTEX_LOCATION") ?? readEnv("CLOUD_ML_REGION");
	if (region === void 0) throw new AnthropicVertexAuthError("Anthropic Vertex needs a location. Pass location on the factory, or set GOOGLE_CLOUD_LOCATION, GOOGLE_VERTEX_LOCATION, or CLOUD_ML_REGION.");
	return {
		...rest,
		projectId: projectId ?? null,
		region
	};
}
//#endregion
export { AnthropicVertexAuthError, resolveAnthropicVertexOptions };

//# sourceMappingURL=auth.js.map