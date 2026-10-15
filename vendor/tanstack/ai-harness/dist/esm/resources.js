//#region src/resources.ts
/**
* Resources one plugin owns for one lifetime (a session or a turn).
*
* - `acquire(open, close)` registers `close` only after `open` succeeds.
* - If the scope closes while `open` is still running, the late resource is
*   closed as soon as it arrives.
* - `dispose()` closes resources newest first, runs every closer even when
*   one throws, and returns the same promise to every caller.
*/
var ResourceScope = class {
	controller = new AbortController();
	signal = this.controller.signal;
	closers = [];
	pending = /* @__PURE__ */ new Set();
	closing;
	closed = false;
	async acquire(open, close) {
		this.signal.throwIfAborted();
		let release;
		const pending = new Promise((resolve) => {
			release = resolve;
		});
		this.pending.add(pending);
		try {
			const resource = await open();
			if (this.closed) {
				await close(resource);
				throw this.signal.reason;
			}
			this.closers.push(() => close(resource));
			return resource;
		} finally {
			this.pending.delete(pending);
			release();
		}
	}
	dispose() {
		if (this.closing) return this.closing;
		this.closed = true;
		this.controller.abort(/* @__PURE__ */ new Error("Resource scope disposed"));
		this.closing = Promise.resolve().then(async () => {
			await Promise.all(this.pending);
			const errors = [];
			for (const close of this.closers.reverse()) try {
				await close();
			} catch (error) {
				errors.push(error);
			}
			this.closers.length = 0;
			if (errors.length > 0) throw new AggregateError(errors, "Resource cleanup failed");
		});
		return this.closing;
	}
};
/**
* Dispose scopes newest first. Every scope is disposed even when one fails.
* Throws an `AggregateError` with every failure, after all scopes ran.
*/
async function disposeAll(scopes) {
	const errors = [];
	for (const scope of [...scopes].reverse()) try {
		await scope.dispose();
	} catch (error) {
		errors.push(error);
	}
	if (errors.length > 0) throw new AggregateError(errors, "Plugin cleanup failed");
}
//#endregion
export { ResourceScope, disposeAll };

//# sourceMappingURL=resources.js.map