import { Modality } from '@tanstack/ai';
import { GroqTextProviderOptions } from './text/text-provider-options.js';
import { GroqTTSProviderOptions } from './audio/tts-provider-options.js';
declare const LLAMA_3_3_70B_VERSATILE: {
    readonly name: "llama-3.3-70b-versatile";
    readonly context_window: 131072;
    readonly max_completion_tokens: 32768;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.59;
        };
        readonly output: {
            readonly normal: 0.79;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object"];
        readonly tools: readonly [];
    };
};
declare const LLAMA_4_MAVERICK_17B_128E_INSTRUCT: {
    readonly name: "meta-llama/llama-4-maverick-17b-128e-instruct";
    readonly context_window: 131072;
    readonly max_completion_tokens: 8192;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.2;
        };
        readonly output: {
            readonly normal: 0.6;
        };
    };
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object", "json_schema", "vision"];
        readonly tools: readonly [];
    };
};
declare const LLAMA_4_SCOUT_17B_16E_INSTRUCT: {
    readonly name: "meta-llama/llama-4-scout-17b-16e-instruct";
    readonly context_window: 131072;
    readonly max_completion_tokens: 8192;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.05;
        };
        readonly output: {
            readonly normal: 0.08;
        };
    };
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object"];
        readonly tools: readonly [];
    };
};
declare const LLAMA_GUARD_4_12B: {
    readonly name: "meta-llama/llama-guard-4-12b";
    readonly context_window: 131072;
    readonly max_completion_tokens: 1024;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.2;
        };
        readonly output: {
            readonly normal: 0.2;
        };
    };
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "json_object", "content_moderation", "vision"];
        readonly tools: readonly [];
    };
};
declare const LLAMA_PROMPT_GUARD_2_86M: {
    readonly name: "meta-llama/llama-prompt-guard-2-86m";
    readonly context_window: 512;
    readonly max_completion_tokens: 512;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.04;
        };
        readonly output: {
            readonly normal: 0.04;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "content_moderation", "json_object"];
        readonly tools: readonly [];
    };
};
declare const LLAMA_3_1_8B_INSTANT: {
    readonly name: "llama-3.1-8b-instant";
    readonly context_window: 131072;
    readonly max_completion_tokens: 131072;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.05;
        };
        readonly output: {
            readonly normal: 0.08;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "json_object", "tools"];
        readonly tools: readonly [];
    };
};
declare const LLAMA_PROMPT_GUARD_2_22M: {
    readonly name: "meta-llama/llama-prompt-guard-2-22m";
    readonly context_window: 512;
    readonly max_completion_tokens: 512;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.03;
        };
        readonly output: {
            readonly normal: 0.03;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "content_moderation"];
        readonly tools: readonly [];
    };
};
declare const GPT_OSS_120B: {
    readonly name: "openai/gpt-oss-120b";
    readonly context_window: 131072;
    readonly max_completion_tokens: 65536;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.15;
            readonly cached: 0.075;
        };
        readonly output: {
            readonly normal: 0.6;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "json_object", "json_schema", "tools", "browser_search", "code_execution", "reasoning"];
        readonly tools: readonly [];
    };
};
declare const GPT_OSS_SAFEGUARD_20B: {
    readonly name: "openai/gpt-oss-safeguard-20b";
    readonly context_window: 131072;
    readonly max_completion_tokens: 65536;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.075;
            readonly cached: 0.037;
        };
        readonly output: {
            readonly normal: 0.3;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "browser_search", "code_execution", "json_object", "json_schema", "reasoning", "content_moderation"];
        readonly tools: readonly [];
    };
};
declare const GPT_OSS_20B: {
    readonly name: "openai/gpt-oss-20b";
    readonly context_window: 131072;
    readonly max_completion_tokens: 65536;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.075;
            readonly cached: 0.037;
        };
        readonly output: {
            readonly normal: 0.3;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "browser_search", "code_execution", "json_object", "json_schema", "reasoning", "tools"];
        readonly tools: readonly [];
    };
};
declare const KIMI_K2_INSTRUCT_0905: {
    readonly name: "moonshotai/kimi-k2-instruct-0905";
    readonly context_window: 262144;
    readonly max_completion_tokens: 16384;
    readonly pricing: {
        readonly input: {
            readonly normal: 1;
            readonly cached: 0.5;
        };
        readonly output: {
            readonly normal: 3;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object", "json_schema"];
        readonly tools: readonly [];
    };
};
declare const QWEN3_32B: {
    readonly name: "qwen/qwen3-32b";
    readonly context_window: 131072;
    readonly max_completion_tokens: 40960;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.29;
        };
        readonly output: {
            readonly normal: 0.59;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "json_object", "tools", "reasoning"];
        readonly tools: readonly [];
    };
};
/**
 * All supported Groq chat model identifiers.
 */
export declare const GROQ_CHAT_MODELS: readonly ["llama-3.1-8b-instant", "llama-3.3-70b-versatile", "meta-llama/llama-4-maverick-17b-128e-instruct", "meta-llama/llama-4-scout-17b-16e-instruct", "meta-llama/llama-guard-4-12b", "meta-llama/llama-prompt-guard-2-86m", "meta-llama/llama-prompt-guard-2-22m", "openai/gpt-oss-20b", "openai/gpt-oss-120b", "openai/gpt-oss-safeguard-20b", "moonshotai/kimi-k2-instruct-0905", "qwen/qwen3-32b"];
/**
 * Union type of all supported Groq chat model names.
 */
export type GroqChatModels = (typeof GROQ_CHAT_MODELS)[number];
/**
 * Type-only map from Groq chat model name to its supported input modalities.
 */
export type GroqModelInputModalitiesByName = {
    [LLAMA_3_1_8B_INSTANT.name]: typeof LLAMA_3_1_8B_INSTANT.supports.input;
    [LLAMA_3_3_70B_VERSATILE.name]: typeof LLAMA_3_3_70B_VERSATILE.supports.input;
    [LLAMA_4_MAVERICK_17B_128E_INSTRUCT.name]: typeof LLAMA_4_MAVERICK_17B_128E_INSTRUCT.supports.input;
    [LLAMA_4_SCOUT_17B_16E_INSTRUCT.name]: typeof LLAMA_4_SCOUT_17B_16E_INSTRUCT.supports.input;
    [LLAMA_GUARD_4_12B.name]: typeof LLAMA_GUARD_4_12B.supports.input;
    [LLAMA_PROMPT_GUARD_2_86M.name]: typeof LLAMA_PROMPT_GUARD_2_86M.supports.input;
    [LLAMA_PROMPT_GUARD_2_22M.name]: typeof LLAMA_PROMPT_GUARD_2_22M.supports.input;
    [GPT_OSS_20B.name]: typeof GPT_OSS_20B.supports.input;
    [GPT_OSS_120B.name]: typeof GPT_OSS_120B.supports.input;
    [GPT_OSS_SAFEGUARD_20B.name]: typeof GPT_OSS_SAFEGUARD_20B.supports.input;
    [KIMI_K2_INSTRUCT_0905.name]: typeof KIMI_K2_INSTRUCT_0905.supports.input;
    [QWEN3_32B.name]: typeof QWEN3_32B.supports.input;
};
/**
 * Runtime map from Groq chat model name to its supported input modalities,
 * read by the text adapter's `inputModalities`. `satisfies` ties it to
 * {@link GroqModelInputModalitiesByName}, so the two cannot drift.
 */
export declare const GROQ_MODEL_INPUT_MODALITIES: Readonly<Record<string, ReadonlyArray<Modality>>>;
/**
 * Type-only map from Groq chat model name to its provider options type.
 */
export type GroqChatModelProviderOptionsByName = {
    [K in (typeof GROQ_CHAT_MODELS)[number]]: GroqTextProviderOptions;
};
/**
 * Type-only map from Groq chat model name to its supported provider tools.
 * Groq exposes no provider-specific tool factories, so every model gets an
 * empty tuple. This ensures that passing an Anthropic/OpenAI ProviderTool to
 * a Groq adapter produces a compile-time type error.
 */
export type GroqChatModelToolCapabilitiesByName = {
    [LLAMA_3_1_8B_INSTANT.name]: typeof LLAMA_3_1_8B_INSTANT.supports.tools;
    [LLAMA_3_3_70B_VERSATILE.name]: typeof LLAMA_3_3_70B_VERSATILE.supports.tools;
    [LLAMA_4_MAVERICK_17B_128E_INSTRUCT.name]: typeof LLAMA_4_MAVERICK_17B_128E_INSTRUCT.supports.tools;
    [LLAMA_4_SCOUT_17B_16E_INSTRUCT.name]: typeof LLAMA_4_SCOUT_17B_16E_INSTRUCT.supports.tools;
    [LLAMA_GUARD_4_12B.name]: typeof LLAMA_GUARD_4_12B.supports.tools;
    [LLAMA_PROMPT_GUARD_2_86M.name]: typeof LLAMA_PROMPT_GUARD_2_86M.supports.tools;
    [LLAMA_PROMPT_GUARD_2_22M.name]: typeof LLAMA_PROMPT_GUARD_2_22M.supports.tools;
    [GPT_OSS_20B.name]: typeof GPT_OSS_20B.supports.tools;
    [GPT_OSS_120B.name]: typeof GPT_OSS_120B.supports.tools;
    [GPT_OSS_SAFEGUARD_20B.name]: typeof GPT_OSS_SAFEGUARD_20B.supports.tools;
    [KIMI_K2_INSTRUCT_0905.name]: typeof KIMI_K2_INSTRUCT_0905.supports.tools;
    [QWEN3_32B.name]: typeof QWEN3_32B.supports.tools;
};
/**
 * Type-only map from Groq TTS model name to its provider options type.
 */
export type GroqTTSModelProviderOptionsByName = {
    [K in GroqTTSModel]: GroqTTSProviderOptions;
};
/**
 * Resolves the provider options type for a specific Groq model.
 * Checks TTS models first, then chat models, then falls back to generic options.
 */
export type ResolveProviderOptions<TModel extends string> = TModel extends GroqTTSModel ? GroqTTSProviderOptions : TModel extends keyof GroqChatModelProviderOptionsByName ? GroqChatModelProviderOptionsByName[TModel] : GroqTextProviderOptions;
/**
 * Resolve input modalities for a specific model.
 * If the model has explicit modalities in the map, use those; otherwise use text only.
 */
export type ResolveInputModalities<TModel extends string> = TModel extends keyof GroqModelInputModalitiesByName ? GroqModelInputModalitiesByName[TModel] : readonly ['text'];
/**
 * All supported Groq transcription model identifiers.
 */
export declare const GROQ_TRANSCRIPTION_MODELS: readonly ["whisper-large-v3-turbo", "whisper-large-v3"];
/**
 * Union type of all supported Groq transcription model names.
 */
export type GroqTranscriptionModel = (typeof GROQ_TRANSCRIPTION_MODELS)[number];
/**
 * All supported Groq TTS model identifiers.
 */
export declare const GROQ_TTS_MODELS: readonly ["canopylabs/orpheus-v1-english", "canopylabs/orpheus-arabic-saudi"];
/**
 * Union type of all supported Groq TTS model names.
 */
export type GroqTTSModel = (typeof GROQ_TTS_MODELS)[number];
export {};
