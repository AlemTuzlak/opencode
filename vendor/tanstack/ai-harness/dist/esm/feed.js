//#region src/feed.ts
var MAX_EVENTS = 1e4;
/**
* The in-memory {@link EventFeed}. Cursors are opaque to callers and increase
* with each event.
*/
var SessionFeed = class {
	entries = [];
	sequence = 0;
	waiters = /* @__PURE__ */ new Set();
	closed = false;
	publish(operationId, event) {
		this.sequence += 1;
		this.entries.push({
			cursor: String(this.sequence),
			operationId,
			event
		});
		if (this.entries.length > MAX_EVENTS) this.entries.shift();
		this.wake();
	}
	head() {
		return String(this.sequence);
	}
	async *read(options) {
		let after = Number(options.from ?? "0");
		if (!Number.isFinite(after)) after = 0;
		while (true) {
			if (options.signal?.aborted) return;
			const next = this.entries.filter((entry) => Number(entry.cursor) > after && (options.filter ? options.filter(entry) : true));
			for (const entry of next) {
				if (options.signal?.aborted) return;
				after = Number(entry.cursor);
				yield entry;
			}
			if (next.length === 0) after = Math.max(after, this.sequence);
			if (this.closed || options.until?.()) {
				const rest = this.entries.filter((entry) => Number(entry.cursor) > after && (options.filter ? options.filter(entry) : true));
				for (const entry of rest) yield entry;
				return;
			}
			if (next.length > 0) continue;
			await this.waitForNext(options.signal);
		}
	}
	close() {
		this.closed = true;
		this.wake();
	}
	wake() {
		const waiters = [...this.waiters];
		this.waiters.clear();
		for (const wake of waiters) wake();
	}
	waitForNext(signal) {
		return new Promise((resolve) => {
			if (signal?.aborted) return resolve();
			const done = () => {
				signal?.removeEventListener("abort", done);
				this.waiters.delete(done);
				resolve();
			};
			this.waiters.add(done);
			signal?.addEventListener("abort", done, { once: true });
		});
	}
};
//#endregion
export { SessionFeed };

//# sourceMappingURL=feed.js.map