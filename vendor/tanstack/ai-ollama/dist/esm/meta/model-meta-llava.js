var LLAVA_MODELS = [
	{
		name: "llava:latest",
		supports: {
			input: ["text", "image"],
			output: ["text"],
			capabilities: ["vision"]
		},
		size: "4.7gb",
		context: 32e3
	}.name,
	{
		name: "llava:7b",
		supports: {
			input: ["text", "image"],
			output: ["text"],
			capabilities: ["vision"]
		},
		size: "4.7gb",
		context: 32e3
	}.name,
	{
		name: "llava:13b",
		supports: {
			input: ["text", "image"],
			output: ["text"],
			capabilities: ["vision"]
		},
		size: "8gb",
		context: 4e3
	}.name,
	{
		name: "llava:34b",
		supports: {
			input: ["text", "image"],
			output: ["text"],
			capabilities: ["vision"]
		},
		size: "20gb",
		context: 4e3
	}.name
];
//#endregion
export { LLAVA_MODELS };

//# sourceMappingURL=model-meta-llava.js.map