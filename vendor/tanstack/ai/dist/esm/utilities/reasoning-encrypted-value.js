import { EventType } from "../types.js";
//#region src/utilities/reasoning-encrypted-value.ts
/** Spec event that carries a provider thinking / tool-call signature blob. */
function reasoningEncryptedValue(opts) {
	return {
		type: EventType.REASONING_ENCRYPTED_VALUE,
		subtype: opts.subtype,
		entityId: opts.entityId,
		encryptedValue: opts.encryptedValue,
		...opts.timestamp !== void 0 ? { timestamp: opts.timestamp } : {}
	};
}
/**
* Id prefix for the reasoning message of a redacted thinking block (Anthropic
* `redacted_thinking`). AG-UI's `encryptedValue` does not say what kind of
* bytes it holds (ag-ui-protocol/ag-ui#2884), so the id that `entityId` points
* to says it. AG-UI clients keep message ids, but they drop event metadata.
*/
var REDACTED_THINKING_ID_PREFIX = "redacted_thinking-";
function isRedactedThinkingId(id) {
	return typeof id === "string" && id.startsWith("redacted_thinking-");
}
//#endregion
export { REDACTED_THINKING_ID_PREFIX, isRedactedThinkingId, reasoningEncryptedValue };

//# sourceMappingURL=reasoning-encrypted-value.js.map