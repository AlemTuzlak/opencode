//#region src/audio/audio-provider-options.ts
/**
* Validates that the audio input text does not exceed the maximum length.
* @throws Error if input text exceeds 200 characters
*/
var validateAudioInput = (options) => {
	if (options.input.length > 200) throw new Error("Input text exceeds maximum length of 200 characters.");
};
//#endregion
export { validateAudioInput };

//# sourceMappingURL=audio-provider-options.js.map