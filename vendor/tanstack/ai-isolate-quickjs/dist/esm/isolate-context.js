import { TIMEOUT_ERROR, isFatalQuickJSLimitError, normalizeError } from "./error-normalizer.js";
import { wrapCode } from "@tanstack/ai-code-mode";
//#region src/isolate-context.ts
/** Grace window for cancellation continuations after a timeout. */
var CANCEL_GRACE_MS = 100;
/**
* Await the guest program's promise, but give up at `deadline`. Host tool
* calls are bridged as QuickJS promises, so a guest program that is stuck
* waiting (e.g. its continuation was interrupted) would otherwise never
* settle. A timeout is terminal for the context (see `fail()` in execute):
* the timed-out program's interrupted jobs stay queued in the VM and must
* never run inside a later execution. If the guest settles after the
* deadline, its result handle is disposed to avoid leaking it into the
* context's lifetime.
*/
function awaitWithDeadline(promise, deadline) {
	return new Promise((resolve, reject) => {
		let timedOut = false;
		const timer = setTimeout(() => {
			timedOut = true;
			const timeoutError = /* @__PURE__ */ new Error("Code execution timed out");
			timeoutError.name = TIMEOUT_ERROR;
			reject(timeoutError);
		}, Math.max(0, deadline - Date.now()));
		promise.then((result) => {
			if (timedOut) {
				try {
					if ("error" in result && result.error) result.error.dispose();
					else result.value.dispose();
				} catch {}
				return;
			}
			clearTimeout(timer);
			resolve(result);
		}, (error) => {
			if (timedOut) return;
			clearTimeout(timer);
			reject(error);
		});
	});
}
/**
* IsolateContext implementation using QuickJS WASM
*/
var QuickJSIsolateContext = class {
	vm;
	logs;
	timeout;
	execState;
	/** Serializes execute() calls so evaluations on this VM never interleave. */
	execQueue = Promise.resolve();
	disposed = false;
	executing = false;
	constructor(vm, logs, timeout, execState) {
		this.vm = vm;
		this.logs = logs;
		this.timeout = timeout;
		this.execState = execState;
	}
	async execute(code) {
		if (this.disposed) return {
			success: false,
			error: {
				name: "DisposedError",
				message: "Context has been disposed"
			},
			logs: []
		};
		let resolve;
		const myTurn = new Promise((r) => {
			resolve = r;
		});
		const waitForPrev = this.execQueue;
		this.execQueue = myTurn;
		await waitForPrev;
		if (this.disposed) {
			resolve();
			return {
				success: false,
				error: {
					name: "DisposedError",
					message: "Context has been disposed"
				},
				logs: []
			};
		}
		this.executing = true;
		this.logs.length = 0;
		let guestSettled = true;
		const releaseVmAfterFatalError = async () => {
			if (this.disposed) return;
			try {
				this.vm.runtime.setInterruptHandler(() => false);
			} catch {}
			this.disposed = true;
			for (const cancel of [...this.execState.pendingCancels]) cancel();
			this.execState.pendingCancels.clear();
			await new Promise((r) => setTimeout(r, 0));
			this.vm.dispose();
		};
		const releaseAfterUnsettledExecution = async () => {
			if (this.disposed) return;
			this.disposed = true;
			this.execState.deadline = Date.now() + CANCEL_GRACE_MS;
			for (const cancel of [...this.execState.pendingCancels]) cancel();
			this.execState.pendingCancels.clear();
			await new Promise((r) => setTimeout(r, 0));
			this.execState.deadline = 0;
			if (guestSettled) this.vm.dispose();
		};
		const fail = async (error, cleanup = "reusable") => {
			const normalized = normalizeError(error);
			if (normalized.name === "TimeoutError") await releaseAfterUnsettledExecution();
			else if (isFatalQuickJSLimitError(normalized)) await releaseVmAfterFatalError();
			else if (cleanup === "terminal") await releaseAfterUnsettledExecution();
			return {
				success: false,
				error: normalized,
				logs: [...this.logs]
			};
		};
		try {
			const wrappedCode = wrapCode(code);
			const deadline = Date.now() + this.timeout;
			this.execState.deadline = deadline;
			try {
				const result = this.vm.evalCode(wrappedCode);
				let parsedResult;
				try {
					const promiseHandle = this.vm.unwrapResult(result);
					const nativePromise = this.vm.resolvePromise(promiseHandle);
					promiseHandle.dispose();
					guestSettled = false;
					nativePromise.then(() => {
						guestSettled = true;
					}, () => {
						guestSettled = true;
					});
					const jobs = this.vm.runtime.executePendingJobs();
					if (jobs.error) {
						const dumped = this.vm.dump(jobs.error);
						jobs.error.dispose();
						return await fail(dumped, "terminal");
					}
					const resolvedResult = await awaitWithDeadline(nativePromise, deadline);
					const valueHandle = this.vm.unwrapResult(resolvedResult);
					const dumpedResult = this.vm.dump(valueHandle);
					valueHandle.dispose();
					if (typeof dumpedResult === "string") try {
						parsedResult = JSON.parse(dumpedResult);
					} catch {
						parsedResult = dumpedResult;
					}
					else parsedResult = dumpedResult;
					return {
						success: true,
						value: parsedResult,
						logs: [...this.logs]
					};
				} catch (unwrapError) {
					return await fail(unwrapError);
				}
			} finally {
				if (!this.disposed) this.execState.deadline = 0;
			}
		} catch (error) {
			return await fail(error);
		} finally {
			this.executing = false;
			resolve();
		}
	}
	async dispose() {
		if (this.disposed) return;
		if (this.executing) {
			await this.execQueue;
			if (this.disposed) return;
		}
		this.disposed = true;
		if (this.execState.pendingCancels.size > 0) {
			this.execState.deadline = Date.now() + CANCEL_GRACE_MS;
			for (const cancel of [...this.execState.pendingCancels]) cancel();
			this.execState.pendingCancels.clear();
			await new Promise((r) => setTimeout(r, 0));
			this.execState.deadline = 0;
		}
		this.vm.dispose();
	}
};
//#endregion
export { QuickJSIsolateContext };

//# sourceMappingURL=isolate-context.js.map