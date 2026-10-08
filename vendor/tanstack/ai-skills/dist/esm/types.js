//#region src/types.ts
/** Map a provider name (`ctx.provider`) to its {@link ModelFamily}. */
function modelFamilyOf(provider) {
	const p = provider.toLowerCase();
	if (p.includes("anthropic") || p.includes("claude")) return "anthropic";
	if (p.includes("openai") || p.includes("gpt")) return "openai";
	if (p.includes("gemini") || p.includes("google")) return "gemini";
	return "other";
}
//#endregion
export { modelFamilyOf };

//# sourceMappingURL=types.js.map