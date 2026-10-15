//#region src/utilities/context-overflow.ts
var OVERFLOW_PATTERNS = [
	/prompt (?:is )?too long/i,
	/request_too_large/i,
	/input is too long for requested model/i,
	/exceeds the context window/i,
	/exceeds (?:the )?(?:model'?s )?maximum context length(?: of [\d,]+ tokens?|\s*\([\d,]+\))/i,
	/input token count.*exceeds the maximum/i,
	/maximum prompt length is \d+/i,
	/reduce the length of the messages/i,
	/maximum context length is \d+ tokens/i,
	/exceeds (?:the )?maximum allowed input length of [\d,]+ tokens?/i,
	/input \(\d+ tokens\) is longer than the model'?s context length \(\d+ tokens\)/i,
	/exceeds the limit of \d+/i,
	/exceeds the available context size/i,
	/greater than the context length/i,
	/context window exceeds limit/i,
	/exceeded model token limit/i,
	/too large for model with \d+ maximum context length/i,
	/prompt has [\d,]+ tokens?, but the configured context size is [\d,]+ tokens?/i,
	/model_context_window_exceeded/i,
	/prompt too long; exceeded (?:max )?context length/i,
	/range of input length should be/i,
	/context[_ ]length[_ ]exceeded/i,
	/too many tokens/i,
	/token limit exceeded/i
];
var NOT_OVERFLOW_PATTERNS = [
	/^(Throttling error|Service unavailable):/i,
	/rate limit/i,
	/too many requests/i
];
var CEREBRAS_BODYLESS_ERROR = /^4(?:00|13)\s*(?:status code)?\s*\(no body\)/i;
function isRecord(value) {
	return typeof value === "object" && value !== null;
}
/** The message of a `RUN_ERROR` event, an `Error`, or a string. */
function errorText(error) {
	if (typeof error === "string") return error;
	if (error instanceof Error) return error.message;
	if (!isRecord(error)) return void 0;
	if (typeof error.message === "string" && error.message !== "") return error.message;
	const nested = error.error;
	return isRecord(nested) && typeof nested.message === "string" ? nested.message : void 0;
}
function isOverflowError(text, provider) {
	if (NOT_OVERFLOW_PATTERNS.some((pattern) => pattern.test(text))) return false;
	if (OVERFLOW_PATTERNS.some((pattern) => pattern.test(text))) return true;
	return provider === "cerebras" && CEREBRAS_BODYLESS_ERROR.test(text);
}
/**
* Whether a model call failed, or ended early, because the input did not fit
* in the model's context window. Use it to compact the history and retry.
*
* - An error counts when its message matches a known overflow message of a
*   provider (Anthropic, OpenAI, Gemini, Bedrock, xAI, Groq, OpenRouter,
*   Mistral, Ollama, and more), and it is not a rate limit or a throttle.
* - With `contextWindow`, a call that finished with `'stop'` counts when
*   `usage.promptTokens` is more than the window. Some providers accept an
*   overflow and cut the input without an error.
* - With `contextWindow`, a call that finished with `'length'` counts when it
*   wrote no tokens and its input fills 99% of the window.
*
* @example
* ```ts
* for await (const chunk of chat({ adapter, messages })) {
*   if (chunk.type === 'RUN_ERROR' && isContextOverflow({ error: chunk })) {
*     // compact `messages`, then call chat() again
*   }
* }
* ```
*/
function isContextOverflow(input) {
	const text = errorText(input.error);
	if (text !== void 0 && isOverflowError(text, input.provider)) return true;
	const { usage, finishReason, contextWindow } = input;
	if (!usage || !contextWindow) return false;
	if (finishReason === "stop") return usage.promptTokens > contextWindow;
	return finishReason === "length" && usage.completionTokens === 0 && usage.promptTokens >= contextWindow * .99;
}
//#endregion
export { isContextOverflow };

//# sourceMappingURL=context-overflow.js.map