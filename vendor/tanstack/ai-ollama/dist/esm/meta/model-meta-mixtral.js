var MIXTRAL_MODELS = [
	{
		name: "mixtral:latest",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: ["tools"]
		},
		size: "26gb",
		context: 32e3
	}.name,
	{
		name: "mixtral:8x7b",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: ["tools"]
		},
		size: "26gb",
		context: 32e3
	}.name,
	{
		name: "mixtral:8x22b",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: ["tools"]
		},
		size: "80gb",
		context: 64e3
	}.name
];
//#endregion
export { MIXTRAL_MODELS };

//# sourceMappingURL=model-meta-mixtral.js.map