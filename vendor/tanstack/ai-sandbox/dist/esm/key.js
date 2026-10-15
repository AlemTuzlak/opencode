//#region src/key.ts
/** Deterministic, dependency-free 64-bit FNV-1a hash → hex string. */
function fnv1a(input) {
	let h1 = 2166136261;
	let h2 = 2166136261;
	for (let i = 0; i < input.length; i++) {
		const c = input.charCodeAt(i);
		h1 ^= c & 255;
		h1 = Math.imul(h1, 16777619);
		h2 ^= c >> 8 & 255;
		h2 = Math.imul(h2, 16777619);
	}
	const hex = (n) => (n >>> 0).toString(16).padStart(8, "0");
	return hex(h1) + hex(h2);
}
/** Canonical, key-sorted JSON so logically-equal inputs hash identically. */
function canonical(value) {
	if (value === null || typeof value !== "object") return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
	return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(",")}}`;
}
/**
* Hash of the parts of a workspace that change what the agent sees. Secrets are
* intentionally excluded (rotating a token must not orphan the sandbox).
*/
function computeWorkspaceHash(workspace) {
	if (!workspace) return fnv1a("no-workspace");
	const { secrets: _secrets, ...rest } = workspace;
	const { source } = rest;
	if (source.type === "git" && source.auth) {
		const { token: _token, ...auth } = source.auth;
		return fnv1a(canonical({
			...rest,
			source: {
				...source,
				auth
			}
		}));
	}
	return fnv1a(canonical(rest));
}
/** Compute the compound sandbox instance key. */
function computeSandboxKey(input) {
	return fnv1a(canonical({
		threadId: input.threadId,
		sandboxId: input.sandboxId,
		providerName: input.providerName,
		workspaceHash: computeWorkspaceHash(input.workspace),
		tenant: input.tenant ?? null
	}));
}
//#endregion
export { computeSandboxKey, computeWorkspaceHash };

//# sourceMappingURL=key.js.map