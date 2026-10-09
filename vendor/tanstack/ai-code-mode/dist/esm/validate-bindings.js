//#region src/validate-bindings.ts
/**
* Single words that on their own signal "this is a credential".
* Matched after splitting a parameter name into camelCase/snake/kebab words.
* So `accessToken` → `['access', 'token']` → matches `token`,
* but `tokenizer` → `['tokenizer']` → does NOT match `token`.
*/
var DANGEROUS_WORDS = /* @__PURE__ */ new Set([
	"password",
	"passwd",
	"pwd",
	"passcode",
	"secret",
	"token",
	"credential",
	"credentials",
	"authorization",
	"jwt",
	"bearer"
]);
/**
* Compound patterns matched as substrings of the normalized (lowercased,
* separator-stripped) parameter name. Catches forms like `openai_api_key`,
* `x-api-key`, and `webhookSecret`.
*/
var COMPOUND_PATTERNS = [
	"apikey",
	"accesskey",
	"authkey",
	"privatekey",
	"clientsecret",
	"webhooksecret"
];
function splitIntoWords(name) {
	return name.replace(/[_\-\s]+/g, " ").replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase().split(/\s+/).filter(Boolean);
}
function looksLikeSecret(name) {
	if (splitIntoWords(name).some((w) => DANGEROUS_WORDS.has(w))) return true;
	const normalized = name.replace(/[_\-\s]/g, "").toLowerCase();
	return COMPOUND_PATTERNS.some((p) => normalized.includes(p));
}
function resolveRef(ref, root) {
	const match = ref.match(/^#\/(\$defs|definitions)\/(.+)$/);
	if (!match) return void 0;
	const bucket = match[1];
	const key = match[2];
	return key === void 0 ? void 0 : root[bucket]?.[key];
}
function findSecretParams(schema, root, seen, path, found) {
	if (!schema || typeof schema !== "object" || seen.has(schema)) return;
	seen.add(schema);
	if (schema.properties && typeof schema.properties === "object") for (const [paramName, sub] of Object.entries(schema.properties)) {
		if (looksLikeSecret(paramName)) found.push({
			path: [...path, paramName],
			name: paramName
		});
		findSecretParams(sub, root, seen, [...path, paramName], found);
	}
	if (Array.isArray(schema.items)) schema.items.forEach((s, i) => findSecretParams(s, root, seen, [...path, `[${i}]`], found));
	else if (schema.items && typeof schema.items === "object") findSecretParams(schema.items, root, seen, [...path, "[]"], found);
	if (schema.additionalProperties && typeof schema.additionalProperties === "object") findSecretParams(schema.additionalProperties, root, seen, path, found);
	for (const key of [
		"anyOf",
		"oneOf",
		"allOf"
	]) {
		const arr = schema[key];
		if (Array.isArray(arr)) arr.forEach((s) => findSecretParams(s, root, seen, path, found));
	}
	if (typeof schema.$ref === "string") {
		const target = resolveRef(schema.$ref, root);
		if (target) findSecretParams(target, root, seen, path, found);
	}
}
function buildMessage(toolName, paramPath) {
	return `[TanStack AI Code Mode] Tool "${toolName}" has parameter "${paramPath.join(".")}" that looks like a secret. Code Mode executes LLM-generated code — any value passed through this parameter is accessible to generated code and could be exfiltrated. Keep secrets in your server-side tool implementation instead of passing them as tool parameters.`;
}
/**
* Scan tool input schemas for parameter names that look like secrets.
* Emits a warning (or invokes the configured handler) for each match.
*
* Recurses into nested object properties, array items, union branches
* (anyOf/oneOf/allOf), additionalProperties, and `$ref` targets that
* resolve within the same schema's `$defs`/`definitions`.
*
* Best-effort heuristic, not a security boundary.
*/
function warnIfBindingsExposeSecrets(tools, options = {}) {
	const { handler = "warn", dedupCache } = options;
	if (handler === "ignore") return;
	for (const tool of tools) {
		const schema = tool.inputSchema;
		if (!schema) continue;
		const found = [];
		findSecretParams(schema, schema, /* @__PURE__ */ new Set(), [], found);
		for (const entry of found) {
			const dedupKey = `${tool.name}::${entry.path.join(".")}`;
			if (dedupCache) {
				if (dedupCache.has(dedupKey)) continue;
				dedupCache.add(dedupKey);
			}
			const info = {
				toolName: tool.name,
				paramName: entry.name,
				paramPath: entry.path
			};
			if (typeof handler === "function") handler(info);
			else if (handler === "throw") throw new Error(buildMessage(tool.name, entry.path));
			else console.warn(buildMessage(tool.name, entry.path));
		}
	}
}
//#endregion
export { warnIfBindingsExposeSecrets };

//# sourceMappingURL=validate-bindings.js.map