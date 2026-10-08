import { ThinkingConfig } from '@google/genai';
import { ModelReasoning, ReasoningRequest } from '@tanstack/ai';
/**
 * The `thinkingConfig` for `chat({ reasoning })`:
 * - `off`: a zero thinking budget. A model that cannot stop thinking never
 *   gets here, because the clamp moves `off` to its lowest level.
 * - a model with effort levels (Gemini 3): `thinkingLevel`.
 * - a budget model (Gemini 2.5): `thinkingBudget`, from `budgetTokens` or
 *   pi's table.
 * `summary` turns `includeThoughts` on.
 */
export declare function geminiThinkingConfig(model: string, request: ReasoningRequest | undefined, reasoning: ModelReasoning | undefined): ThinkingConfig | undefined;
/** The Interactions API thinking fields for `chat({ reasoning })`. */
export declare function interactionsThinking(request: ReasoningRequest | undefined, reasoning: ModelReasoning | undefined): {
    thinking_level?: string;
    thinking_summaries?: 'auto' | 'none';
};
