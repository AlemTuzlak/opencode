var MISTRAL_NEMO_MODELS = [{
	name: "mistral-nemo:latest",
	supports: {
		input: ["text"],
		output: ["text"],
		capabilities: ["tools"]
	},
	size: "7.1gb",
	context: 128e3
}.name, {
	name: "mistral-nemo:12b",
	supports: {
		input: ["text"],
		output: ["text"],
		capabilities: ["tools"]
	},
	size: "7.1gb",
	context: 128e3
}.name];
//#endregion
export { MISTRAL_NEMO_MODELS };

//# sourceMappingURL=model-meta-mistral-nemo.js.map