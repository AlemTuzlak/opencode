import { AnyTextAdapter, KeyedAdapter } from '@tanstack/ai';
import { SessionViewState } from '../view/types.js';
/** The goal of a session. It is plugin state, so it survives restarts. */
export interface Goal {
    text: string;
    status: 'active' | 'paused' | 'met' | 'stopped';
    /** The turns the plugin started for this goal. */
    round: number;
    /** The reason of the last check. */
    reason: string;
    /** Why the goal paused or stopped. Empty while it is active or met. */
    note: string;
    /** The message of the turn that the plugin queued, until that turn starts. */
    queued: string;
}
/** Sent when the judge says that the goal is met. */
export declare const GoalMet: import('..').PluginEvent<{
    goal: string;
    reason: string;
}>;
/** The goal of the session a view shows, or `null` when there is none. */
export declare function selectGoal(state: SessionViewState): Goal | null;
/**
 * Keep the harness working until a goal is met. `/goal <text>` starts the
 * goal. After each turn, `judge` reads the goal and the end of the transcript
 * and decides if the goal is met. If it is not, the plugin starts the next
 * turn, up to `maxRounds` turns (default 20).
 *
 * The loop stops when the goal is met, at the round limit, when a turn waits
 * for approval or fails, and when the user sends a message. `/goal` shows the
 * goal, `/goal stop` ends it, and `/goal resume` continues it. A
 * `keyedAdapter(...)` judge is built with the user's key for each check.
 *
 * @example
 * ```ts
 * plugins: () => [goal({ judge: openaiText('gpt-5.6-luna') })]
 * ```
 */
export declare function goal(options: {
    judge: AnyTextAdapter | KeyedAdapter<AnyTextAdapter>;
    maxRounds?: number;
}): import('..').HarnessPlugin<{
    readonly name: "tanstack/goal";
    readonly setup: (ctx: import('..').PluginSetupContext) => Promise<{
        prompts: {
            id: string;
            text: () => string;
        }[];
        commands: {
            goal: import('..').CommandDefinition<any>;
        };
        middleware: {
            name: string;
            onConfig: (run: import('@tanstack/ai').ChatMiddlewareContext<any>, config: import('@tanstack/ai').ChatMiddlewareConfig) => Promise<void>;
            onChunk: (run: import('@tanstack/ai').ChatMiddlewareContext<any>, chunk: import('@tanstack/ai').AGUIEvent) => Promise<void>;
            onError: (run: import('@tanstack/ai').ChatMiddlewareContext<any>) => Promise<void>;
            onAbort: (run: import('@tanstack/ai').ChatMiddlewareContext<any>) => Promise<void>;
            onFinish: (run: import('@tanstack/ai').ChatMiddlewareContext<any>) => Promise<void>;
        }[];
    }>;
}>;
