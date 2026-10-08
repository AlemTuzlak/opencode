var LLAMA3_2_VISION_MODELS = [
	{
		name: "llama3.2:latest",
		supports: {
			input: ["text", "image"],
			output: ["text"],
			capabilities: ["vision"]
		},
		size: "7.8b",
		context: 128e3
	}.name,
	{
		name: "llama3.2:11b",
		supports: {
			input: ["text", "image"],
			output: ["text"],
			capabilities: ["vision"]
		},
		size: "1gb",
		context: 128e3
	}.name,
	{
		name: "llama3.2:90b",
		supports: {
			input: ["text", "image"],
			output: ["text"],
			capabilities: ["vision"]
		},
		size: "55gb",
		context: 128e3
	}.name
];
//#endregion
export { LLAMA3_2_VISION_MODELS };

//# sourceMappingURL=model-meta-llama3.2-vision.js.map