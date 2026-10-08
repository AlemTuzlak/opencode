//#region src/record.ts
/** The log record type of a durable compaction. */
var COMPACTION_RECORD_TYPE = "tanstack.compaction";
var sameMessage = (a, b) => a === b || JSON.stringify(a) === JSON.stringify(b);
/**
* The record of a compaction from `before` to `after`: the new head, and the
* index in `before` where the kept tail starts. When `after` does not end with
* the tail of `before`, the head is all of `after`, and `from` is the end of
* `before`.
*/
function compactionRecord(input) {
	const { before, after } = input;
	let kept = 0;
	for (;;) {
		const old = before[before.length - 1 - kept];
		const next = after[after.length - 1 - kept];
		if (!old || !next || !sameMessage(old, next)) break;
		kept += 1;
	}
	const from = before.length - kept;
	const firstKeptId = before[from]?.id;
	return {
		type: COMPACTION_RECORD_TYPE,
		reason: input.reason,
		tokensBefore: input.tokensBefore,
		tokensAfter: input.tokensAfter,
		...input.usage ? { usage: input.usage } : {},
		head: after.slice(0, after.length - kept),
		from,
		...firstKeptId ? { firstKeptId } : {}
	};
}
var isMessageList = (value) => Array.isArray(value) && value.every((item) => typeof item === "object" && item !== null && "role" in item && typeof item.role === "string");
/**
* Fold a compaction record into the model context. Give it to the host:
* `createHarnessHost({ project: { record: projectCompaction } })`. Returns
* `undefined` for a record of another type, and for a record that this fold
* cannot use. Pure: the same log always folds to the same context.
*/
function projectCompaction(input) {
	const { messages, record } = input;
	if (record.type !== "tanstack.compaction") return void 0;
	const head = record.head;
	if (!isMessageList(head)) return void 0;
	const start = typeof record.firstKeptId === "string" ? messages.findIndex((message) => message.id === record.firstKeptId) : record.from;
	if (typeof start !== "number" || !Number.isInteger(start) || start < 0 || start > messages.length) return;
	return [...head, ...messages.slice(start)];
}
//#endregion
export { COMPACTION_RECORD_TYPE, compactionRecord, projectCompaction };

//# sourceMappingURL=record.js.map