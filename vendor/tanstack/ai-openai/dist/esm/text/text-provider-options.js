//#region src/text/text-provider-options.ts
var validateConversationAndPreviousResponseId = (options) => {
	if (options.conversation && options.previous_response_id) throw new Error("Cannot use both 'conversation' and 'previous_response_id' in the same request.");
};
var validateTextProviderOptions = (options) => {
	validateMetadata(options);
	validateConversationAndPreviousResponseId(options);
};
var validateMetadata = (options) => {
	const metadata = options.metadata;
	if (metadata && Object.keys(metadata).length > 16) throw new Error("Metadata cannot have more than 16 key-value pairs.");
	if (metadata && Object.keys(metadata).some((key) => key.length > 64)) throw new Error("Metadata keys cannot be longer than 64 characters.");
	if (metadata && Object.values(metadata).some((value) => value.length > 512)) throw new Error("Metadata values cannot be longer than 512 characters.");
};
//#endregion
export { validateTextProviderOptions };

//# sourceMappingURL=text-provider-options.js.map