var CODELLAMA_MODELS = [
	{
		name: "codellama:latest",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: []
		},
		size: "3.8gb",
		context: 16e3
	}.name,
	{
		name: "codellama:7b",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: []
		},
		size: "3.8gb",
		context: 16e3
	}.name,
	{
		name: "codellama:13b",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: []
		},
		size: "7.4gb",
		context: 16e3
	}.name,
	{
		name: "codellama:34b",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: []
		},
		size: "19gb",
		context: 16e3
	}.name,
	{
		name: "codellama:70b",
		supports: {
			input: ["text"],
			output: ["text"],
			capabilities: []
		},
		size: "39gb",
		context: 2e3
	}.name
];
//#endregion
export { CODELLAMA_MODELS };

//# sourceMappingURL=model-meta-codellama.js.map