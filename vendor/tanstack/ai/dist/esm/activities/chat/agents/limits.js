//#region src/activities/chat/agents/limits.ts
/** The shared budget of one subagent tree. */
var SubagentBudget = class SubagentBudget {
	limits;
	depth;
	shared;
	deadline;
	constructor(limits, depth, shared, deadline) {
		this.limits = limits;
		this.depth = depth;
		this.shared = shared;
		this.deadline = deadline;
	}
	/** A budget for a root run. */
	static root(limits = {}) {
		return new SubagentBudget(limits, 0, { calls: 0 }, void 0);
	}
	/** How many children the tree started so far. */
	get calls() {
		return this.shared.calls;
	}
	/**
	* Reserve one child spawn. Returns the refusal message the model sees, or
	* `undefined` when the child may start. `active` is how many children this
	* run has running now.
	*/
	reserve(active) {
		const { maxDepth, maxCalls, maxConcurrent } = this.limits;
		if (maxDepth !== void 0 && this.depth + 1 > maxDepth) return `subagent limit reached (maxDepth ${maxDepth})`;
		if (maxCalls !== void 0 && this.shared.calls >= maxCalls) return `subagent limit reached (maxCalls ${maxCalls})`;
		if (maxConcurrent !== void 0 && active >= maxConcurrent) return `subagent limit reached (maxConcurrent ${maxConcurrent})`;
		this.shared.calls += 1;
	}
	/** Milliseconds a child started now may run, or `undefined` for no limit. */
	childTimeout(now = Date.now()) {
		const own = this.limits.timeoutMs;
		const remaining = this.deadline === void 0 ? void 0 : Math.max(0, this.deadline - now);
		if (own === void 0) return remaining;
		return remaining === void 0 ? own : Math.min(own, remaining);
	}
	/** The budget a child's own subagents use: one level deeper, same counters. */
	child(deadline) {
		return new SubagentBudget(this.limits, this.depth + 1, this.shared, deadline ?? this.deadline);
	}
};
//#endregion
export { SubagentBudget };

//# sourceMappingURL=limits.js.map