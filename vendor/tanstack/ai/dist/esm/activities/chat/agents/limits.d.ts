/**
 * Limits for a whole subagent tree. The root run makes one budget, and every
 * child shares it, so a child cannot reset it.
 */
export interface SubagentLimits {
    /** How deep the tree may grow. The root run is depth 0. */
    maxDepth?: number;
    /** How many children one run may have running at once. */
    maxConcurrent?: number;
    /** How many children the whole tree may start. */
    maxCalls?: number;
    /** How long one child may run. Never later than its parent's own deadline. */
    timeoutMs?: number;
}
/** The shared budget of one subagent tree. */
export declare class SubagentBudget {
    readonly limits: SubagentLimits;
    /** The depth of the run that owns this budget view. */
    readonly depth: number;
    private readonly shared;
    /** Epoch ms after which this run's children must stop, if any. */
    readonly deadline: number | undefined;
    private constructor();
    /** A budget for a root run. */
    static root(limits?: SubagentLimits): SubagentBudget;
    /** How many children the tree started so far. */
    get calls(): number;
    /**
     * Reserve one child spawn. Returns the refusal message the model sees, or
     * `undefined` when the child may start. `active` is how many children this
     * run has running now.
     */
    reserve(active: number): string | undefined;
    /** Milliseconds a child started now may run, or `undefined` for no limit. */
    childTimeout(now?: number): number | undefined;
    /** The budget a child's own subagents use: one level deeper, same counters. */
    child(deadline?: number): SubagentBudget;
}
