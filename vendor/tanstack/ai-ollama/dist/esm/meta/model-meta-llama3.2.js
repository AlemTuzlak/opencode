var LLAMA3_2_MODELS = [
	{
		name: "llama3.2:latest",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: ["tools"]
		},
		size: "2gb",
		context: 128e3
	}.name,
	{
		name: "llama3.2:1b",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: ["tools"]
		},
		size: "1.3gb",
		context: 128e3
	}.name,
	{
		name: "llama3.2:3b",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: ["tools"]
		},
		size: "2gb",
		context: 128e3
	}.name
];
//#endregion
export { LLAMA3_2_MODELS };

//# sourceMappingURL=model-meta-llama3.2.js.map