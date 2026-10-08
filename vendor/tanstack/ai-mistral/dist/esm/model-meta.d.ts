import { Modality } from '@tanstack/ai';
import { MistralTextProviderOptions } from './text/text-provider-options.js';
import { CodestralEmbedProviderOptions, MistralEmbedProviderOptions } from './embedding/embedding-provider-options.js';
/** Provider options for vision-capable Mistral models (pixtral-*). */
export type MistralVisionProviderOptions = MistralTextProviderOptions;
/** Provider options for reasoning-capable Mistral models (magistral-*). */
export type MistralReasoningProviderOptions = MistralTextProviderOptions;
declare const MISTRAL_LARGE_LATEST: {
    readonly name: "mistral-large-latest";
    readonly context_window: 131072;
    readonly max_completion_tokens: 8192;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.5;
        };
        readonly output: {
            readonly normal: 1.5;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object", "json_schema"];
    };
};
declare const MISTRAL_MEDIUM_LATEST: {
    readonly name: "mistral-medium-latest";
    readonly context_window: 131072;
    readonly max_completion_tokens: 8192;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.4;
        };
        readonly output: {
            readonly normal: 2;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object", "json_schema", "vision"];
    };
};
declare const MISTRAL_SMALL_LATEST: {
    readonly name: "mistral-small-latest";
    readonly context_window: 131072;
    readonly max_completion_tokens: 8192;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.1;
        };
        readonly output: {
            readonly normal: 0.3;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object", "json_schema", "vision"];
    };
};
declare const MINISTRAL_8B_LATEST: {
    readonly name: "ministral-8b-latest";
    readonly context_window: 131072;
    readonly max_completion_tokens: 8192;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.1;
        };
        readonly output: {
            readonly normal: 0.1;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object", "json_schema"];
    };
};
declare const MINISTRAL_3B_LATEST: {
    readonly name: "ministral-3b-latest";
    readonly context_window: 131072;
    readonly max_completion_tokens: 8192;
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
        readonly features: ["streaming", "tools", "json_object", "json_schema"];
    };
};
declare const CODESTRAL_LATEST: {
    readonly name: "codestral-latest";
    readonly context_window: 256000;
    readonly max_completion_tokens: 8192;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.3;
        };
        readonly output: {
            readonly normal: 0.9;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object", "json_schema", "code"];
    };
};
declare const PIXTRAL_LARGE_LATEST: {
    readonly name: "pixtral-large-latest";
    readonly context_window: 131072;
    readonly max_completion_tokens: 8192;
    readonly pricing: {
        readonly input: {
            readonly normal: 2;
        };
        readonly output: {
            readonly normal: 6;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object", "json_schema", "vision"];
    };
};
declare const PIXTRAL_12B_2409: {
    readonly name: "pixtral-12b-2409";
    readonly context_window: 131072;
    readonly max_completion_tokens: 8192;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.15;
        };
        readonly output: {
            readonly normal: 0.15;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object", "vision"];
    };
};
declare const MAGISTRAL_MEDIUM_LATEST: {
    readonly name: "magistral-medium-latest";
    readonly context_window: 40000;
    readonly max_completion_tokens: 40000;
    readonly pricing: {
        readonly input: {
            readonly normal: 2;
        };
        readonly output: {
            readonly normal: 5;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "reasoning", "json_object", "json_schema"];
    };
};
declare const MAGISTRAL_SMALL_LATEST: {
    readonly name: "magistral-small-latest";
    readonly context_window: 40000;
    readonly max_completion_tokens: 40000;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.5;
        };
        readonly output: {
            readonly normal: 1.5;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "reasoning", "json_object", "json_schema"];
    };
};
declare const OPEN_MISTRAL_NEMO: {
    readonly name: "open-mistral-nemo";
    readonly context_window: 131072;
    readonly max_completion_tokens: 8192;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.15;
        };
        readonly output: {
            readonly normal: 0.15;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object"];
    };
};
declare const MISTRAL_MEDIUM_3: {
    readonly name: "mistral-medium-3";
    readonly context_window: 131072;
    readonly max_completion_tokens: 8192;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.4;
        };
        readonly output: {
            readonly normal: 2;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object", "json_schema", "vision"];
    };
};
declare const MISTRAL_SMALL_2503: {
    readonly name: "mistral-small-2503";
    readonly context_window: 131072;
    readonly max_completion_tokens: 8192;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.1;
        };
        readonly output: {
            readonly normal: 0.3;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object", "json_schema", "vision"];
    };
};
declare const CODESTRAL_2: {
    readonly name: "codestral-2";
    readonly context_window: 131072;
    readonly max_completion_tokens: 8192;
    readonly pricing: {
        readonly input: {
            readonly normal: 0.3;
        };
        readonly output: {
            readonly normal: 0.9;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "tools", "json_object", "json_schema", "code"];
    };
};
/**
 * All supported Mistral chat model identifiers.
 */
export declare const MISTRAL_CHAT_MODELS: readonly ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest", "ministral-8b-latest", "ministral-3b-latest", "codestral-latest", "pixtral-large-latest", "pixtral-12b-2409", "magistral-medium-latest", "magistral-small-latest", "open-mistral-nemo"];
/**
 * Union type of all supported Mistral chat model names.
 */
export type MistralChatModels = (typeof MISTRAL_CHAT_MODELS)[number];
/**
 * Mistral chat models on Vertex AI / Gemini Enterprise Agent Platform.
 * This list is the Google partner catalog, not the Mistral API catalog.
 * OCR (`mistral-ocr-2505`) is not a chat model.
 */
export declare const MISTRAL_VERTEX_CHAT_MODELS: readonly ["mistral-medium-3", "mistral-small-2503", "codestral-2"];
export type MistralVertexChatModel = (typeof MISTRAL_VERTEX_CHAT_MODELS)[number];
export type MistralTextAdapterModel = MistralChatModels | MistralVertexChatModel;
/**
 * Type-only map from Mistral chat model name to its supported input modalities.
 */
export type MistralModelInputModalitiesByName = {
    [MISTRAL_LARGE_LATEST.name]: typeof MISTRAL_LARGE_LATEST.supports.input;
    [MISTRAL_MEDIUM_LATEST.name]: typeof MISTRAL_MEDIUM_LATEST.supports.input;
    [MISTRAL_SMALL_LATEST.name]: typeof MISTRAL_SMALL_LATEST.supports.input;
    [MINISTRAL_8B_LATEST.name]: typeof MINISTRAL_8B_LATEST.supports.input;
    [MINISTRAL_3B_LATEST.name]: typeof MINISTRAL_3B_LATEST.supports.input;
    [CODESTRAL_LATEST.name]: typeof CODESTRAL_LATEST.supports.input;
    [PIXTRAL_LARGE_LATEST.name]: typeof PIXTRAL_LARGE_LATEST.supports.input;
    [PIXTRAL_12B_2409.name]: typeof PIXTRAL_12B_2409.supports.input;
    [MAGISTRAL_MEDIUM_LATEST.name]: typeof MAGISTRAL_MEDIUM_LATEST.supports.input;
    [MAGISTRAL_SMALL_LATEST.name]: typeof MAGISTRAL_SMALL_LATEST.supports.input;
    [OPEN_MISTRAL_NEMO.name]: typeof OPEN_MISTRAL_NEMO.supports.input;
    [MISTRAL_MEDIUM_3.name]: typeof MISTRAL_MEDIUM_3.supports.input;
    [MISTRAL_SMALL_2503.name]: typeof MISTRAL_SMALL_2503.supports.input;
    [CODESTRAL_2.name]: typeof CODESTRAL_2.supports.input;
};
/**
 * Runtime map from Mistral chat model name to its supported input modalities,
 * for the text adapter's `inputModalities`. `satisfies` keeps it equal to
 * {@link MistralModelInputModalitiesByName}. An unknown name gives `undefined`.
 */
export declare const MISTRAL_MODEL_INPUT_MODALITIES: Readonly<Record<string, ReadonlyArray<Modality>>>;
/**
 * Type-only map from Mistral chat model name to its provider options type.
 */
export type MistralChatModelProviderOptionsByName = {
    [MISTRAL_LARGE_LATEST.name]: MistralTextProviderOptions;
    [MISTRAL_MEDIUM_LATEST.name]: MistralVisionProviderOptions;
    [MISTRAL_SMALL_LATEST.name]: MistralVisionProviderOptions;
    [MINISTRAL_8B_LATEST.name]: MistralTextProviderOptions;
    [MINISTRAL_3B_LATEST.name]: MistralTextProviderOptions;
    [CODESTRAL_LATEST.name]: MistralTextProviderOptions;
    [PIXTRAL_LARGE_LATEST.name]: MistralVisionProviderOptions;
    [PIXTRAL_12B_2409.name]: MistralVisionProviderOptions;
    [MAGISTRAL_MEDIUM_LATEST.name]: MistralReasoningProviderOptions;
    [MAGISTRAL_SMALL_LATEST.name]: MistralReasoningProviderOptions;
    [OPEN_MISTRAL_NEMO.name]: MistralTextProviderOptions;
    [MISTRAL_MEDIUM_3.name]: MistralVisionProviderOptions;
    [MISTRAL_SMALL_2503.name]: MistralVisionProviderOptions;
    [CODESTRAL_2.name]: MistralTextProviderOptions;
};
/**
 * Embedding models (based on endpoints: "embeddings")
 */
export declare const MISTRAL_EMBEDDING_MODELS: readonly ["mistral-embed", "codestral-embed"];
/**
 * Union type of all supported Mistral embedding model names.
 */
export type MistralEmbeddingModel = (typeof MISTRAL_EMBEDDING_MODELS)[number];
/**
 * Type-only map from embedding model name to its provider options type.
 *
 * `mistral-embed` accepts no provider options (fixed 1024-dim output);
 * `codestral-embed` additionally supports `outputDtype`.
 */
export type MistralEmbeddingModelProviderOptionsByName = {
    'mistral-embed': MistralEmbedProviderOptions;
    'codestral-embed': CodestralEmbedProviderOptions;
};
/**
 * Per-model input modalities for embedding models. Mistral embedding models
 * are text-only, so image inputs fail at compile time.
 */
export type MistralEmbeddingModelInputModalitiesByName = {
    'mistral-embed': readonly ['text'];
    'codestral-embed': readonly ['text'];
};
/**
 * Resolves the provider options type for a specific Mistral model.
 */
export type ResolveProviderOptions<TModel extends string> = TModel extends keyof MistralChatModelProviderOptionsByName ? MistralChatModelProviderOptionsByName[TModel] : MistralTextProviderOptions;
/**
 * Resolve input modalities for a specific model.
 */
export type ResolveInputModalities<TModel extends string> = TModel extends keyof MistralModelInputModalitiesByName ? MistralModelInputModalitiesByName[TModel] : readonly ['text'];
export {};
