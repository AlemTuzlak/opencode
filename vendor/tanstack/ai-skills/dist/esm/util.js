//#region src/util.ts
/**
* Reject a resource/script path that escapes its skill root. Pure string check
* (edge-safe, no `node:path`): no absolute paths, no `..` segments, no
* backslashes. Enforced here so both the resource tool and `skillDirectory`
* share one guard and the conformance suite can pin it.
*/
function assertSafeResourcePath(path) {
	const normalized = path.replace(/\\/g, "/");
	if (normalized.startsWith("/") || /^[a-zA-Z]:/.test(normalized) || normalized.split("/").some((seg) => seg === ".." || seg === "~")) throw new Error(`unsafe resource path: "${path}"`);
}
/** Small, edge-safe (no `node:crypto`) stable string hash for `revision()`. */
function stableHash(input) {
	let h = 2166136261;
	for (let i = 0; i < input.length; i++) {
		h ^= input.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return (h >>> 0).toString(16).padStart(8, "0");
}
//#endregion
export { assertSafeResourcePath, stableHash };

//# sourceMappingURL=util.js.map