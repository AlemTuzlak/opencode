var LLAMA4_MODELS = [
	{
		name: "llama4:latest",
		supports: {
			input: ["text", "image"],
			output: ["text"],
			capabilities: ["tools", "vision"]
		},
		size: "67gb",
		context: 1e7
	}.name,
	{
		name: "llama4:16x17b",
		supports: {
			input: ["text", "image"],
			output: ["text"],
			capabilities: ["tools", "vision"]
		},
		size: "67gb",
		context: 1e7
	}.name,
	{
		name: "llama4:128x17b",
		supports: {
			input: ["text", "image"],
			output: ["text"],
			capabilities: ["tools", "vision"]
		},
		size: "245gb",
		context: 1e6
	}.name
];
//#endregion
export { LLAMA4_MODELS };

//# sourceMappingURL=model-meta-llama4.js.map