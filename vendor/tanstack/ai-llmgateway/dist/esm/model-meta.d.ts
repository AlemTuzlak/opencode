import { Modality } from '@tanstack/ai';
import { LLMGatewayTextProviderOptions } from './text/text-provider-options.js';
declare const GPT_5_6_TERRA: {
    readonly name: "gpt-5.6-terra";
    readonly context_window: 1050000;
    readonly max_completion_tokens: 128000;
    readonly pricing: {
        readonly input: {
            readonly normal: 2.5;
            readonly cached: 0.25;
        };
        readonly output: {
            readonly normal: 15;
        };
    };
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object", "json_schema", "reasoning", "vision"];
        readonly tools: readonly [];
    };
};
declare const GPT_5_5: {
    readonly name: "gpt-5.5";
    readonly context_window: 1050000;
    readonly max_completion_tokens: 128000;
    readonly pricing: {
        readonly input: {
            readonly normal: 5;
            readonly cached: 0.5;
        };
        readonly output: {
            readonly normal: 30;
        };
    };
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object", "json_schema", "reasoning", "vision"];
        readonly tools: readonly [];
    };
};
declare const GPT_5_4_MINI: {
    readonly name: "gpt-5.4-mini";
    readonly context_window: 400000;
    readonly max_completion_tokens: 128000;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.75;
            readonly cached: 0.075;
        };
        readonly output: {
            readonly normal: 4.5;
        };
    };
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object", "json_schema", "reasoning", "vision"];
        readonly tools: readonly [];
    };
};
declare const CLAUDE_OPUS_5: {
    readonly name: "claude-opus-5";
    readonly context_window: 1000000;
    readonly max_completion_tokens: 128000;
    readonly pricing: {
        readonly input: {
            readonly normal: 5;
            readonly cached: 0.5;
        };
        readonly output: {
            readonly normal: 25;
        };
    };
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "reasoning", "vision"];
        readonly tools: readonly [];
    };
};
declare const CLAUDE_SONNET_5: {
    readonly name: "claude-sonnet-5";
    readonly context_window: 1000000;
    readonly max_completion_tokens: 128000;
    readonly pricing: {
        readonly input: {
            readonly normal: 2;
            readonly cached: 0.2;
        };
        readonly output: {
            readonly normal: 10;
        };
    };
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "reasoning", "vision"];
        readonly tools: readonly [];
    };
};
declare const CLAUDE_HAIKU_4_5: {
    readonly name: "claude-haiku-4-5";
    readonly context_window: 200000;
    readonly max_completion_tokens: 64000;
    readonly pricing: {
        readonly input: {
            readonly normal: 1;
            readonly cached: 0.1;
        };
        readonly output: {
            readonly normal: 5;
        };
    };
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object", "json_schema", "reasoning", "vision"];
        readonly tools: readonly [];
    };
};
declare const GEMINI_PRO_LATEST: {
    readonly name: "gemini-pro-latest";
    readonly context_window: 1048576;
    readonly max_completion_tokens: 65536;
    readonly pricing: {
        readonly input: {
            readonly normal: 2;
            readonly cached: 0.2;
        };
        readonly output: {
            readonly normal: 12;
        };
    };
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object", "json_schema", "reasoning", "vision"];
        readonly tools: readonly [];
    };
};
declare const GEMINI_3_6_FLASH: {
    readonly name: "gemini-3.6-flash";
    readonly context_window: 1048576;
    readonly max_completion_tokens: 65536;
    readonly pricing: {
        readonly input: {
            readonly normal: 1.5;
            readonly cached: 0.15;
        };
        readonly output: {
            readonly normal: 7.5;
        };
    };
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object", "json_schema", "reasoning", "vision"];
        readonly tools: readonly [];
    };
};
declare const KIMI_K3: {
    readonly name: "kimi-k3";
    readonly context_window: 1048576;
    readonly max_completion_tokens: 1048576;
    readonly pricing: {
        readonly input: {
            readonly normal: 3;
            readonly cached: 0.3;
        };
        readonly output: {
            readonly normal: 15;
        };
    };
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object", "json_schema", "reasoning", "vision"];
        readonly tools: readonly [];
    };
};
declare const GLM_5_2: {
    readonly name: "glm-5.2";
    readonly context_window: 1000000;
    readonly max_completion_tokens: 128000;
    readonly pricing: {
        readonly input: {
            readonly normal: 1.4;
            readonly cached: 0.26;
        };
        readonly output: {
            readonly normal: 4.4;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object", "json_schema", "reasoning"];
        readonly tools: readonly [];
    };
};
declare const DEEPSEEK_V4_PRO: {
    readonly name: "deepseek-v4-pro";
    readonly context_window: 1050000;
    readonly max_completion_tokens: 393216;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.435;
        };
        readonly output: {
            readonly normal: 0.87;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object", "json_schema", "reasoning"];
        readonly tools: readonly [];
    };
};
declare const QWEN_3_7_MAX: {
    readonly name: "qwen3.7-max";
    readonly context_window: 1000000;
    readonly max_completion_tokens: 65536;
    readonly pricing: {
        readonly input: {
            readonly normal: 2.5;
            readonly cached: 0.5;
        };
        readonly output: {
            readonly normal: 7.5;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object", "json_schema", "reasoning"];
        readonly tools: readonly [];
    };
};
declare const MINIMAX_M2_5: {
    readonly name: "minimax-m2.5";
    readonly context_window: 204800;
    readonly max_completion_tokens: 131100;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.3;
            readonly cached: 0.03;
        };
        readonly output: {
            readonly normal: 1.2;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "reasoning"];
        readonly tools: readonly [];
    };
};
declare const GROK_4_5: {
    readonly name: "grok-4-5";
    readonly context_window: 500000;
    readonly pricing: {
        readonly input: {
            readonly normal: 2;
            readonly cached: 0.5;
        };
        readonly output: {
            readonly normal: 6;
        };
    };
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object", "json_schema", "reasoning", "vision"];
        readonly tools: readonly [];
    };
};
/**
 * Curated LLM Gateway chat model identifiers.
 *
 * Any model on https://llmgateway.io/models works at runtime; these curated
 * entries carry per-model type metadata (input modalities, provider
 * options).
 */
export declare const LLMGATEWAY_CHAT_MODELS: readonly ["gpt-5.6-terra", "gpt-5.5", "gpt-5.4-mini", "claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5", "gemini-pro-latest", "gemini-3.6-flash", "kimi-k3", "glm-5.2", "deepseek-v4-pro", "qwen3.7-max", "minimax-m2.5", "grok-4-5"];
/**
 * Union type of all curated LLM Gateway chat model names.
 */
export type LLMGatewayChatModels = (typeof LLMGATEWAY_CHAT_MODELS)[number];
/**
 * Model id accepted by the LLM Gateway adapters: a curated model name (with
 * autocomplete and per-model type metadata) or any other model id from
 * https://llmgateway.io/models, optionally prefixed with `provider/` to pin
 * routing to a specific provider. Uncurated ids fall back to text-only
 * input and the generic provider options.
 */
export type LLMGatewayModelId = LLMGatewayChatModels | (string & {});
/**
 * Type-only map from LLM Gateway chat model name to its supported input
 * modalities.
 */
export type LLMGatewayModelInputModalitiesByName = {
    [GPT_5_6_TERRA.name]: typeof GPT_5_6_TERRA.supports.input;
    [GPT_5_5.name]: typeof GPT_5_5.supports.input;
    [GPT_5_4_MINI.name]: typeof GPT_5_4_MINI.supports.input;
    [CLAUDE_OPUS_5.name]: typeof CLAUDE_OPUS_5.supports.input;
    [CLAUDE_SONNET_5.name]: typeof CLAUDE_SONNET_5.supports.input;
    [CLAUDE_HAIKU_4_5.name]: typeof CLAUDE_HAIKU_4_5.supports.input;
    [GEMINI_PRO_LATEST.name]: typeof GEMINI_PRO_LATEST.supports.input;
    [GEMINI_3_6_FLASH.name]: typeof GEMINI_3_6_FLASH.supports.input;
    [KIMI_K3.name]: typeof KIMI_K3.supports.input;
    [GLM_5_2.name]: typeof GLM_5_2.supports.input;
    [DEEPSEEK_V4_PRO.name]: typeof DEEPSEEK_V4_PRO.supports.input;
    [QWEN_3_7_MAX.name]: typeof QWEN_3_7_MAX.supports.input;
    [MINIMAX_M2_5.name]: typeof MINIMAX_M2_5.supports.input;
    [GROK_4_5.name]: typeof GROK_4_5.supports.input;
};
/**
 * Runtime map from curated LLM Gateway chat model name to its supported
 * input modalities, read by the text adapter's `inputModalities`. An
 * uncurated id is not in it. `satisfies` ties it to
 * {@link LLMGatewayModelInputModalitiesByName}, so the two cannot drift.
 */
export declare const LLMGATEWAY_MODEL_INPUT_MODALITIES: Readonly<Record<string, ReadonlyArray<Modality>>>;
/**
 * Type-only map from LLM Gateway chat model name to its provider options
 * type.
 */
export type LLMGatewayChatModelProviderOptionsByName = {
    [K in (typeof LLMGATEWAY_CHAT_MODELS)[number]]: LLMGatewayTextProviderOptions;
};
/**
 * Type-only map from LLM Gateway chat model name to its supported provider
 * tools. LLM Gateway exposes no provider-specific tool factories, so every
 * model gets an empty tuple. This ensures that passing an Anthropic/OpenAI
 * ProviderTool to an LLM Gateway adapter produces a compile-time type error.
 */
export type LLMGatewayChatModelToolCapabilitiesByName = {
    [GPT_5_6_TERRA.name]: typeof GPT_5_6_TERRA.supports.tools;
    [GPT_5_5.name]: typeof GPT_5_5.supports.tools;
    [GPT_5_4_MINI.name]: typeof GPT_5_4_MINI.supports.tools;
    [CLAUDE_OPUS_5.name]: typeof CLAUDE_OPUS_5.supports.tools;
    [CLAUDE_SONNET_5.name]: typeof CLAUDE_SONNET_5.supports.tools;
    [CLAUDE_HAIKU_4_5.name]: typeof CLAUDE_HAIKU_4_5.supports.tools;
    [GEMINI_PRO_LATEST.name]: typeof GEMINI_PRO_LATEST.supports.tools;
    [GEMINI_3_6_FLASH.name]: typeof GEMINI_3_6_FLASH.supports.tools;
    [KIMI_K3.name]: typeof KIMI_K3.supports.tools;
    [GLM_5_2.name]: typeof GLM_5_2.supports.tools;
    [DEEPSEEK_V4_PRO.name]: typeof DEEPSEEK_V4_PRO.supports.tools;
    [QWEN_3_7_MAX.name]: typeof QWEN_3_7_MAX.supports.tools;
    [MINIMAX_M2_5.name]: typeof MINIMAX_M2_5.supports.tools;
    [GROK_4_5.name]: typeof GROK_4_5.supports.tools;
};
/**
 * Resolves the provider options type for a specific LLM Gateway model.
 * Falls back to the generic options for uncurated model ids.
 */
export type ResolveProviderOptions<TModel extends string> = TModel extends keyof LLMGatewayChatModelProviderOptionsByName ? LLMGatewayChatModelProviderOptionsByName[TModel] : LLMGatewayTextProviderOptions;
/**
 * Resolve input modalities for a specific model.
 * If the model has explicit modalities in the map, use those; otherwise use
 * text only.
 */
export type ResolveInputModalities<TModel extends string> = TModel extends keyof LLMGatewayModelInputModalitiesByName ? LLMGatewayModelInputModalitiesByName[TModel] : readonly ['text'];
export {};
