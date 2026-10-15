//#region src/tools/tool-choice.ts
/**
* Maps the `chat({ toolChoice })` value to the Chat Completions
* `tool_choice` wire value.
*/
function toChatCompletionsToolChoice(choice) {
	if (typeof choice === "string") return choice;
	return {
		type: "function",
		function: { name: choice.name }
	};
}
/**
* Maps the `chat({ toolChoice })` value to the Responses `tool_choice` wire
* value.
*/
function toResponsesToolChoice(choice) {
	if (typeof choice === "string") return choice;
	return {
		type: "function",
		name: choice.name
	};
}
//#endregion
export { toChatCompletionsToolChoice, toResponsesToolChoice };

//# sourceMappingURL=tool-choice.js.map