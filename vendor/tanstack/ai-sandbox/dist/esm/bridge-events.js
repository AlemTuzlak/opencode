import { EventType, withTanstackMetadata } from "@tanstack/ai";
//#region src/bridge-events.ts
/**
* Helpers that let a harness adapter surface custom events emitted by BRIDGED
* tools (via {@link ToolBridgeCoreOptions.emitCustomEvent}) on its live output
* stream.
*
* The bridge runs out-of-band from the harness's own event stream, so a bridged
* tool's progress/console events have no path to the client on their own. An
* adapter creates a {@link BridgeEventChannel}, hands its `emitCustomEvent` to
* the bridge provisioner, and {@link mergeChunkStreams | merges} the channel's
* stream into its translated output — so events interleave live while the agent
* runs (e.g. code mode's `code_mode:console` logs during a long execution).
*/
/** Create a channel whose emitted events become CUSTOM {@link StreamChunk}s. */
function createBridgeEventChannel(meta) {
	const buffer = [];
	let notify = null;
	let closed = false;
	async function* stream() {
		for (;;) {
			const next = buffer.shift();
			if (next !== void 0) {
				yield next;
				continue;
			}
			if (closed) return;
			await new Promise((resolve) => {
				notify = resolve;
			});
			notify = null;
		}
	}
	return {
		emitCustomEvent(eventName, value, options) {
			if (closed) return;
			buffer.push(withTanstackMetadata({
				type: EventType.CUSTOM,
				name: eventName,
				value,
				timestamp: Date.now()
			}, {
				model: meta.model,
				...meta.threadId !== void 0 ? { threadId: meta.threadId } : {},
				...meta.runId !== void 0 ? { runId: meta.runId } : {},
				...options?.batch === true ? { batch: true } : {}
			}));
			notify?.();
		},
		close() {
			closed = true;
			notify?.();
		},
		stream: stream()
	};
}
/**
* Merge a `side` chunk stream into a `base` chunk stream, yielding from whichever
* settles first. Terminates when `base` ends (the run is over), then releases the
* side iterator — so a never-ending channel (until closed) doesn't hang the merge.
*/
async function* mergeChunkStreams(base, side) {
	const baseIt = base[Symbol.asyncIterator]();
	const sideIt = side[Symbol.asyncIterator]();
	let baseNext = baseIt.next().then((r) => ({
		from: "base",
		r
	}));
	let sideNext = sideIt.next().then((r) => ({
		from: "side",
		r
	}));
	let sideLive = true;
	try {
		for (;;) {
			const winner = await Promise.race(sideLive ? [baseNext, sideNext] : [baseNext]);
			if (winner.from === "base") {
				if (winner.r.done) return;
				yield winner.r.value;
				baseNext = baseIt.next().then((r) => ({
					from: "base",
					r
				}));
			} else if (winner.r.done) sideLive = false;
			else {
				yield winner.r.value;
				sideNext = sideIt.next().then((r) => ({
					from: "side",
					r
				}));
			}
		}
	} finally {
		const baseReturn = baseIt.return?.(void 0);
		if (baseReturn) baseReturn.catch(() => {});
		const sideReturn = sideIt.return?.(void 0);
		if (sideReturn) sideReturn.catch(() => {});
	}
}
//#endregion
export { createBridgeEventChannel, mergeChunkStreams };

//# sourceMappingURL=bridge-events.js.map