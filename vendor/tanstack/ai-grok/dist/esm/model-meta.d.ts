import { Modality } from '@tanstack/ai';
import { GrokTextProviderOptions } from './text/text-provider-options.js';
declare const GROK_4_5: {
    readonly name: "grok-4.5";
    readonly context_window: 500000;
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly capabilities: ["reasoning", "structured_outputs", "tool_calling"];
        readonly tools: readonly [];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 2;
            readonly cached: 0.3;
        };
        readonly output: {
            readonly normal: 6;
        };
    };
};
declare const GROK_4_6: {
    readonly name: "grok-4.6";
    readonly context_window: 500000;
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly capabilities: ["reasoning", "structured_outputs", "tool_calling"];
        readonly tools: readonly [];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 2;
            readonly cached: 0.5;
        };
        readonly output: {
            readonly normal: 6;
        };
    };
};
declare const GROK_4_7: {
    readonly name: "grok-4.7";
    readonly context_window: 500000;
    readonly max_output_tokens: 450000;
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly capabilities: ["reasoning", "structured_outputs", "tool_calling"];
        readonly tools: readonly [];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 1.6;
            readonly cached: 0.4;
        };
        readonly output: {
            readonly normal: 4.8;
        };
    };
};
export type GrokProviderToolKind = 'web_search' | 'x_search' | 'file_search' | 'mcp';
declare const GROK_4_3: {
    readonly name: "grok-4.3";
    readonly context_window: 1000000;
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: ["reasoning", "structured_outputs", "tool_calling"];
        readonly tools: readonly ["web_search", "x_search", "file_search", "mcp"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 1.25;
            readonly cached: 0.2;
        };
        readonly output: {
            readonly normal: 2.5;
        };
    };
};
declare const GROK_BUILD_0_1: {
    readonly name: "grok-build-0.1";
    readonly context_window: 256000;
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: ["reasoning", "structured_outputs", "tool_calling"];
        readonly tools: readonly ["web_search", "x_search", "file_search", "mcp"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 1;
            readonly cached: 0.2;
        };
        readonly output: {
            readonly normal: 2;
        };
    };
};
declare const GROK_4_20_REASONING: {
    readonly name: "grok-4.20-reasoning";
    readonly context_window: 1000000;
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: ["reasoning", "structured_outputs", "tool_calling"];
        readonly tools: readonly [];
    };
};
declare const GROK_4_20_NON_REASONING: {
    readonly name: "grok-4.20-non-reasoning";
    readonly context_window: 1000000;
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: ["structured_outputs", "tool_calling"];
        readonly tools: readonly [];
    };
};
declare const GROK_4_1_FAST_REASONING: {
    readonly name: "grok-4.1-fast-reasoning";
    readonly context_window: 2000000;
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: ["reasoning", "structured_outputs", "tool_calling"];
        readonly tools: readonly [];
    };
};
declare const GROK_4_1_FAST_NON_REASONING: {
    readonly name: "grok-4.1-fast-non-reasoning";
    readonly context_window: 2000000;
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: ["structured_outputs", "tool_calling"];
        readonly tools: readonly [];
    };
};
/**
 * Grok chat models supported by the xAI Responses adapter.
 */
export declare const GROK_CHAT_MODELS: readonly ["grok-4.7", "grok-4.5", "grok-4.6", "grok-build-0.1", "grok-4.3"];
/**
 * Grok chat models on Vertex AI / Gemini Enterprise Agent Platform.
 * This list is the Google partner catalog, not the xAI API catalog.
 */
export declare const GROK_VERTEX_CHAT_MODELS: readonly ["grok-4.3", "grok-4.20-reasoning", "grok-4.20-non-reasoning", "grok-4.1-fast-reasoning", "grok-4.1-fast-non-reasoning"];
/**
 * Grok Image Generation Models
 */
export declare const GROK_IMAGE_MODELS: readonly ["grok-imagine-image", "grok-imagine-image-2.0", "grok-imagine-image-quality"];
/**
 * Grok Video Generation Models (xAI Imagine API)
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export declare const GROK_VIDEO_MODELS: readonly ["grok-imagine-video", "grok-imagine-video-1.5"];
export declare const GROK_TTS_MODELS: readonly ["grok-tts"];
export declare const GROK_TRANSCRIPTION_MODELS: readonly ["grok-stt"];
export declare const GROK_REALTIME_MODELS: readonly ["grok-voice-think-fast-2.0", "grok-voice-latest", "grok-voice-fast-1.0", "grok-voice-think-fast-1.0"];
/**
 * Default speech-to-speech model used by the realtime token issuer and the
 * realtime client adapter when no model is specified. Single source of truth
 * so a future default bump cannot leave the two sides disagreeing.
 */
export declare const GROK_DEFAULT_REALTIME_MODEL: GrokRealtimeModel;
export type GrokChatModel = (typeof GROK_CHAT_MODELS)[number];
export type GrokVertexChatModel = (typeof GROK_VERTEX_CHAT_MODELS)[number];
export type GrokTextAdapterModel = GrokChatModel | GrokVertexChatModel;
export type GrokImageModel = (typeof GROK_IMAGE_MODELS)[number];
export type GrokVideoModel = (typeof GROK_VIDEO_MODELS)[number];
export type GrokTTSModel = (typeof GROK_TTS_MODELS)[number];
export type GrokTranscriptionModel = (typeof GROK_TRANSCRIPTION_MODELS)[number];
export type GrokRealtimeModel = (typeof GROK_REALTIME_MODELS)[number];
/**
 * Type-only map from Grok chat model name to its supported input modalities.
 * Used for type inference when constructing multimodal messages.
 */
export type GrokModelInputModalitiesByName = {
    [GROK_4_3.name]: typeof GROK_4_3.supports.input;
    [GROK_BUILD_0_1.name]: typeof GROK_BUILD_0_1.supports.input;
    [GROK_4_5.name]: typeof GROK_4_5.supports.input;
    [GROK_4_6.name]: typeof GROK_4_6.supports.input;
    [GROK_4_20_REASONING.name]: typeof GROK_4_20_REASONING.supports.input;
    [GROK_4_20_NON_REASONING.name]: typeof GROK_4_20_NON_REASONING.supports.input;
    [GROK_4_1_FAST_REASONING.name]: typeof GROK_4_1_FAST_REASONING.supports.input;
    [GROK_4_1_FAST_NON_REASONING.name]: typeof GROK_4_1_FAST_NON_REASONING.supports.input;
    [GROK_4_7.name]: typeof GROK_4_7.supports.input;
};
/**
 * Runtime map from Grok chat model name to its supported input modalities,
 * read by the text adapter's `inputModalities`. `satisfies` ties it to
 * {@link GrokModelInputModalitiesByName}, so the two cannot drift.
 */
export declare const GROK_MODEL_INPUT_MODALITIES: Readonly<Record<string, ReadonlyArray<Modality>>>;
/**
 * Type-only map from Grok chat model name to its supported provider tools.
 * Keeps Grok provider-tool factories type-checked against the models that
 * advertise xAI Responses server-side tools.
 */
export type GrokChatModelToolCapabilitiesByName = {
    [GROK_4_3.name]: typeof GROK_4_3.supports.tools;
    [GROK_BUILD_0_1.name]: typeof GROK_BUILD_0_1.supports.tools;
    [GROK_4_20_REASONING.name]: typeof GROK_4_20_REASONING.supports.tools;
    [GROK_4_20_NON_REASONING.name]: typeof GROK_4_20_NON_REASONING.supports.tools;
    [GROK_4_1_FAST_REASONING.name]: typeof GROK_4_1_FAST_REASONING.supports.tools;
    [GROK_4_1_FAST_NON_REASONING.name]: typeof GROK_4_1_FAST_NON_REASONING.supports.tools;
    [GROK_4_7.name]: typeof GROK_4_7.supports.tools;
};
export type GrokProviderOptions = GrokTextProviderOptions;
/**
 * Type-only map from Grok chat model name to its provider options type.
 */
export type GrokChatModelProviderOptionsByName = {
    [GROK_4_3.name]: GrokProviderOptions;
    [GROK_BUILD_0_1.name]: GrokProviderOptions;
    [GROK_4_20_REASONING.name]: GrokProviderOptions;
    [GROK_4_20_NON_REASONING.name]: GrokProviderOptions;
    [GROK_4_1_FAST_REASONING.name]: GrokProviderOptions;
    [GROK_4_1_FAST_NON_REASONING.name]: GrokProviderOptions;
};
/**
 * Resolve provider options for a specific model.
 * If the model has explicit options in the map, use those; otherwise use base options.
 */
export type ResolveProviderOptions<TModel extends string> = TModel extends keyof GrokChatModelProviderOptionsByName ? GrokChatModelProviderOptionsByName[TModel] : GrokProviderOptions;
/**
 * Resolve input modalities for a specific model.
 * If the model has explicit modalities in the map, use those; otherwise use text only.
 */
export type ResolveInputModalities<TModel extends string> = TModel extends keyof GrokModelInputModalitiesByName ? GrokModelInputModalitiesByName[TModel] : readonly ['text'];
export {};
