var LLAMA3_3_MODELS = [{
	name: "llama3.3:latest",
	supports: {
		input: ["text"],
		output: ["text"],
		capabilities: ["tools"]
	},
	size: "43b",
	context: 128e3
}.name, {
	name: "llama3.3:70b",
	supports: {
		input: ["text"],
		output: ["text"],
		capabilities: ["tools"]
	},
	size: "43gb",
	context: 128e3
}.name];
//#endregion
export { LLAMA3_3_MODELS };

//# sourceMappingURL=model-meta-llama3.3.js.map