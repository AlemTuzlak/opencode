import { ModelReasoning, ReasoningRequest } from '@tanstack/ai';
export type AnthropicEffort = 'low' | 'medium' | 'high' | 'xhigh' | 'max';
export declare const isAnthropicEffort: (value: unknown) => value is AnthropicEffort;
/** The Messages API thinking fields for one request. */
export interface AnthropicThinkingFields {
    thinking?: {
        type: 'adaptive';
        display: 'summarized' | 'omitted';
        block_binding?: {
            prefix_mismatch_behavior: 'drop_block';
        };
    } | {
        type: 'enabled';
        budget_tokens: number;
    } | {
        type: 'disabled';
    };
    effort?: AnthropicEffort;
    output_config?: {
        effort: AnthropicEffort;
    };
    /**
     * Mid-conversation effort: the effort of this turn. It goes into the
     * messages, not into the request fields.
     */
    messageEffort?: AnthropicEffort;
}
/**
 * The thinking fields for `chat({ reasoning })`:
 * - mid-conversation effort (`reasoning.midConversationEffort`, pi's
 *   managed effort): always adaptive thinking with `block_binding` and a
 *   fixed `output_config.effort: 'high'`. The level's effort is
 *   `messageEffort` (`high` without a level).
 * - `off`: thinking disabled. A model that cannot stop thinking never gets
 *   here, because the clamp moves `off` to its lowest level.
 * - budget thinking (`thinking.type: 'enabled'`, pi's table when the
 *   request sets no `budgetTokens`) when `reasoning.adaptive` is `false`, or
 *   for a budget model that sets `budgetTokens`. Without `adaptive`, also
 *   for a budget model without a map or outside `ADAPTIVE_THINKING`.
 * - otherwise adaptive thinking with the model's effort for the level, or
 *   pi's default effort when the map has none. `summary` picks whether the
 *   thinking text streams back.
 */
export declare function anthropicThinking(model: string, request: ReasoningRequest | undefined, reasoning: ModelReasoning | undefined): AnthropicThinkingFields;
