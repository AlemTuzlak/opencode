var GRANITE3_1_DENSE_MODELS = [
	{
		name: "granite3.1-dense:latest",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: ["tools"]
		},
		size: "5gb",
		context: 128e3
	}.name,
	{
		name: "granite3.1-dense:2b",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: ["tools"]
		},
		size: "1.6gb",
		context: 128e3
	}.name,
	{
		name: "granite3.1-dense:8b",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: ["tools"]
		},
		size: "5gb",
		context: 128e3
	}.name
];
//#endregion
export { GRANITE3_1_DENSE_MODELS };

//# sourceMappingURL=model-meta-granite3.1-dense.js.map