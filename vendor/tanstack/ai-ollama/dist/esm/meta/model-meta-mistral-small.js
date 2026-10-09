var MISTRAL_SMALL_MODELS = [
	{
		name: "mistral-small:latest",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: ["tools"]
		},
		size: "14gb",
		context: 32e3
	}.name,
	{
		name: "mistral-small:22b",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: ["tools"]
		},
		size: "13gb",
		context: 128e3
	}.name,
	{
		name: "mistral-small:24b",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: ["tools"]
		},
		size: "14gb",
		context: 32e3
	}.name
];
//#endregion
export { MISTRAL_SMALL_MODELS };

//# sourceMappingURL=model-meta-mistral-small.js.map