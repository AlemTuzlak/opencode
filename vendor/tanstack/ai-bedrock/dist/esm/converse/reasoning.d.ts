import { ModelReasoning, ReasoningRequest } from '@tanstack/ai';
export interface ConverseThinking {
    additionalModelRequestFields?: {
        thinking: {
            type: 'enabled';
            budget_tokens: number;
        };
        anthropic_beta: Array<string>;
    } | {
        thinking: {
            type: 'adaptive';
        };
        output_config: {
            effort: string;
        };
    };
    /** The smallest `maxTokens` that leaves room for the thinking budget. */
    minMaxTokens?: number;
}
/**
 * The Converse thinking fields for `chat({ reasoning })`. Only Claude takes
 * them on Converse (pi's rule):
 * - a budget model: enabled thinking with the budget (pi's table when the
 *   request sets none), and the interleaved-thinking beta.
 * - a model with effort levels: adaptive thinking with the effort.
 * `off` sends nothing, because Claude does not think unless asked.
 */
export declare function converseThinking(model: string, request: ReasoningRequest | undefined, reasoning: ModelReasoning | undefined): ConverseThinking;
