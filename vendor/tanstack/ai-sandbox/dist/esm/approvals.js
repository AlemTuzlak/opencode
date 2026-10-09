import { evaluateCommand } from "./policy.js";
import { EventType, withTanstackMetadata } from "@tanstack/ai";
//#region src/approvals.ts
/**
* Shared interactive-approval logic for harness adapters.
*
* Flow (rides chat()'s existing resume-based approval mechanism):
*  1. The agent (inside the sandbox) asks to run a risky action; the harness's
*     host-side permission callback fires.
*  2. `resolveApproval` evaluates the sandbox policy: `allow`/`deny` are final;
*     `ask` consults the client's approval decisions (threaded via
*     `TextOptions.approvals`, keyed by a stable `approvalId`).
*  3. On `ask` with no decision yet, the adapter emits an `approval-requested`
*     CUSTOM event (carrying the `approvalId`) and denies the action this turn.
*     The client shows UI, then re-runs chat() with the decision in the message;
*     the engine surfaces it as `approvals`, and the next run allows it.
*
* `approvalId` is stable for a given (provider, kind, target) so a client grant
* matches the same action on the resumed run.
*/
/** CUSTOM event name emitted when a harness action needs client approval. */
var APPROVAL_REQUESTED_EVENT = "approval-requested";
/** A stable, opaque approval id for a harness action. */
function approvalId(input) {
	return `${input.provider}:${input.kind}:${input.target}`;
}
/** Resolve a harness permission request against policy + client approvals. */
function resolveApproval(input) {
	const base = input.command !== void 0 ? evaluateCommand(input.command, input.policy, input.scripts) : input.capability !== void 0 ? input.policy?.capabilities?.[input.capability] ?? input.policy?.default ?? "ask" : input.policy?.default ?? "ask";
	if (base === "allow") return {
		decision: "allow",
		needsApproval: false
	};
	if (base === "deny") return {
		decision: "deny",
		needsApproval: false
	};
	const granted = input.approvals?.get(input.id);
	if (granted === true) return {
		decision: "allow",
		needsApproval: false
	};
	if (granted === false) return {
		decision: "deny",
		needsApproval: false
	};
	return {
		decision: "deny",
		needsApproval: true
	};
}
/** Build the AG-UI `approval-requested` CUSTOM event for a harness action. */
function buildApprovalRequestedEvent(input) {
	return withTanstackMetadata({
		type: EventType.CUSTOM,
		name: APPROVAL_REQUESTED_EVENT,
		value: {
			approvalId: input.approvalId,
			title: input.title,
			...input.detail ?? {}
		},
		timestamp: Date.now()
	}, {
		threadId: input.threadId,
		runId: input.runId
	});
}
//#endregion
export { APPROVAL_REQUESTED_EVENT, approvalId, buildApprovalRequestedEvent, resolveApproval };

//# sourceMappingURL=approvals.js.map