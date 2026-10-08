var DEEPSEEK_OCR_MODELS = [{
	name: "deepseek-ocr:latest",
	supports: {
		input: ["text", "image"],
		output: ["text"],
		capabilities: ["vision"]
	},
	size: "6.7gb",
	context: 8e3
}.name, {
	name: "deepseek-ocr:3b",
	supports: {
		input: ["text", "image"],
		output: ["text"],
		capabilities: ["vision"]
	},
	size: "6.7gb",
	context: 8e3
}.name];
//#endregion
export { DEEPSEEK_OCR_MODELS };

//# sourceMappingURL=model-meta-deepseek-ocr.js.map