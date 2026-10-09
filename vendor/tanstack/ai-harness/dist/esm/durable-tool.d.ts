import { AnyTool, ApprovalSchemaConfig, InferSchemaType, SchemaInput, ToolDefinition, ToolExecutionContext } from '@tanstack/ai';
import { LogRecord } from '@tanstack/ai-persistence';
/** The durable steps of one tool call. */
export interface ToolStep {
    /**
     * Run `fn` once for `name` in this tool call, and store its value in the
     * session log before `do` resolves. When a crash makes the harness run the
     * call again, a stored step returns its value and `fn` does not run again.
     *
     * A step is stored once and runs at least once: a crash after `fn` ends but
     * before the value is stored runs `fn` again. The value must be JSON. Use a
     * name that is the same on every run (for example `charge:${orderId}`).
     * The same name twice in one call throws.
     */
    do: <T>(name: string, fn: () => T | Promise<T>) => Promise<T>;
}
/** What the `execute` of a {@link durableTool} gets. */
export type DurableToolContext<TContext = unknown> = ToolExecutionContext<TContext> & {
    step: ToolStep;
    /**
     * Add host records to the session log with this tool batch. They land in
     * the same append as the batch's transcript commit. If the batch never
     * commits (a crash), the records never happened.
     */
    append: (records: ReadonlyArray<LogRecord>) => void;
};
type DurableExecute = (args: unknown, context: DurableToolContext) => unknown;
/**
 * The key that keeps the durable `execute` on a tool. An own enumerable
 * symbol key, so `{ ...tool }` in a plugin keeps it.
 *
 * @internal
 */
export declare const DURABLE_EXECUTE: unique symbol;
/** @internal Steps over `recorded` values, stored with `record`. */
export declare function createToolStep(options: {
    recorded: (name: string) => {
        found: true;
        value: unknown;
    } | {
        found: false;
    };
    record: (name: string, value: unknown) => Promise<void>;
}): {
    do: <T>(name: string, fn: () => T | Promise<T>) => Promise<T>;
};
/** Options for {@link durableTool}. */
export interface DurableToolOptions {
    /**
     * What the harness does with a call that a crash cut:
     * - `'safe'` (default): run it again. Finished steps return their stored
     *   values.
     * - `'never'`: give the model a tool error. The call does not run again.
     */
    replay?: 'safe' | 'never';
}
/**
 * Make a server tool whose side effects survive a crash. `execute` gets
 * `step` and `append` next to the normal tool context. Put each side effect
 * in `step.do(name, fn)`: when a crash makes the harness run the call again,
 * finished steps return their stored values. The tool has `replay: 'safe'`
 * unless `options.replay` says `'never'`.
 *
 * Outside a durable harness session (plain `chat()`, or a host without
 * `stores.log`), `step.do` runs `fn` each time and `append` throws.
 *
 * @example
 * ```ts
 * const createInvoice = durableTool(
 *   toolDefinition({ name: 'create_invoice', description: 'Create an invoice', inputSchema }),
 *   async ({ orderId }, { step }) => {
 *     const invoice = await step.do(`create:${orderId}`, () => billing.create(orderId))
 *     return { invoiceId: invoice.id }
 *   },
 * )
 * ```
 */
export declare function durableTool<TInput extends SchemaInput | undefined, TOutput extends SchemaInput | undefined, TName extends string, TNeedsApproval extends boolean, TApprovalSchema extends ApprovalSchemaConfig | undefined>(definition: ToolDefinition<TInput, TOutput, TName, TNeedsApproval, TApprovalSchema>, execute: (args: InferSchemaType<TInput>, context: DurableToolContext) => Promise<InferSchemaType<TOutput>> | InferSchemaType<TOutput>, options?: DurableToolOptions): import('@tanstack/ai').ServerTool<TInput, TOutput, TName, unknown, TNeedsApproval, TApprovalSchema> & {
    inputSchema: TInput;
    outputSchema: TOutput;
    approvalSchema: TApprovalSchema;
} & {
    replay: "safe" | "never";
};
/** @internal */
export type DurableBind = (toolCallId: string) => {
    step: ToolStep;
    append: DurableToolContext['append'];
};
/**
 * Give a {@link durableTool} the `step` and `append` of a durable session.
 * `bind` gets the id of each call. Another tool, and a tool that `bind`
 * already bound, comes back as it is.
 *
 * @internal
 */
export declare function bindDurable(tool: AnyTool, bind: DurableBind): AnyTool | {
    execute: (args: unknown, context?: ToolExecutionContext) => unknown;
    name: any;
    description: string;
    inputSchema?: any;
    outputSchema?: any;
    needsApproval?: boolean | undefined;
    lazy?: boolean | undefined;
    replay?: "safe" | "never" | undefined;
    metadata?: Record<string, any> | undefined;
    [DURABLE_EXECUTE]: DurableExecute;
};
export {};
