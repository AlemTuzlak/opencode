import { AnyTextAdapter, KeyedAdapter, ModelMessage } from '@tanstack/ai';
export declare function textOf(message: ModelMessage): string;
/** One `role: text` line per message. Messages with no text are left out. */
export declare function transcriptText(messages: ReadonlyArray<ModelMessage>): string;
/**
 * `/compact`: replace a long transcript with a summary, so later turns send
 * fewer tokens. The summary is written by `adapter`. A `keyedAdapter(...)`
 * is built with the user's key when `/compact` runs.
 */
export declare function compact(options: {
    adapter: AnyTextAdapter | KeyedAdapter<AnyTextAdapter>;
    keepLast?: number;
}): import('..').HarnessPlugin<{
    readonly name: "tanstack/compact";
    readonly setup: (ctx: import('..').PluginSetupContext) => {
        commands: {
            compact: import('..').CommandDefinition<any>;
        };
    };
}>;
/** Prices in USD per 1M tokens: the `cost` of an `@tanstack/ai-models` record. */
interface ModelPrices {
    input: number;
    output: number;
    cacheRead?: number;
    cacheWrite?: number;
}
/**
 * Show the token usage of the session (`session.usage()`): the lead turn and
 * every agent run (subagents, background agents, and their children).
 * `/usage` shows the totals, with the input tokens read from and written to
 * the prompt cache, and a line for each model when there is more than one.
 * The plugin state, for a UI, has a copy of `session.usage().total` and
 * `contextTokens`, the size of the lead model's context at its latest call.
 *
 * A model call that has a cost from its provider keeps that cost. With
 * `model`, the plugin also prices the calls that have no provider cost.
 * `model` gets the model id and returns its prices in USD per 1M tokens, or
 * `undefined` when it does not know the model. `/usage` shows the cost when
 * a call has one, and says how many calls it could not price. When a call
 * has a cost, the plugin writes the cost to `usage.cost` of the session
 * index entry.
 *
 * @example
 * ```ts
 * import { getModel } from '@tanstack/ai-models'
 *
 * plugins: () => [usage({ model: (id) => getModel('anthropic', id) })]
 * ```
 */
export declare function usage(options?: {
    model?: (modelId: string) => {
        cost: ModelPrices;
    } | undefined;
}): import('..').HarnessPlugin<{
    readonly name: "tanstack/usage";
    readonly setup: (ctx: import('..').PluginSetupContext) => {
        middleware: {
            onUsage: (_run: import('@tanstack/ai').ChatMiddlewareContext<any>, info: import('@tanstack/ai').UsageInfo) => Promise<void>;
            name: string;
            onFinish: () => Promise<void>;
            onAbort: () => Promise<void>;
            onError: () => Promise<void>;
        }[];
        agentMiddleware: {
            name: string;
            onFinish: () => Promise<void>;
            onAbort: () => Promise<void>;
            onError: () => Promise<void>;
        }[];
        commands: {
            usage: import('..').CommandDefinition<any>;
        };
    };
}>;
export {};
