var GPT_OSS_MODELS = [
	{
		name: "gpt-oss:latest",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: ["tools", "thinking"]
		},
		size: "14gb",
		context: 128e3
	}.name,
	{
		name: "gpt-oss:20b",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: ["tools", "thinking"]
		},
		size: "14gb",
		context: 128e3
	}.name,
	{
		name: "gpt-oss:120b",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: ["tools", "thinking"]
		},
		size: "65gb",
		context: 128e3
	}.name
];
//#endregion
export { GPT_OSS_MODELS };

//# sourceMappingURL=model-meta-gpt-oss.js.map