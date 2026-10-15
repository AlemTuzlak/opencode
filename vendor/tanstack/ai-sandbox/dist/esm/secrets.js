//#region src/secrets.ts
/** Internal symbol used to store the value registry on a Secrets object. */
var REGISTRY = Symbol("secrets.registry");
/** Create a typed secrets object from a plain record of name→value pairs. */
function createSecrets(values) {
	const registry = new Map(Object.entries(values));
	const obj = {};
	for (const name of Object.keys(values)) obj[name] = Object.freeze({ __secretName: name });
	Object.defineProperty(obj, REGISTRY, {
		value: registry,
		enumerable: false,
		configurable: false,
		writable: false
	});
	return obj;
}
/** Create a bearer-token marker that resolves to `Bearer <value>` at runtime. */
function bearer(ref) {
	return Object.freeze({ __bearerRef: ref });
}
/** Return true when `x` is a SecretRef. */
function isSecretRef(x) {
	return typeof x === "object" && x !== null && typeof x["__secretName"] === "string";
}
/** Resolve a SecretRef to its plaintext value using the secrets object. */
function resolveSecret(secrets, ref) {
	const registry = Reflect.get(secrets, REGISTRY);
	if (registry === void 0) throw new Error("resolveSecret: secrets object was not created by createSecrets");
	const value = registry.get(ref.__secretName);
	if (value === void 0) throw new Error(`resolveSecret: unknown secret "${ref.__secretName}"`);
	return value;
}
/** Resolve a BearerRef to a `Bearer <value>` string. */
function resolveBearer(secrets, ref) {
	return `Bearer ${resolveSecret(secrets, ref.__bearerRef)}`;
}
/**
* Resolve all secrets in a Secrets object to a plain `Record<string, string>`
* suitable for injecting into a process environment.
*/
function resolveAllSecrets(secrets) {
	const registry = Reflect.get(secrets, REGISTRY);
	if (registry === void 0) throw new Error("resolveAllSecrets: secrets object was not created by createSecrets");
	const result = {};
	for (const [key, value] of registry.entries()) result[key] = value;
	return result;
}
//#endregion
export { bearer, createSecrets, isSecretRef, resolveAllSecrets, resolveBearer, resolveSecret };

//# sourceMappingURL=secrets.js.map