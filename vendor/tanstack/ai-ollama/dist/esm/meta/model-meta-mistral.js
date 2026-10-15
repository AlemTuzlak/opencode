var MISTRAL_MODELS = [{
	name: "mistral:latest",
	supports: {
		input: ["text"],
		output: ["text"],
		capabilities: ["tools"]
	},
	size: "4.4gb",
	context: 32e3
}.name, {
	name: "mistral:7b",
	supports: {
		input: ["text"],
		output: ["text"],
		capabilities: ["tools"]
	},
	size: "4.4gb",
	context: 32e3
}.name];
//#endregion
export { MISTRAL_MODELS };

//# sourceMappingURL=model-meta-mistral.js.map