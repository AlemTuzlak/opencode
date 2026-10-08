import { chat } from '../index.js';
import { summarize } from '../../summarize/index.js';
import { generateImage } from '../../generateImage/index.js';
import { generateVideo } from '../../generateVideo/index.js';
import { generateAudio } from '../../generateAudio/index.js';
import { generateSpeech } from '../../generateSpeech/index.js';
import { generateVoice } from '../../generateVoice/index.js';
import { generateTranscription } from '../../generateTranscription/index.js';
import { generateWorld } from '../../generateWorld/index.js';
import { generateLiveVideo } from '../../generateLiveVideo/index.js';
import { embed } from '../../embed/index.js';
import { rerank } from '../../rerank/index.js';
import { decide } from '../../evaluate/index.js';
import { GenerationMiddleware } from '../../middleware/types.js';
import { AnyChatMiddleware } from '../middleware/types.js';
import { ContentPart, PromptCacheRetention, RunAgentResumeItem } from '../../../types.js';
import { DefinedAgent, SubagentRunInput } from './define-agent.js';
import { SubagentBudget } from './limits.js';
import { ProviderKeys } from '../../../byok/keyed.js';
/**
 * The fields a child `chat()` needs, in one spread:
 * `chat({ adapter, messages, ...ctx.forward })`.
 */
export interface SubagentForward {
    threadId: string;
    runId: string;
    parentRunId: string;
    subagentRunId: string;
    resume?: Array<RunAgentResumeItem>;
    /** Aborts when the parent run or the subagent group stops. */
    abortController: AbortController;
    /** The prompt cache retention of the parent call, when it has one. */
    promptCache?: PromptCacheRetention;
}
/** The steps of an agent run, as `ctx.step`. */
export interface AgentStep {
    /**
     * Run `fn` for `name`, and return its value. When a host runs a stopped
     * agent again (a harness agent started with `resume: true`), a finished
     * step returns its stored value and `fn` does not run again. Without such a
     * host, `fn` runs each time. The value must be JSON. Use a name that is the
     * same on every run.
     */
    do: <T>(name: string, fn: () => T | Promise<T>) => Promise<T>;
}
/**
 * An agent run that `ctx.agents.start` started in the background. Await it
 * for the run's result.
 */
export interface AgentRunHandle<TResult = unknown> extends PromiseLike<TResult> {
    readonly id: string;
    /**
     * Add a message to the run: `'steer'` (default) for its next model call,
     * or `'followUp'` to run the agent again after the run ends. The host
     * decides the details.
     */
    send: (message: string | Array<ContentPart>, options?: {
        mode?: 'steer' | 'followUp';
        inputId?: string;
    }) => Promise<unknown>;
    /** Stop the run. */
    cancel: () => Promise<unknown>;
}
/** `ctx.agents`: start agents in the background. A host gives it. */
export interface AgentStarter {
    /**
     * Start `agent` (a definition, or a name the host knows) in the
     * background, and return its run at once. Throws when the host refuses
     * it, for example over the subagent tree budget.
     */
    start: (agent: DefinedAgent | string, input?: unknown, options?: {
        wake?: boolean;
        attach?: 'reference' | 'none';
        resume?: boolean;
    }) => AgentRunHandle;
}
/**
 * What a host (for example a harness session) adds to every activity call an
 * agent makes through `ctx`. Apps using plain `chat({ subagents })` do not set
 * it.
 */
export interface SubagentBinding {
    /**
     * The steps the agent reads as `ctx.step`. Only this agent run gets them,
     * not the children it starts. Without them, `ctx.step.do` runs `fn` each
     * time.
     */
    step?: AgentStep;
    /**
     * What the agent reads as `ctx.agents`: it starts agents in the
     * background. Only this agent run gets it, not the children it starts in
     * a `ctx.chat({ subagents })`. Without it, `ctx.agents.start` throws.
     */
    agents?: AgentStarter;
    /**
     * Added before the call's own middleware on every `ctx.chat` call. A
     * child's `ctx.chat({ subagents })` passes it down to its own children.
     */
    chatMiddleware?: ReadonlyArray<AnyChatMiddleware>;
    /**
     * Added before the call's own middleware on every generation call. A
     * child's `ctx.chat({ subagents })` passes it down to its own children.
     */
    generationMiddleware?: ReadonlyArray<GenerationMiddleware>;
    /**
     * The subagent tree budget. A child's `ctx.chat({ subagents })` passes it
     * down, so limits hold across the whole tree.
     */
    budget?: SubagentBudget;
    /**
     * The provider keys an agent reads as `ctx.keys`. A child's
     * `ctx.chat({ subagents })` passes them down to its own children. Without
     * them, `ctx.keys` reads each provider's `env` names.
     */
    keys?: ProviderKeys;
    /**
     * The prompt cache retention of the parent call. A child's `ctx.chat()`
     * uses it when the call gives no `promptCache`.
     */
    promptCache?: PromptCacheRetention;
    /**
     * Starts a child without waiting for it and returns its id at once. The
     * single `subagent` tool calls it for `background: true`. With
     * `wake: true`, the host starts a new parent turn when the child ends. A
     * harness session sets it. It does not pass down to nested children.
     */
    start?: (call: {
        agent: string;
        input?: unknown;
        prompt?: string;
        parentToolCallId?: string;
    }, options: {
        wake: true;
    }) => Promise<{
        subagentRunId: string;
    }>;
}
/**
 * Activity functions bound to one child run. Each takes the same options as
 * the plain function. Options you pass win over the bound defaults.
 */
export interface BoundActivities {
    chat: typeof chat;
    summarize: typeof summarize;
    generateImage: typeof generateImage;
    generateVideo: typeof generateVideo;
    generateAudio: typeof generateAudio;
    generateSpeech: typeof generateSpeech;
    generateVoice: typeof generateVoice;
    generateTranscription: typeof generateTranscription;
    generateWorld: typeof generateWorld;
    generateLiveVideo: typeof generateLiveVideo;
    embed: typeof embed;
    rerank: typeof rerank;
    decide: typeof decide;
}
export declare function createBoundActivities(agentName: string, input: SubagentRunInput, abortController: AbortController, binding?: SubagentBinding): {
    chat: typeof chat;
    summarize: typeof summarize;
    generateImage: typeof generateImage;
    generateVideo: typeof generateVideo;
    generateAudio: typeof generateAudio;
    generateSpeech: typeof generateSpeech;
    generateVoice: typeof generateVoice;
    generateTranscription: typeof generateTranscription;
    generateWorld: typeof generateWorld;
    generateLiveVideo: typeof generateLiveVideo;
    embed: typeof embed;
    rerank: typeof rerank;
    decide: typeof decide;
};
