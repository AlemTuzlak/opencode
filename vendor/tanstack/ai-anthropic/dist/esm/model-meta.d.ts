import { MidConversationChannels, Modality } from '@tanstack/ai';
import { AnthropicCacheControlOptions, AnthropicContainerOptions, AnthropicContextManagementOptions, AnthropicMCPOptions, AnthropicMaxTokensOptions, AnthropicSamplingOptions, AnthropicServiceTierOptions, AnthropicStopSequencesOptions, AnthropicToolChoiceOptions } from './text/text-provider-options.js';
declare const CLAUDE_OPUS_4_6: {
    readonly name: "claude-opus-4-6";
    readonly id: "claude-opus-4-6";
    readonly context_window: 200000;
    readonly max_output_tokens: 128000;
    readonly knowledge_cutoff: "2025-05-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 5;
        };
        readonly output: {
            readonly normal: 25;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly extended_thinking: true;
        readonly adaptive_thinking: true;
        readonly priority_tier: true;
        readonly tools: ["web_search", "web_fetch", "code_execution", "computer_use", "bash", "text_editor", "memory"];
    };
};
declare const CLAUDE_OPUS_4_5: {
    readonly name: "claude-opus-4-5";
    readonly id: "claude-opus-4-5";
    readonly context_window: 200000;
    readonly max_output_tokens: 32000;
    readonly knowledge_cutoff: "2025-11-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 15;
        };
        readonly output: {
            readonly normal: 75;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly extended_thinking: true;
        readonly priority_tier: true;
        readonly tools: ["web_search", "web_fetch", "code_execution", "computer_use", "bash", "text_editor", "memory"];
    };
};
declare const CLAUDE_SONNET_4_6: {
    readonly name: "claude-sonnet-4-6";
    readonly id: "claude-sonnet-4-6";
    readonly context_window: 1000000;
    readonly max_output_tokens: 64000;
    readonly knowledge_cutoff: "2025-08-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 3;
        };
        readonly output: {
            readonly normal: 15;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly extended_thinking: true;
        readonly adaptive_thinking: true;
        readonly priority_tier: true;
        readonly tools: ["web_search", "web_fetch", "code_execution", "computer_use", "bash", "text_editor", "memory"];
    };
};
declare const CLAUDE_SONNET_4_5: {
    readonly name: "claude-sonnet-4-5";
    readonly id: "claude-sonnet-4-5";
    readonly context_window: 200000;
    readonly max_output_tokens: 64000;
    readonly knowledge_cutoff: "2025-09-29";
    readonly pricing: {
        readonly input: {
            readonly normal: 3;
        };
        readonly output: {
            readonly normal: 15;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly extended_thinking: true;
        readonly priority_tier: true;
        readonly tools: ["web_search", "web_fetch", "code_execution", "computer_use", "bash", "text_editor", "memory"];
    };
};
declare const CLAUDE_HAIKU_4_5: {
    readonly name: "claude-haiku-4-5";
    readonly id: "claude-haiku-4-5";
    readonly context_window: 200000;
    readonly max_output_tokens: 64000;
    readonly knowledge_cutoff: "2025-10-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 1;
        };
        readonly output: {
            readonly normal: 5;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly extended_thinking: true;
        readonly priority_tier: true;
        readonly tools: ["web_search", "web_fetch", "code_execution", "computer_use", "bash", "text_editor", "memory"];
    };
};
declare const CLAUDE_OPUS_4_1: {
    readonly name: "claude-opus-4-1";
    readonly id: "claude-opus-4-1";
    readonly context_window: 200000;
    readonly max_output_tokens: 64000;
    readonly knowledge_cutoff: "2025-08-05";
    readonly pricing: {
        readonly input: {
            readonly normal: 15;
        };
        readonly output: {
            readonly normal: 75;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly extended_thinking: true;
        readonly priority_tier: true;
        readonly tools: ["web_search", "web_fetch", "code_execution", "computer_use", "bash", "text_editor", "memory"];
    };
};
declare const CLAUDE_OPUS_4_7: {
    readonly name: "claude-opus-4-7";
    readonly id: "claude-opus-4-7";
    readonly context_window: 1000000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly extended_thinking: false;
        readonly adaptive_thinking: true;
        readonly priority_tier: true;
        readonly tools: ["web_search", "web_fetch", "code_execution", "computer_use", "bash", "text_editor", "memory"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 5;
            readonly cached: 0.5;
        };
        readonly output: {
            readonly normal: 25;
        };
    };
};
declare const CLAUDE_OPUS_4_8: {
    readonly name: "claude-opus-4-8";
    readonly id: "claude-opus-4-8";
    readonly context_window: 1000000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly extended_thinking: false;
        readonly adaptive_thinking: true;
        readonly priority_tier: true;
        readonly tools: ["web_search", "web_fetch", "code_execution", "computer_use", "bash", "text_editor", "memory"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 5;
            readonly cached: 0.5;
        };
        readonly output: {
            readonly normal: 25;
        };
    };
};
declare const CLAUDE_FABLE_5: {
    readonly name: "claude-fable-5";
    readonly id: "claude-fable-5";
    readonly context_window: 1000000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly extended_thinking: false;
        readonly adaptive_thinking: true;
        readonly priority_tier: true;
        readonly tools: ["web_search", "web_fetch", "code_execution", "computer_use", "bash", "text_editor", "memory"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 10;
            readonly cached: 1;
        };
        readonly output: {
            readonly normal: 50;
        };
    };
};
declare const CLAUDE_SONNET_5: {
    readonly name: "claude-sonnet-5";
    readonly id: "claude-sonnet-5";
    readonly context_window: 1000000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly extended_thinking: false;
        readonly adaptive_thinking: true;
        readonly tools: ["web_search", "web_fetch", "code_execution", "computer_use", "bash", "text_editor", "memory"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 2;
            readonly cached: 0.2;
        };
        readonly output: {
            readonly normal: 10;
        };
    };
};
/**
 * Model ids accepted by the Anthropic text adapter.
 *
 * Every id here resolves against the first-party Anthropic API
 * (`GET /v1/models/{id}`). Retired models (Claude 3.x, Sonnet 3.7,
 * Opus 4 / Sonnet 4) and the `-fast` variant ids (fast mode is requested
 * via the `speed` parameter, not a model id) were removed after Anthropic
 * turned them off.
 */
declare const CLAUDE_OPUS_5: {
    readonly name: "claude-opus-5";
    readonly id: "claude-opus-5";
    readonly context_window: 1000000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly tools: ["web_search", "web_fetch", "code_execution", "computer_use", "bash", "text_editor", "memory"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 5;
            readonly cached: 0.5;
        };
        readonly output: {
            readonly normal: 25;
        };
    };
};
declare const CLAUDE_OPUS_5_FAST: {
    readonly name: "claude-opus-5-fast";
    readonly id: "claude-opus-5-fast";
    readonly context_window: 1000000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly tools: [];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 10;
            readonly cached: 1;
        };
        readonly output: {
            readonly normal: 50;
        };
    };
};
declare const CLAUDE_FABLE_5_1: {
    readonly name: "claude-fable-5-1";
    readonly id: "claude-fable-5-1";
    readonly context_window: 1000000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly tools: ["web_search", "web_fetch", "code_execution", "computer_use", "bash", "text_editor", "memory"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 10;
            readonly cached: 0.25;
        };
        readonly output: {
            readonly normal: 50;
        };
    };
};
declare const CLAUDE_OPUS_5_5: {
    readonly name: "claude-opus-5-5";
    readonly id: "claude-opus-5-5";
    readonly context_window: 1000000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly tools: ["web_search", "web_fetch", "code_execution", "bash", "text_editor", "memory"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 4;
            readonly cached: 0.2;
        };
        readonly output: {
            readonly normal: 20;
        };
    };
};
declare const CLAUDE_SONNET_5_5: {
    readonly name: "claude-sonnet-5-5";
    readonly id: "claude-sonnet-5-5";
    readonly context_window: 1000000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly extended_thinking: false;
        readonly adaptive_thinking: true;
        readonly tools: ["web_search", "web_fetch", "code_execution", "bash", "text_editor", "memory"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 2;
            readonly cached: 0.1;
        };
        readonly output: {
            readonly normal: 10;
        };
    };
};
declare const CLAUDE_HAIKU_5_5: {
    readonly name: "claude-haiku-5-5";
    readonly id: "claude-haiku-5-5";
    readonly context_window: 1000000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly extended_thinking: false;
        readonly adaptive_thinking: true;
        readonly tools: ["web_search", "web_fetch", "code_execution", "bash", "text_editor", "memory"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 0.1;
            readonly cached: 0.01;
        };
        readonly output: {
            readonly normal: 0.5;
        };
    };
};
export declare const ANTHROPIC_MODELS: readonly ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5", "claude-fable-5-1", "claude-opus-5", "claude-opus-5-fast", "claude-opus-4-6", "claude-opus-4-5", "claude-sonnet-4-6", "claude-sonnet-4-5", "claude-haiku-4-5", "claude-opus-4-1", "claude-opus-4-7", "claude-opus-4-8", "claude-fable-5", "claude-sonnet-5"];
/**
 * Claude chat models on Vertex AI / Gemini Enterprise Agent Platform.
 * This list is the Google partner catalog, not the full Anthropic API catalog.
 * Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/partner-models/use-partner-models
 */
export declare const ANTHROPIC_VERTEX_CHAT_MODELS: readonly ["claude-opus-5", "claude-sonnet-5", "claude-fable-5", "claude-opus-4-8", "claude-opus-4-7", "claude-opus-4-6", "claude-sonnet-4-6", "claude-opus-4-5", "claude-sonnet-4-5", "claude-opus-4-1", "claude-haiku-4-5"];
export type AnthropicVertexChatModel = (typeof ANTHROPIC_VERTEX_CHAT_MODELS)[number];
/**
 * Fallback `max_tokens` ceiling for a model whose metadata carries no
 * `max_output_tokens` (e.g. an unrecognized model id). Anthropic's Messages
 * API *requires* `max_tokens`, so the adapter must always send a value. 64K is
 * the output ceiling of the current mainstream Claude tier (Sonnet/Haiku 4.5),
 * so it's a sane default for an unknown — almost certainly modern — model and
 * avoids silently truncating long generations (issue #849). Recognized models
 * use their exact `max_output_tokens` from {@link ANTHROPIC_MODEL_MAX_OUTPUT_TOKENS}
 * (e.g. 128K for Opus), so this fallback only ever applies to ids not in the
 * map.
 */
export declare const ANTHROPIC_DEFAULT_MAX_OUTPUT_TOKENS = 64000;
/**
 * Largest `max_tokens` the Anthropic SDK permits on a **non-streaming**
 * request. The SDK refuses to make a non-streaming call it estimates could
 * exceed its 10-minute timeout, computed as
 * `(60min * max_tokens) / 128_000 > 10min` — i.e. it throws
 * `"Streaming is required for operations that may take longer than 10 minutes"`
 * once `max_tokens > 128_000 * 10 / 60 ≈ 21_333`
 * (`@anthropic-ai/sdk`'s `calculateNonstreamingTimeout`). The text adapter's
 * only non-streaming call is the forced-tool `structuredOutput()` request, so
 * its defaulted ceiling must stay at or below this; the streaming chat path
 * keeps the model's full {@link getAnthropicDefaultMaxTokens} ceiling. We sit
 * just under the boundary (`21_333` would round-trip to exactly 10min). This
 * caps only the *default* — an explicit oversized `max_tokens` from the caller
 * still surfaces the SDK's "use streaming" error, which is the correct signal.
 */
export declare const ANTHROPIC_MAX_NONSTREAMING_TOKENS = 21000;
/**
 * Resolve the default `max_tokens` for a model: its known `max_output_tokens`
 * ceiling, or {@link ANTHROPIC_DEFAULT_MAX_OUTPUT_TOKENS} for unknown models.
 * Callers that pass an explicit `max_tokens` bypass this entirely.
 *
 * Pass `stream: false` for non-streaming requests (the `structuredOutput()`
 * path): the result is then clamped to {@link ANTHROPIC_MAX_NONSTREAMING_TOKENS}
 * so the defaulted ceiling doesn't trip the SDK's non-streaming 10-minute guard
 * (issue #849). Streaming requests (the default) are unaffected and get the
 * model's full ceiling.
 */
export declare function getAnthropicDefaultMaxTokens(model: string, { stream }?: {
    stream?: boolean;
}): number;
/**
 * Anthropic models that support combining `tools` + JSON-Schema-constrained
 * output in a single streaming Messages request (per issue #605). GA'd
 * 2026-01-29 for Claude 4.5+ via `output_format` on the beta messages
 * endpoint. Older Claude models still need the forced-tool-use workaround
 * in `structuredOutput`.
 */
export declare const ANTHROPIC_COMBINED_TOOLS_AND_SCHEMA_MODELS: Set<string>;
/**
 * The mid-conversation channels of each model (from pi 0.87.1): added tools
 * use the `mid-conversation-tool-changes-2026-07-01` beta, and added prompts
 * go in a mid-conversation `system` message. An unknown id gives
 * `undefined`, so the adapter has no channels.
 */
export declare const ANTHROPIC_MODEL_MID_CONVERSATION_CHANNELS: Readonly<Record<string, MidConversationChannels>>;
/**
 * The models with mid-conversation effort (pi 0.87.1 `supportsMidConvoEffort`):
 * the level of each call goes into the messages. See
 * `ModelReasoning.midConversationEffort`.
 */
export declare const ANTHROPIC_MID_CONVERSATION_EFFORT_MODELS: ReadonlySet<string>;
export type AnthropicChatModel = (typeof ANTHROPIC_MODELS)[number];
export type AnthropicChatModelProviderOptionsByName = {
    [CLAUDE_OPUS_4_6.id]: AnthropicCacheControlOptions & AnthropicContainerOptions & AnthropicContextManagementOptions & AnthropicMCPOptions & AnthropicServiceTierOptions & AnthropicStopSequencesOptions & AnthropicToolChoiceOptions & AnthropicSamplingOptions;
    [CLAUDE_SONNET_4_6.id]: AnthropicCacheControlOptions & AnthropicContainerOptions & AnthropicContextManagementOptions & AnthropicMCPOptions & AnthropicServiceTierOptions & AnthropicStopSequencesOptions & AnthropicToolChoiceOptions & AnthropicSamplingOptions;
    [CLAUDE_OPUS_4_5.id]: AnthropicCacheControlOptions & AnthropicContainerOptions & AnthropicContextManagementOptions & AnthropicMCPOptions & AnthropicServiceTierOptions & AnthropicStopSequencesOptions & AnthropicToolChoiceOptions & AnthropicSamplingOptions;
    [CLAUDE_SONNET_4_5.id]: AnthropicCacheControlOptions & AnthropicContainerOptions & AnthropicContextManagementOptions & AnthropicMCPOptions & AnthropicServiceTierOptions & AnthropicStopSequencesOptions & AnthropicToolChoiceOptions & AnthropicSamplingOptions;
    [CLAUDE_HAIKU_4_5.id]: AnthropicCacheControlOptions & AnthropicContainerOptions & AnthropicContextManagementOptions & AnthropicMCPOptions & AnthropicServiceTierOptions & AnthropicStopSequencesOptions & AnthropicToolChoiceOptions & AnthropicSamplingOptions;
    [CLAUDE_OPUS_4_1.id]: AnthropicCacheControlOptions & AnthropicContainerOptions & AnthropicContextManagementOptions & AnthropicMCPOptions & AnthropicServiceTierOptions & AnthropicStopSequencesOptions & AnthropicToolChoiceOptions & AnthropicSamplingOptions;
    [CLAUDE_OPUS_4_7.id]: AnthropicCacheControlOptions & AnthropicContainerOptions & AnthropicContextManagementOptions & AnthropicMCPOptions & AnthropicServiceTierOptions & AnthropicStopSequencesOptions & AnthropicToolChoiceOptions & AnthropicMaxTokensOptions;
    [CLAUDE_OPUS_4_8.id]: AnthropicCacheControlOptions & AnthropicContainerOptions & AnthropicContextManagementOptions & AnthropicMCPOptions & AnthropicServiceTierOptions & AnthropicStopSequencesOptions & AnthropicToolChoiceOptions & AnthropicMaxTokensOptions;
    [CLAUDE_FABLE_5.id]: AnthropicCacheControlOptions & AnthropicContainerOptions & AnthropicContextManagementOptions & AnthropicMCPOptions & AnthropicServiceTierOptions & AnthropicStopSequencesOptions & AnthropicToolChoiceOptions & AnthropicMaxTokensOptions;
    [CLAUDE_SONNET_5.id]: AnthropicCacheControlOptions & AnthropicContainerOptions & AnthropicContextManagementOptions & AnthropicMCPOptions & AnthropicServiceTierOptions & AnthropicStopSequencesOptions & AnthropicToolChoiceOptions & AnthropicMaxTokensOptions;
    [CLAUDE_OPUS_5.id]: AnthropicContainerOptions & AnthropicContextManagementOptions & AnthropicMCPOptions & AnthropicServiceTierOptions & AnthropicStopSequencesOptions & AnthropicToolChoiceOptions & AnthropicSamplingOptions;
    [CLAUDE_OPUS_5_FAST.id]: AnthropicContainerOptions & AnthropicContextManagementOptions & AnthropicMCPOptions & AnthropicServiceTierOptions & AnthropicStopSequencesOptions & AnthropicToolChoiceOptions & AnthropicSamplingOptions;
    [CLAUDE_FABLE_5_1.id]: AnthropicCacheControlOptions & AnthropicContainerOptions & AnthropicContextManagementOptions & AnthropicMCPOptions & AnthropicServiceTierOptions & AnthropicStopSequencesOptions & AnthropicToolChoiceOptions & AnthropicMaxTokensOptions;
    [CLAUDE_OPUS_5_5.id]: AnthropicCacheControlOptions & AnthropicContainerOptions & AnthropicContextManagementOptions & AnthropicMCPOptions & AnthropicServiceTierOptions & AnthropicStopSequencesOptions & AnthropicToolChoiceOptions & AnthropicSamplingOptions;
    [CLAUDE_SONNET_5_5.id]: AnthropicCacheControlOptions & AnthropicContainerOptions & AnthropicContextManagementOptions & AnthropicMCPOptions & AnthropicServiceTierOptions & AnthropicStopSequencesOptions & AnthropicToolChoiceOptions & AnthropicMaxTokensOptions;
    [CLAUDE_HAIKU_5_5.id]: AnthropicCacheControlOptions & AnthropicContainerOptions & AnthropicContextManagementOptions & AnthropicMCPOptions & AnthropicServiceTierOptions & AnthropicStopSequencesOptions & AnthropicToolChoiceOptions & AnthropicMaxTokensOptions;
};
export type AnthropicChatModelToolCapabilitiesByName = {
    [CLAUDE_OPUS_4_6.id]: typeof CLAUDE_OPUS_4_6.supports.tools;
    [CLAUDE_OPUS_4_5.id]: typeof CLAUDE_OPUS_4_5.supports.tools;
    [CLAUDE_SONNET_4_6.id]: typeof CLAUDE_SONNET_4_6.supports.tools;
    [CLAUDE_SONNET_4_5.id]: typeof CLAUDE_SONNET_4_5.supports.tools;
    [CLAUDE_HAIKU_4_5.id]: typeof CLAUDE_HAIKU_4_5.supports.tools;
    [CLAUDE_OPUS_4_1.id]: typeof CLAUDE_OPUS_4_1.supports.tools;
    [CLAUDE_OPUS_4_7.id]: typeof CLAUDE_OPUS_4_7.supports.tools;
    [CLAUDE_OPUS_4_8.id]: typeof CLAUDE_OPUS_4_8.supports.tools;
    [CLAUDE_FABLE_5.id]: typeof CLAUDE_FABLE_5.supports.tools;
    [CLAUDE_SONNET_5.id]: typeof CLAUDE_SONNET_5.supports.tools;
    [CLAUDE_OPUS_5.id]: typeof CLAUDE_OPUS_5.supports.tools;
    [CLAUDE_OPUS_5_FAST.id]: typeof CLAUDE_OPUS_5_FAST.supports.tools;
    [CLAUDE_FABLE_5_1.id]: typeof CLAUDE_FABLE_5_1.supports.tools;
    [CLAUDE_OPUS_5_5.id]: typeof CLAUDE_OPUS_5_5.supports.tools;
    [CLAUDE_SONNET_5_5.id]: typeof CLAUDE_SONNET_5_5.supports.tools;
    [CLAUDE_HAIKU_5_5.id]: typeof CLAUDE_HAIKU_5_5.supports.tools;
};
/**
 * Type-only map from chat model name to its supported input modalities.
 * All Anthropic Claude models support text, image, and document (PDF) input.
 * Used by the core AI types to constrain ContentPart types based on the selected model.
 * Note: These must be inlined as readonly arrays (not typeof) because the model
 * constants are not exported and typeof references don't work in .d.ts files
 * when consumed by external packages.
 *
 * @see https://docs.anthropic.com/claude/docs/vision
 * @see https://docs.anthropic.com/claude/docs/pdf-support
 */
export type AnthropicModelInputModalitiesByName = {
    [CLAUDE_OPUS_4_6.id]: typeof CLAUDE_OPUS_4_6.supports.input;
    [CLAUDE_OPUS_4_5.id]: typeof CLAUDE_OPUS_4_5.supports.input;
    [CLAUDE_SONNET_4_6.id]: typeof CLAUDE_SONNET_4_6.supports.input;
    [CLAUDE_SONNET_4_5.id]: typeof CLAUDE_SONNET_4_5.supports.input;
    [CLAUDE_HAIKU_4_5.id]: typeof CLAUDE_HAIKU_4_5.supports.input;
    [CLAUDE_OPUS_4_1.id]: typeof CLAUDE_OPUS_4_1.supports.input;
    [CLAUDE_OPUS_4_7.id]: typeof CLAUDE_OPUS_4_7.supports.input;
    [CLAUDE_OPUS_4_8.id]: typeof CLAUDE_OPUS_4_8.supports.input;
    [CLAUDE_FABLE_5.id]: typeof CLAUDE_FABLE_5.supports.input;
    [CLAUDE_SONNET_5.id]: typeof CLAUDE_SONNET_5.supports.input;
    [CLAUDE_OPUS_5.id]: typeof CLAUDE_OPUS_5.supports.input;
    [CLAUDE_OPUS_5_FAST.id]: typeof CLAUDE_OPUS_5_FAST.supports.input;
    [CLAUDE_FABLE_5_1.id]: typeof CLAUDE_FABLE_5_1.supports.input;
    [CLAUDE_OPUS_5_5.id]: typeof CLAUDE_OPUS_5_5.supports.input;
    [CLAUDE_SONNET_5_5.id]: typeof CLAUDE_SONNET_5_5.supports.input;
    [CLAUDE_HAIKU_5_5.id]: typeof CLAUDE_HAIKU_5_5.supports.input;
};
/**
 * Runtime map from chat model id to its supported input modalities, for the
 * text adapter's `inputModalities`. `satisfies` keeps it equal to
 * {@link AnthropicModelInputModalitiesByName}. An unknown id gives `undefined`.
 */
export declare const ANTHROPIC_MODEL_INPUT_MODALITIES: Readonly<Record<string, ReadonlyArray<Modality>>>;
export {};
