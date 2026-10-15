//#region src/audio/audio-provider-options.ts
var validateSpeed = (options) => {
	if (options.speed) {
		if (options.speed < .25 || options.speed > 4) throw new Error("Speed must be between 0.25 and 4.0.");
	}
};
var validateInstructions = (options) => {
	if (options.instructions && ["tts-1", "tts-1-hd"].includes(options.model)) throw new Error(`The model ${options.model} does not support instructions.`);
};
var validateAudioInput = (options) => {
	if (options.input.length > 4096) throw new Error("Input text exceeds maximum length of 4096 characters.");
};
//#endregion
export { validateAudioInput, validateInstructions, validateSpeed };

//# sourceMappingURL=audio-provider-options.js.map