//#region src/types.ts
/**
* An awaited operation rejects with this error when the session refused its
* input (for example `busy: 'reject'` while a turn runs, or an `inputId`
* conflict). `receipt` is the refused receipt.
*/
var InputRejectedError = class extends Error {
	receipt;
	constructor(receipt) {
		super(rejectionMessage(receipt.reason));
		this.name = "InputRejectedError";
		this.receipt = receipt;
	}
};
function rejectionMessage(reason) {
	if (reason === "busy") return "A chat turn is already running.";
	if (reason === "conflict") return "An earlier input has this inputId and another payload.";
	return `The session rejected the input: ${reason ?? "rejected"}.`;
}
/** Names of the `CUSTOM` events a harness session adds to the stream. */
var HARNESS_EVENTS = {
	operationStarted: "harness.operation.started",
	operationFinished: "harness.operation.finished",
	operationResumed: "harness.operation.resumed",
	configChanged: "harness.config.changed",
	/** `session.configure` changed the settings. The value has `settings`. */
	settingsChanged: "harness.settings.changed",
	/** A plugin added or removed a command with `ctx.commands`. */
	commandsChanged: "harness.commands.changed",
	/**
	* `session.reload()` set the plugins up again. The value is empty, or has
	* the `error` message when the new setup failed. Read the commands, the
	* config, and the agents again.
	*/
	reloaded: "harness.reloaded",
	question: "harness.question",
	questionAnswered: "harness.question.answered",
	pluginEvent: "harness.plugin.event",
	authRequired: "harness.auth_required",
	inputAccepted: "harness.input.accepted",
	inputApplied: "harness.input.applied",
	inputRejected: "harness.input.rejected",
	/** An input ended. The value is an `InputSettlement`. */
	inputSettled: "harness.input.settled",
	/**
	* A `setDelivery` input moved a waiting input. The value has `inputId` and
	* `delivery`.
	*/
	inputDelivery: "harness.input.delivery",
	/** A media file was stored. The value is a `MediaRecord`. */
	media: "harness.media",
	/**
	* A turn runs the model again after an error. The value has `operationId`,
	* `retries`, `error`, and `continued`. `continued` is true when the model
	* continues a partial answer.
	*/
	turnRetry: "harness.turn.retry",
	/**
	* `session.reset()` started a fresh model context. The value has
	* `inputId` and the `note`, when there is one.
	*/
	reset: "harness.reset",
	/**
	* `session.revert` or `session.unrevert` changed what the transcript
	* shows. The value has the `messageId` of the revert, or `null` when no
	* revert stands. Read the transcript again.
	*/
	revert: "harness.revert",
	/**
	* A model call reported its usage. The value has `model`, `sender` (when
	* known), the `usage` of the call, and the new thread `total`.
	*/
	usage: "harness.usage"
};
//#endregion
export { HARNESS_EVENTS, InputRejectedError };

//# sourceMappingURL=types.js.map