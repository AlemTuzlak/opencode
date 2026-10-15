import { TokenUsage } from '../types.js';
/** What {@link isContextOverflow} reads. Every field is optional. */
export interface ContextOverflowInput {
    /** A `RUN_ERROR` event, an `Error`, or an error message. */
    error?: unknown;
    /** The call's token usage, from `RUN_FINISHED`. */
    usage?: Pick<TokenUsage, 'promptTokens' | 'completionTokens'>;
    /** The call's finish reason, from `RUN_FINISHED`. */
    finishReason?: string | null;
    /** The model's context window in tokens. Needed for the silent and length-stop checks. */
    contextWindow?: number;
    /** The provider id. Only `'cerebras'` changes the result: Cerebras answers an overflow with a 400 or 413 and no body. */
    provider?: string;
}
/**
 * Whether a model call failed, or ended early, because the input did not fit
 * in the model's context window. Use it to compact the history and retry.
 *
 * - An error counts when its message matches a known overflow message of a
 *   provider (Anthropic, OpenAI, Gemini, Bedrock, xAI, Groq, OpenRouter,
 *   Mistral, Ollama, and more), and it is not a rate limit or a throttle.
 * - With `contextWindow`, a call that finished with `'stop'` counts when
 *   `usage.promptTokens` is more than the window. Some providers accept an
 *   overflow and cut the input without an error.
 * - With `contextWindow`, a call that finished with `'length'` counts when it
 *   wrote no tokens and its input fills 99% of the window.
 *
 * @example
 * ```ts
 * for await (const chunk of chat({ adapter, messages })) {
 *   if (chunk.type === 'RUN_ERROR' && isContextOverflow({ error: chunk })) {
 *     // compact `messages`, then call chat() again
 *   }
 * }
 * ```
 */
export declare function isContextOverflow(input: ContextOverflowInput): boolean;
