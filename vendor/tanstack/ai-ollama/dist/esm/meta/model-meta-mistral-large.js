var MISTRAL_LARGE_MODELS = [{
	name: "mistral-large:latest",
	supports: {
		input: ["text"],
		output: ["text"],
		capabilities: ["tools"]
	},
	size: "73gb",
	context: 128e3
}.name, {
	name: "mistral-large:123b",
	supports: {
		input: ["text"],
		output: ["text"],
		capabilities: ["tools"]
	},
	size: "73gb",
	context: 128e3
}.name];
//#endregion
export { MISTRAL_LARGE_MODELS };

//# sourceMappingURL=model-meta-mistral-large.js.map