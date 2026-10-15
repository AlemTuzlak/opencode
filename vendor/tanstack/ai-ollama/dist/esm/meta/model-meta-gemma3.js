var GEMMA3_MODELS = [
	{
		name: "gemma3:latest",
		supports: {
			input: ["text", "image"],
			output: ["text"],
			capabilities: []
		},
		size: "3.3gb",
		context: 128e3
	}.name,
	{
		name: "gemma3:270m",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: []
		},
		size: "298mb",
		context: 32e3
	}.name,
	{
		name: "gemma3:1b",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: []
		},
		size: "815mb",
		context: 32e3
	}.name,
	{
		name: "gemma3:4b",
		supports: {
			input: ["text", "image"],
			output: ["text"],
			capabilities: []
		},
		size: "3.3gb",
		context: 128e3
	}.name,
	{
		name: "gemma3:12b",
		supports: {
			input: ["text", "image"],
			output: ["text"],
			capabilities: []
		},
		size: "8.1gb",
		context: 128e3
	}.name,
	{
		name: "gemma3:27b",
		supports: {
			input: ["text", "image"],
			output: ["text"],
			capabilities: []
		},
		size: "17gb",
		context: 128e3
	}.name
];
//#endregion
export { GEMMA3_MODELS };

//# sourceMappingURL=model-meta-gemma3.js.map