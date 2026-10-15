var QWEN2_MODELS = [
	{
		name: "qwen2:latest",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: ["tools"]
		},
		size: "4.4gb",
		context: 32e3
	}.name,
	{
		name: "qwen2:0.5b",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: ["tools"]
		},
		size: "352mb",
		context: 32e3
	}.name,
	{
		name: "qwen2:1.5b",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: ["tools"]
		},
		size: "935mb",
		context: 32e3
	}.name,
	{
		name: "qwen2:7b",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: ["tools"]
		},
		size: "4.4gb",
		context: 32e3
	}.name,
	{
		name: "qwen2:72b",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: ["tools"]
		},
		size: "41gb",
		context: 32e3
	}.name
];
//#endregion
export { QWEN2_MODELS };

//# sourceMappingURL=model-meta-qwen2.js.map