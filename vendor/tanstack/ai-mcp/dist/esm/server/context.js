//#region src/server/context.ts
/** The error a tool gets when the user declines or cancels an input request. */
var inputDeclinedMessage = "The user did not accept the input request.";
/**
* The tool stopped because it needs user input.
*
* `resultType` is `input_required`.
* `request` is the object passed to `ctx.context.requestInput`.
* Catch this error, then run the tool again with `inputAnswer`.
* `ctx.context.requestInput` then returns that answer.
*
* @param request - The input request from the tool
*
* @example
* try {
*   await tool(ctx)
* } catch (error) {
*   if (error instanceof ToolInputRequiredError) {
*     error.request
*   }
* }
*/
var ToolInputRequiredError = class extends Error {
	request;
	resultType = "input_required";
	constructor(request) {
		super("The tool stopped because it needs input. Run the tool again with inputAnswer.");
		this.request = request;
		this.name = "ToolInputRequiredError";
	}
};
/**
* Builds the context for one tool call.
*
* On era `2025`, `requestInput` waits on `waitForInput`.
* The same tool call then continues with that answer.
* If `inputAnswer` is absent on era `2026`, `requestInput` throws
* {@link ToolInputRequiredError}.
* If you pass `inputAnswer`, the tool runs again.
* Then `requestInput` returns that answer.
* If you pass `inputDeclined`, `requestInput` throws an Error instead.
* Code before `requestInput` runs on both calls.
*
* On era `2025`, `sample` calls `clientSample`.
* It does not call the `sample` adapter.
* On era `2026`, `sample` calls the `sample` adapter.
* It does not call `clientSample`.
* If `sample` is absent on era `2026`, `ctx.sample` throws an Error.
* The error message contains `sample`.
*
* @param options - The protocol era and the callbacks for that era
*
* @example
* const ctx = createServerToolContext({
*   era: '2025',
*   waitForInput: async () => 'Paris',
*   clientSample: async () => 'A short draft',
* })
* await ctx.requestInput({ message: 'Which city?' })
*/
function createServerToolContext(options) {
	let asked = false;
	return {
		/**
		* The verified token of the caller, from the server `auth` option.
		* `undefined` when the server has no `auth`, or for
		* `createMCPClient({ server })`.
		*/
		authInfo: options.authInfo,
		/**
		* Asks the user for a value.
		*
		* On era `2025`, this waits on `waitForInput` and returns that answer.
		* If `inputAnswer` is absent on era `2026`, this throws
		* {@link ToolInputRequiredError}.
		* If `inputAnswer` is present, this returns that answer.
		* If the user declined or cancelled, this throws an Error.
		* On era `2026`, a second call in the same tool call throws an Error.
		*
		* @param request - The question for the user
		*/
		async requestInput(request) {
			if (options.era === "2025") return options.waitForInput(request);
			if (asked) throw new Error("ctx.context.requestInput can ask only one question per tool call on protocol 2026. Split the questions into separate tools.");
			asked = true;
			if (options.inputDeclined === true) throw new Error(inputDeclinedMessage);
			if (options.inputAnswer === void 0) throw new ToolInputRequiredError(request);
			return options.inputAnswer;
		},
		/**
		* Asks for a model result.
		*
		* On era `2025`, this calls `clientSample`.
		* On era `2026`, this calls the `sample` adapter.
		* If that adapter is absent, this throws an Error.
		* The message contains `sample`.
		*
		* @param request - The prompt for the model
		*/
		async sample(request) {
			if (options.era === "2025") return options.clientSample(request);
			if (options.sample === void 0) throw new Error("ctx.context.sample needs the sample adapter on protocol 2026. Pass sample to createServerToolContext.");
			return options.sample(request);
		}
	};
}
//#endregion
export { ToolInputRequiredError, createServerToolContext, inputDeclinedMessage };

//# sourceMappingURL=context.js.map