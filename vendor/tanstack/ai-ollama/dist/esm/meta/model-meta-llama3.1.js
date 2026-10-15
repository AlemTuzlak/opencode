var LLAMA3_1_MODELS = [
	{
		name: "llama3.1:latest",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: ["tools"]
		},
		size: "4.9gb",
		context: 128e3
	}.name,
	{
		name: "llama3.1:8b",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: ["tools"]
		},
		size: "4.9gb",
		context: 128e3
	}.name,
	{
		name: "llama3.1:70b",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: ["tools"]
		},
		size: "43gb",
		context: 128e3
	}.name,
	{
		name: "llama3.1:405b",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: ["tools"]
		},
		size: "243gb",
		context: 128e3
	}.name
];
//#endregion
export { LLAMA3_1_MODELS };

//# sourceMappingURL=model-meta-llama3.1.js.map