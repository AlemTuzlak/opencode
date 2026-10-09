import { EventType, InferSchemaType, Interrupt, ModelMessage, RunAgentResumeItem, StreamChunk, TokenUsage, Tool, UIMessage } from '../../../types.js';
import { LoadChild } from '../middleware/load-child.js';
import { SpecTokenUsage } from '../../../utilities/ag-ui-usage.js';
import { SubagentBinding } from './bound.js';
import { SubagentLimits } from './limits.js';
import { DefinedAgent, SubagentRunContext, SubagentRunInput } from './define-agent.js';
import { ChatMiddleware } from '../middleware/types.js';
import { SubagentTurn } from './turn.js';
export declare const SUBAGENT_STARTED = EventType.SUBAGENT_STARTED;
export declare const SUBAGENT_FINISHED = EventType.SUBAGENT_FINISHED;
export declare const SUBAGENT_ERROR = EventType.SUBAGENT_ERROR;
export type SubagentOrder = 'parallel' | 'sequence';
/**
 * One agent in a router pick: its name, or its name and its input. An agent
 * with `inputSchema` needs `{ name, input }`. The input is checked against
 * the schema, and `run` reads it as `ctx.input`.
 */
export type SubagentPickName = string | {
    name: string;
    input?: unknown;
};
export interface SubagentRouterPlan {
    names: ReadonlyArray<SubagentPickName>;
    /** Overrides `subagents.order` for this turn. */
    order?: SubagentOrder;
}
export interface SubagentStep {
    names: ReadonlyArray<SubagentPickName>;
    /** Overrides `subagents.order` for this step. */
    order?: SubagentOrder;
}
export interface SubagentStepsPlan {
    steps: ReadonlyArray<SubagentStep>;
}
export type SubagentRouterPick = 'main' | SubagentPickName | ReadonlyArray<SubagentPickName> | SubagentRouterPlan | SubagentStepsPlan;
/**
 * A router pick after `normalizeRouterPick`. Each step has plain names, and
 * `inputs` holds the raw input of each name that has one. This is the plan
 * on `SUBAGENT_STARTED` metadata.
 */
export interface RoutedPlan {
    steps: ReadonlyArray<{
        names: ReadonlyArray<string>;
        inputs?: Record<string, unknown>;
        order?: SubagentOrder;
    }>;
}
export interface SubagentsBag<TAgents extends ReadonlyArray<DefinedAgent> = ReadonlyArray<DefinedAgent>> {
    agents: TAgents;
    router?: (ctx: {
        messages: SubagentRunContext['messages'];
        agents: NoInfer<TAgents>;
        abortSignal?: AbortSignal;
    }) => SubagentRouterPick | Promise<SubagentRouterPick>;
    strategy?: 'exclusive' | 'handoff';
    /**
     * How a router list runs. `parallel` starts every name together.
     * `sequence` runs each name after the previous one finishes, and passes
     * that child's text to the next child.
     */
    order?: 'parallel' | 'sequence';
    sandbox?: 'own' | 'inherit';
    /**
     * Limits for the whole tree of children the model starts through tools:
     * depth, total calls, children at once, and time per child. A refused
     * start returns to the model as a tool error.
     */
    limits?: SubagentLimits;
    /**
     * What a host adds to every activity call a child makes through `ctx`
     * (`ctx.chat`, `ctx.generateImage`, and the rest). A harness session sets
     * it. Apps do not.
     */
    binding?: SubagentBinding;
    /**
     * The tools the parent model gets. `per-agent` (the default) gives one tool
     * per agent, with the agent's name. `single` gives one tool named
     * `subagent`. It takes the agent name, plus `sessionId` to continue a
     * stored child and `background` to start a child without waiting.
     */
    tool?: 'per-agent' | 'single';
}
/** The name of the one tool in `subagents: { tool: 'single' }`. */
export declare const SINGLE_SUBAGENT_TOOL = "subagent";
/** Fields every call of the single `subagent` tool can add. */
interface SubagentCallOptions {
    /** The `subagentRunId` of a stored, finished child. The call continues it. */
    sessionId?: string;
    /** Start the child and return at once. Needs a harness host. */
    background?: boolean;
}
/** One agent's call: `input` for an agent with `inputSchema`, else `prompt`. */
type SubagentCallFor<TAgent extends DefinedAgent> = TAgent extends DefinedAgent ? ([NonNullable<TAgent['inputSchema']>] extends [never] ? {
    agent: TAgent['name'];
    prompt?: string;
} : {
    agent: TAgent['name'];
    input: InferSchemaType<NonNullable<TAgent['inputSchema']>>;
}) & SubagentCallOptions : never;
/**
 * The input of the single `subagent` tool (`subagents: { tool: 'single' }`).
 * A union on `agent`: an agent with an `inputSchema` needs `input`, and an
 * agent without one takes an optional `prompt`.
 */
export type SubagentToolInput<TAgents extends ReadonlyArray<DefinedAgent>> = SubagentCallFor<TAgents[number]>;
/** What the children of one parent run left behind for the parent terminal. */
export interface SubagentSink {
    interrupts: Array<Interrupt>;
    /** One AG-UI entry per child model call. */
    usage: Array<SpecTokenUsage>;
    /** Summed full usage of the children, including cost. */
    total?: TokenUsage;
}
export declare function createSubagentSink(): SubagentSink;
/** One child to start, or a suspended child to continue. */
export interface SpawnEntry {
    name: string;
    /** The checked input of an agent with `inputSchema`, from a tool or a router. */
    input?: unknown;
    /** Text for an agent without `inputSchema`. One user message at the end. */
    prompt?: string;
    /** A stored, finished child to run again from its transcript. */
    continued?: {
        subagentRunId: string;
        messages: Array<UIMessage | ModelMessage>;
    };
    resume?: {
        subagentRunId: string;
        /** The child's own messages from the interrupted run. */
        messages: Array<UIMessage | ModelMessage>;
        entries: Array<RunAgentResumeItem>;
        /** Text the child wrote before it stopped. */
        text: string;
    };
}
interface SpawnContext {
    messages: SubagentRunContext['messages'];
    abortSignal?: AbortSignal;
    threadId: string;
    /** The parent chat run. */
    parentRunId: string;
    /** The interrupted parent run, on a resume. */
    interruptedRunId?: string;
    /** The parent chat's own subagentRunId, when that chat is a child too. */
    parentSubagentRunId?: string;
}
export declare function createSubagentId(): string;
/**
 * Bind child interrupts to the parent run. The client resumes the parent run,
 * so each binding must name that run. The resumed child then validates with
 * the parent's interrupted run id.
 */
export declare function rebindInterrupts(interrupts: ReadonlyArray<Interrupt>, runId: string): Array<Interrupt>;
export declare function normalizeRouterPick(pick: SubagentRouterPick, agents: ReadonlyArray<DefinedAgent>): {
    steps: ({
        names: string[];
        inputs?: undefined;
    } | {
        names: string[];
        inputs: Record<string, unknown>;
    })[];
};
/** Add a finished child run's usage to the sink. */
export declare function collectUsage(sink: SubagentSink, finished?: StreamChunk): void;
/** A parent run's last chunk: it completed, or it failed. */
type ParentTerminal = Extract<StreamChunk, {
    type: 'RUN_FINISHED' | 'RUN_ERROR';
}>;
/**
 * Put the children's usage on a parent terminal. `usage[]` keeps one entry per
 * model call. `metadata.tanstack.usage` holds the summed cost and the other
 * TanStack fields, so `fromSpecTokenUsage` reads the full total. Empties the
 * sink, so the next parent terminal does not count it again.
 *
 * `RUN_ERROR` is accepted too: a turn that failed still spent whatever its
 * children spent. Such a chunk carries no usage of its own, so `runUsage` and
 * `fullUsage` return empty for it and the children's total stands alone.
 */
export declare function withChildUsage(chunk: ParentTerminal, sink: SubagentSink): ParentTerminal;
export declare function spawnAgentStream(agent: DefinedAgent, input: SubagentRunInput, sink?: SubagentSink, parentToolCallId?: string, binding?: SubagentBinding): AsyncIterable<StreamChunk>;
export declare function spawnNamedAgents(entries: ReadonlyArray<SpawnEntry>, bag: SubagentsBag, ctx: SpawnContext, sink?: SubagentSink): AsyncGenerator<import('../../..').AGUIEvent, void, any>;
/**
 * Text of the named direct children, in `names` order. Text from nested
 * children stays out: their chunks carry their own id.
 */
export declare function collectNamedText(chunks: Array<StreamChunk>, names: ReadonlyArray<string>): string;
/**
 * Record the parent messages when the model calls a subagent tool, so the
 * child reads the conversation as it is at that call. Also read the run's
 * `loadChild` service, so a call can continue a stored child.
 */
export declare function subagentCallMessages(names: ReadonlySet<string>): {
    middleware: ChatMiddleware<unknown, never>;
    messagesFor: (toolCallId: string | undefined) => ModelMessage<string | import('../../..').ContentPart<unknown, unknown, unknown, unknown, unknown>[] | null>[] | undefined;
    childLoader: () => LoadChild | undefined;
};
export declare function createSyntheticSubagentTools(bag: SubagentsBag, parent: {
    /** Messages the parent run started with. Used when no call was recorded. */
    messages: SubagentRunContext['messages'];
    /** The parent messages at a tool call. See subagentCallMessages. */
    messagesFor?: (toolCallId: string | undefined) => SubagentRunContext['messages'] | undefined;
    threadId: string;
    runId: string;
    interruptedRunId?: string;
    /** The parent chat's own subagentRunId, when that chat is a child too. */
    parentSubagentRunId?: string;
    abortSignal?: AbortSignal;
    turn?: SubagentTurn;
    sink: SubagentSink;
    /** The run's `loadChild` service. See subagentCallMessages. */
    childLoader?: () => LoadChild | undefined;
}): Array<Tool>;
export {};
