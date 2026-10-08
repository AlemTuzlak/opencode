import { byokHeaderName, resolveProviderId } from "./providers.js";
//#region src/byok/get-key.ts
/**
* Read `provider.env` in order and return the first value that is set. A
* slug has no env names. Where `process` is missing (a browser) it returns
* `null`.
*/
function envKey(provider) {
	if (typeof provider === "string") return null;
	const env = globalThis.process?.env;
	for (const name of provider.env ?? []) {
		const value = env?.[name];
		if (typeof value === "string" && value.length > 0) return value;
	}
	return null;
}
/**
* Read a key on the relay. Import from `@tanstack/ai/byok/server` so this
* `process.env` access is not in the client graph.
*
* The header wins. A {@link ByokProvider} then tries `provider.env` in order.
* A slug is header-only.
*/
function getByokKey(request, provider) {
	const value = request.headers.get(byokHeaderName(resolveProviderId(provider)));
	if (typeof value === "string") {
		const trimmed = value.trim();
		if (trimmed.length > 0) return trimmed;
	}
	return envKey(provider);
}
/**
* Read several keys at once, one per name. Same rules as {@link getByokKey}
* for each entry. Use it for a credential made of more than one value.
*/
function getByokKeys(request, providers) {
	return Object.fromEntries(Object.entries(providers).map(([name, provider]) => [name, getByokKey(request, provider)]));
}
//#endregion
export { envKey, getByokKey, getByokKeys };

//# sourceMappingURL=get-key.js.map