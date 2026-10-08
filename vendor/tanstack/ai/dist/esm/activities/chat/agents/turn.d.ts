import { ModelMessage, RunAgentResumeItem, SubagentStatus, UIMessage } from '../../../types.js';
type AnyMessage = UIMessage | ModelMessage;
export interface SubagentTurnChild {
    subagentRunId: string;
    name: string;
    status: SubagentStatus;
    parentToolCallId?: string;
    /** The child's own messages from the earlier run. */
    messages: Array<AnyMessage>;
    /** Text the child wrote. */
    text: string;
    /** Resume entries for this child and its nested children. */
    resume: Array<RunAgentResumeItem>;
}
/** The interrupted turn that a resume continues. */
export interface SubagentTurn {
    /**
     * Messages up to and including the last top-level user message. Child wire
     * messages do not count.
     */
    before: Array<AnyMessage>;
    /** Direct children of the parent in that turn. */
    children: Array<SubagentTurnChild>;
    /** Resume entries that no child owns. They belong to the parent run. */
    rest: Array<RunAgentResumeItem>;
    /** The router plan of the earlier run, from the children's metadata. */
    plan?: unknown;
}
/** Key of the router plan in `SUBAGENT_STARTED` metadata (`metadata.tanstack`). */
export declare const SUBAGENT_PLAN_KEY = "subagentPlan";
/**
 * Find the children of the trailing assistant turn that `resume` answers.
 * Returns undefined when no child owns a resume entry.
 */
export declare function readSubagentTurn(messages: ReadonlyArray<AnyMessage>, resume: ReadonlyArray<RunAgentResumeItem> | undefined): SubagentTurn | undefined;
export {};
