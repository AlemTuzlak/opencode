//#region src/usage-count.ts
/** The MetadataStore namespace of the saved usage. The key is the thread id. */
var USAGE_NAMESPACE = "@tanstack/ai-compaction:usage";
async function hashMessages(messages) {
	const bytes = new TextEncoder().encode(JSON.stringify(messages));
	const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
	return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
function isUsageCount(value) {
	return typeof value === "object" && value !== null && "schemaVersion" in value && value.schemaVersion === 1 && "tokens" in value && typeof value.tokens === "number" && "coveredCount" in value && typeof value.coveredCount === "number" && Number.isInteger(value.coveredCount) && value.coveredCount >= 1 && "lastCoveredHash" in value && typeof value.lastCoveredHash === "string" && "compacted" in value && typeof value.compacted === "boolean";
}
/** The saved usage of a call that got `covered`. `undefined` for an empty list. */
async function toUsageCount(covered, usage, compacted) {
	const last = covered.at(-1);
	if (!last) return void 0;
	return {
		schemaVersion: 1,
		tokens: usage.promptTokens + usage.completionTokens,
		coveredCount: covered.length,
		lastCoveredHash: await hashMessages([last]),
		compacted
	};
}
/**
* The token count of `messages` from a saved usage: the usage, plus the
* estimate of each message after the reply. `undefined` when the usage does
* not fit: none is saved, the list is shorter, the last covered message
* changed (a compaction or an edit), or the usage is of a compacted view and
* this call does not reuse the checkpoint of that view.
*/
async function countFromUsage(saved, messages, estimate, reusedCheckpoint) {
	if (!isUsageCount(saved) || saved.compacted && !reusedCheckpoint || messages.length < saved.coveredCount) return;
	const last = messages[saved.coveredCount - 1];
	if (!last || await hashMessages([last]) !== saved.lastCoveredHash) return;
	let start = saved.coveredCount;
	while (messages[start]?.role === "assistant") start += 1;
	return messages.slice(start).reduce((total, message) => total + estimate(message), saved.tokens);
}
/** A MetadataStore in memory, for a run that has none. The key is the thread. */
function memoryMetadata() {
	const threads = /* @__PURE__ */ new Map();
	return {
		get: async (namespace, key) => threads.get(key)?.get(namespace) ?? null,
		set: async (namespace, key, value) => {
			const values = threads.get(key) ?? /* @__PURE__ */ new Map();
			threads.delete(key);
			threads.set(key, values.set(namespace, value));
			const [oldest] = threads.keys();
			if (threads.size > 1e3 && oldest !== void 0) threads.delete(oldest);
		},
		delete: async (namespace, key) => {
			threads.get(key)?.delete(namespace);
		}
	};
}
/**
* Add two usages. ponytail: only the token counts and `cost` add up. The
* details of a first usage are dropped when a second one comes.
*/
function sumUsage(total, next) {
	if (!total) return next;
	return {
		promptTokens: total.promptTokens + next.promptTokens,
		completionTokens: total.completionTokens + next.completionTokens,
		totalTokens: total.totalTokens + next.totalTokens,
		...total.cost !== void 0 && next.cost !== void 0 ? { cost: total.cost + next.cost } : {}
	};
}
//#endregion
export { USAGE_NAMESPACE, countFromUsage, hashMessages, memoryMetadata, sumUsage, toUsageCount };

//# sourceMappingURL=usage-count.js.map