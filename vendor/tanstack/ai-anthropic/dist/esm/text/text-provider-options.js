//#region src/text/text-provider-options.ts
var validateTopPandTemperature = (options) => {
	if (options.top_p !== void 0 && options.temperature !== void 0) throw new Error("You should either set top_p or temperature, but not both.");
};
var validateThinking = (options) => {
	const thinking = options.thinking;
	if (thinking && thinking.type === "enabled") {
		if (thinking.budget_tokens < 1024) throw new Error("thinking.budget_tokens must be at least 1024.");
		if (thinking.budget_tokens >= options.max_tokens) throw new Error("thinking.budget_tokens must be less than max_tokens.");
	}
};
var validateMaxTokens = (options) => {
	if (options.max_tokens < 1) throw new Error("max_tokens must be at least 1.");
};
var validateTextProviderOptions = (options) => {
	validateTopPandTemperature(options);
	validateThinking(options);
	validateMaxTokens(options);
};
//#endregion
export { validateTextProviderOptions };

//# sourceMappingURL=text-provider-options.js.map