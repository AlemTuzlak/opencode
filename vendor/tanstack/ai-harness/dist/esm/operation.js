//#region src/operation.ts
var counter = 0;
/** A new operation id. It is also the AG-UI `runId` of the operation. */
function createOperationId(kind) {
	counter += 1;
	return `op-${kind}-${Date.now().toString(36)}-${counter}`;
}
var TERMINAL = /* @__PURE__ */ new Set([
	"completed",
	"failed",
	"cancelled",
	"interrupted"
]);
/** The session-side implementation of {@link Operation}. */
var OperationImpl = class {
	kind;
	feed;
	onCancel;
	agent;
	id;
	/** The feed head when the operation was made. Its events come after it. */
	startedCursor;
	abortController = new AbortController();
	receipt;
	current = "accepted";
	settled;
	resolveResult;
	rejectResult;
	settleReceipt;
	constructor(kind, feed, onCancel, agent, id) {
		this.kind = kind;
		this.feed = feed;
		this.onCancel = onCancel;
		this.agent = agent;
		this.id = id ?? createOperationId(kind);
		this.startedCursor = feed.head();
		this.receipt = new Promise((resolve) => {
			this.settleReceipt = resolve;
		});
		this.settled = new Promise((resolve, reject) => {
			this.resolveResult = resolve;
			this.rejectResult = reject;
		});
		this.settled.catch(() => {});
	}
	then(onfulfilled, onrejected) {
		return this.settled.then(onfulfilled, onrejected);
	}
	status() {
		return this.current;
	}
	isSettled() {
		return TERMINAL.has(this.current);
	}
	setStatus(status) {
		this.current = status;
	}
	publish(event) {
		this.feed.publish(this.id, event);
	}
	/** Answer `receipt`. The first answer wins. */
	resolveReceipt(receipt) {
		this.settleReceipt(receipt);
	}
	finish(status, result) {
		this.current = status;
		this.resolveResult(result);
	}
	fail(status, error) {
		this.current = status;
		this.rejectResult(error);
	}
	events(options) {
		return this.feed.read({
			...options,
			filter: (entry) => entry.operationId === this.id,
			until: () => this.isSettled()
		});
	}
	async *stream(options) {
		for await (const entry of this.events({
			from: "0",
			...options
		})) yield entry.event;
	}
	cancel(_reason) {
		return this.onCancel(this);
	}
};
//#endregion
export { OperationImpl, createOperationId };

//# sourceMappingURL=operation.js.map