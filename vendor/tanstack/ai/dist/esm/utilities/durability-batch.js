import { tanstackMetadata, withTanstackMetadata } from "./merge-metadata.js";
import { CUSTOM_EVENT } from "../custom-events.js";
//#region src/utilities/durability-batch.ts
/**
* High-volume CUSTOM names that stay in the durability batch.
* Everything else flushes as soon as it is emitted.
*/
var BATCHED_CUSTOM_EVENT_NAMES = /* @__PURE__ */ new Set([
	CUSTOM_EVENT.PROCESS_STDOUT,
	CUSTOM_EVENT.PROCESS_STDERR,
	"sandbox.file",
	"sandbox.file.diff"
]);
function hasBatchHint(chunk) {
	const tanstack = tanstackMetadata(chunk);
	if (tanstack == null) return false;
	return Reflect.get(tanstack, "batch") === true;
}
/** Mark a CUSTOM chunk so the durability producer keeps it in the batch. */
function withDurabilityBatchHint(chunk) {
	return withTanstackMetadata(chunk, { batch: true });
}
function isDurabilityBatchedCustom(chunk) {
	if (chunk.type !== "CUSTOM") return false;
	if (BATCHED_CUSTOM_EVENT_NAMES.has(chunk.name)) return true;
	return hasBatchHint(chunk);
}
/**
* Drop the in-process batch hint so it does not sit in the log or on the wire.
*/
function stripDurabilityBatchHint(chunk) {
	const tanstack = tanstackMetadata(chunk);
	if (tanstack == null || Reflect.get(tanstack, "batch") !== true) return chunk;
	Reflect.deleteProperty(tanstack, "batch");
	const metadata = chunk.metadata;
	if (metadata != null && Object.keys(tanstack).length === 0) {
		Reflect.deleteProperty(metadata, "tanstack");
		if (Object.keys(metadata).length === 0) Reflect.deleteProperty(chunk, "metadata");
	}
	return chunk;
}
//#endregion
export { isDurabilityBatchedCustom, stripDurabilityBatchHint, withDurabilityBatchHint };

//# sourceMappingURL=durability-batch.js.map