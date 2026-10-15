var COMMAND_R_MODELS = [{
	name: "command-r:latest",
	supports: {
		input: ["text"],
		output: ["text"],
		capabilities: ["tools"]
	},
	size: "19gb",
	context: 128e3
}.name, {
	name: "command-r:35b",
	supports: {
		input: ["text"],
		output: ["text"],
		capabilities: ["tools"]
	},
	size: "19gb",
	context: 128e3
}.name];
//#endregion
export { COMMAND_R_MODELS };

//# sourceMappingURL=model-meta-command-r.js.map