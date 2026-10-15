//#region src/turn.ts
var TRANSIENT_ERROR = /overloaded|rate.?limit|too many requests|\b(?:429|500|502|503|504)\b|service.?unavailable|server.?error|network.?error|connection.?(?:reset|refused|lost|error)|socket hang up|fetch failed|timed? out|timeout|terminated|provider finish_reason:\s*error(?![-\w])/i;
/**
* True for a model error that can pass when you try again: overloaded, rate
* limits, 429 and 5xx, network and connection errors, timeouts, and a
* provider `finish_reason: error`.
*/
function isTransientModelError(error) {
	return TRANSIENT_ERROR.test(error.message) || error.code !== void 0 && TRANSIENT_ERROR.test(error.code);
}
/** Resolve after `ms`, or at once when `signal` aborts. */
function wait(ms, signal) {
	return new Promise((resolve) => {
		if (signal.aborted) return resolve();
		const done = () => {
			clearTimeout(timer);
			signal.removeEventListener("abort", done);
			resolve();
		};
		const timer = setTimeout(done, ms);
		signal.addEventListener("abort", done, { once: true });
	});
}
/**
* A `turn.onModelError` policy: retry a transient model error after a
* backoff of `baseDelayMs * 2^retries`, times a jitter from 0.75 to 1.0.
* When the error has a `retryAfterMs`, it waits that long instead. Above
* `maxRetryAfterMs`, it does not retry. It answers `'continue'` when the
* failed call streamed output, so the model continues it, and `'retry'`
* otherwise.
*
* @example
* ```ts
* defineHarness({ ..., turn: { onModelError: retryTransientErrors() } })
* ```
*/
function retryTransientErrors(options = {}) {
	const maxRetries = options.maxRetries ?? 3;
	const baseDelayMs = options.baseDelayMs ?? 2e3;
	const isTransient = options.isTransient ?? isTransientModelError;
	const maxRetryAfterMs = options.maxRetryAfterMs ?? 9e5;
	return async (ctx) => {
		if (ctx.retries >= maxRetries || !isTransient(ctx.error)) return void 0;
		const { retryAfterMs } = ctx.error;
		if (retryAfterMs !== void 0 && retryAfterMs > maxRetryAfterMs) return;
		const jitter = .75 + Math.random() * .25;
		await wait(retryAfterMs ?? Math.round(baseDelayMs * 2 ** ctx.retries * jitter), ctx.signal);
		if (ctx.signal.aborted) return void 0;
		return ctx.partial ? "continue" : "retry";
	};
}
//#endregion
export { isTransientModelError, retryTransientErrors };

//# sourceMappingURL=turn.js.map