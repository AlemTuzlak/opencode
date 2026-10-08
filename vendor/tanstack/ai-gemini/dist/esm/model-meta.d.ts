import { Modality } from '@tanstack/ai';
import { GeminiCachedContentOptions, GeminiCommonConfigOptions, GeminiSafetyOptions, GeminiStructuredOutputOptions, GeminiToolConfigOptions } from './text/text-provider-options.js';
import { GeminiEmbeddingProviderOptions } from './embedding/embedding-provider-options.js';
declare const GEMINI_3_1_PRO: {
    readonly name: "gemini-3.1-pro-preview";
    readonly max_input_tokens: 1048576;
    readonly max_output_tokens: 65536;
    readonly knowledge_cutoff: "2025-01-01";
    readonly supports: {
        readonly input: ["text", "image", "audio", "video", "document"];
        readonly output: ["text"];
        readonly capabilities: ["batch_api", "caching", "function_calling", "structured_output", "thinking"];
        readonly tools: ["code_execution", "file_search", "google_search", "url_context"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 2.5;
        };
        readonly output: {
            readonly normal: 15;
        };
    };
};
declare const GEMINI_3_FLASH: {
    readonly name: "gemini-3-flash-preview";
    readonly max_input_tokens: 1048576;
    readonly max_output_tokens: 65536;
    readonly knowledge_cutoff: "2025-01-01";
    readonly supports: {
        readonly input: ["text", "image", "audio", "video", "document"];
        readonly output: ["text"];
        readonly capabilities: ["batch_api", "caching", "function_calling", "structured_output", "thinking"];
        readonly tools: ["code_execution", "file_search", "google_search", "url_context"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 0.5;
        };
        readonly output: {
            readonly normal: 3;
        };
    };
};
declare const GEMINI_3_1_FLASH_LITE: {
    readonly name: "gemini-3.1-flash-lite";
    readonly max_input_tokens: 1048576;
    readonly max_output_tokens: 65536;
    readonly knowledge_cutoff: "2025-01-01";
    readonly supports: {
        readonly input: ["text", "image", "audio", "video", "document"];
        readonly output: ["text"];
        readonly capabilities: ["batch_api", "caching", "function_calling", "structured_output", "thinking"];
        readonly tools: ["code_execution", "file_search", "google_search", "url_context"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 0.25;
        };
        readonly output: {
            readonly normal: 1.5;
        };
    };
};
declare const GEMINI_3_1_FLASH_LITE_PREVIEW: {
    readonly name: "gemini-3.1-flash-lite-preview";
    readonly max_input_tokens: 1048576;
    readonly max_output_tokens: 65536;
    readonly knowledge_cutoff: "2025-01-01";
    readonly supports: {
        readonly input: ["text", "image", "audio", "video", "document"];
        readonly output: ["text"];
        readonly capabilities: ["batch_api", "caching", "function_calling", "structured_output", "thinking"];
        readonly tools: ["code_execution", "file_search", "google_search", "url_context"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 0.25;
        };
        readonly output: {
            readonly normal: 1.5;
        };
    };
};
declare const GEMINI_2_5_PRO: {
    readonly name: "gemini-2.5-pro";
    readonly max_input_tokens: 1048576;
    readonly max_output_tokens: 65536;
    readonly knowledge_cutoff: "2025-01-01";
    readonly supports: {
        readonly input: ["text", "image", "audio", "video", "document"];
        readonly output: ["text"];
        readonly capabilities: ["batch_api", "caching", "function_calling", "structured_output", "thinking"];
        readonly tools: ["code_execution", "file_search", "google_maps", "google_search", "url_context"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 2.5;
        };
        readonly output: {
            readonly normal: 15;
        };
    };
};
declare const GEMINI_2_5_FLASH: {
    readonly name: "gemini-2.5-flash";
    readonly max_input_tokens: 1048576;
    readonly max_output_tokens: 65536;
    readonly knowledge_cutoff: "2025-01-01";
    readonly supports: {
        readonly input: ["text", "image", "audio", "video"];
        readonly output: ["text"];
        readonly capabilities: ["batch_api", "caching", "function_calling", "structured_output", "thinking"];
        readonly tools: ["code_execution", "file_search", "google_maps", "google_search", "url_context"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 1;
        };
        readonly output: {
            readonly normal: 2.5;
        };
    };
};
declare const GEMINI_2_5_FLASH_LITE: {
    readonly name: "gemini-2.5-flash-lite";
    readonly max_input_tokens: 1048576;
    readonly max_output_tokens: 65536;
    readonly knowledge_cutoff: "2025-01-01";
    readonly supports: {
        readonly input: ["text", "image", "audio", "video", "document"];
        readonly output: ["text"];
        readonly capabilities: ["batch_api", "caching", "function_calling", "structured_output", "thinking"];
        readonly tools: ["code_execution", "google_maps", "google_search", "url_context"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 0.1;
        };
        readonly output: {
            readonly normal: 0.4;
        };
    };
};
declare const GEMINI_3_8_FLASH: {
    readonly name: "gemini-3.8-flash";
    readonly max_input_tokens: 1048576;
    readonly max_output_tokens: 65536;
    readonly knowledge_cutoff: "2026-03-01";
    readonly supports: {
        readonly input: ["text", "image", "video", "audio", "document"];
        readonly output: ["text"];
        readonly capabilities: ["agentic_video", "batch_api", "caching", "function_calling", "structured_output", "thinking"];
        readonly tools: ["code_execution", "file_search", "google_search", "google_maps", "url_context", "computer_use"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 0.75;
            readonly cached: 0.075;
        };
        readonly output: {
            readonly normal: 3.75;
        };
    };
};
declare const GEMINI_3_7_FLASH: {
    readonly name: "gemini-3.7-flash";
    readonly max_input_tokens: 1048576;
    readonly max_output_tokens: 65536;
    readonly knowledge_cutoff: "2026-03-01";
    readonly supports: {
        readonly input: ["text", "image", "video", "audio", "document"];
        readonly output: ["text"];
        readonly capabilities: ["agentic_video", "batch_api", "caching", "function_calling", "structured_output", "thinking"];
        readonly tools: ["code_execution", "file_search", "google_search", "google_maps", "url_context", "computer_use"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 0.75;
            readonly cached: 0.075;
        };
        readonly output: {
            readonly normal: 3.75;
        };
    };
};
declare const GEMINI_3_6_FLASH: {
    readonly name: "gemini-3.6-flash";
    readonly max_input_tokens: 1048576;
    readonly max_output_tokens: 65536;
    readonly knowledge_cutoff: "2026-03-01";
    readonly supports: {
        readonly input: ["text", "image", "video", "audio", "document"];
        readonly output: ["text"];
        readonly capabilities: ["agentic_video", "batch_api", "caching", "function_calling", "structured_output", "thinking"];
        readonly tools: ["code_execution", "file_search", "google_search", "google_maps", "url_context", "computer_use"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 1.5;
            readonly cached: 0.15;
        };
        readonly output: {
            readonly normal: 7.5;
        };
    };
};
declare const GEMINI_3_5_FLASH: {
    readonly name: "gemini-3.5-flash";
    readonly max_input_tokens: 1048576;
    readonly max_output_tokens: 65536;
    readonly supports: {
        readonly input: ["text", "image", "video", "document", "audio"];
        readonly output: ["text"];
        readonly capabilities: ["batch_api", "caching", "function_calling", "structured_output", "thinking"];
        readonly tools: ["code_execution", "file_search", "google_search", "google_maps", "url_context", "computer_use"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 1.5;
            readonly cached: 0.15;
        };
        readonly output: {
            readonly normal: 9;
        };
    };
};
declare const GEMINI_3_5_FLASH_LITE: {
    readonly name: "gemini-3.5-flash-lite";
    readonly max_input_tokens: 1048576;
    readonly max_output_tokens: 65536;
    readonly knowledge_cutoff: "2025-01-01";
    readonly supports: {
        readonly input: ["text", "image", "video", "audio", "document"];
        readonly output: ["text"];
        readonly capabilities: ["agentic_video", "batch_api", "caching", "function_calling", "structured_output", "thinking"];
        readonly tools: ["code_execution", "file_search", "google_search", "google_maps", "url_context"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 0.3;
            readonly cached: 0.03;
        };
        readonly output: {
            readonly normal: 2.5;
        };
    };
};
export declare const GEMINI_MODELS: readonly ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.1-pro-preview", "gemini-3-flash-preview", "gemini-3.1-flash-lite", "gemini-3.1-flash-lite-preview", "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"];
/**
 * Gemini models that support combining `tools` + `responseSchema` in a
 * single streaming `generateContent` call (per issue #605). Per the
 * provider matrix, Gemini 3.x natively interleaves the schema-constrained
 * answer with function-calling on one pass; Gemini 2.x is unsupported /
 * brittle and keeps the engine's legacy finalization fallback.
 */
export declare const GEMINI_COMBINED_TOOLS_AND_SCHEMA_MODELS: Set<string>;
export type GeminiModels = (typeof GEMINI_MODELS)[number];
/**
 * @deprecated Shut down 2026-06-25. Use `gemini-3.1-flash-image`.
 */
type Gemini31FlashImagePreviewModel = 'gemini-3.1-flash-image-preview';
/**
 * @deprecated Shut down 2026-06-25. Use `gemini-3-pro-image`.
 */
type Gemini3ProImagePreviewModel = 'gemini-3-pro-image-preview';
export type GeminiImageModels = Exclude<(typeof GEMINI_IMAGE_MODELS)[number], Gemini31FlashImagePreviewModel | Gemini3ProImagePreviewModel> | Gemini31FlashImagePreviewModel | Gemini3ProImagePreviewModel;
/**
 * Image generation models. GA ids come first; the trailing `-preview` ids are
 * shut-down aliases kept only so existing code keeps compiling — new code
 * should use the GA id above its alias.
 */
export declare const GEMINI_IMAGE_MODELS: readonly ["gemini-nano-banana-2.1", "gemini-3.1-flash-image", "gemini-3.1-flash-lite-image", "gemini-3-pro-image", "gemini-2.5-flash-image", "imagen-4.0-generate-001", "imagen-4.0-fast-generate-001", "imagen-4.0-ultra-generate-001", "gemini-3.1-flash-image-preview", "gemini-3-pro-image-preview"];
/**
 * Text-to-speech models
 * @experimental Gemini TTS is an experimental feature and may change.
 */
export declare const GEMINI_TTS_MODELS: readonly ["gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts", "gemini-2.5-pro-preview-tts"];
/**
 * Audio generation models (Lyria music generation).
 * @experimental Lyria music generation is an experimental feature and may change.
 */
export declare const GEMINI_AUDIO_MODELS: readonly ["lyria-3-pro-preview", "lyria-3-clip-preview"];
/**
 * Available voice names for Gemini TTS
 * @see https://ai.google.dev/gemini-api/docs/speech-generation
 */
export declare const GEMINI_TTS_VOICES: readonly ["Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Orus", "Aoede", "Callirrhoe", "Autonoe", "Enceladus", "Iapetus", "Umbriel", "Algieba", "Despina", "Erinome", "Algenib", "Rasalgethi", "Laomedeia", "Achernar", "Alnilam", "Schedar", "Gacrux", "Pulcherrima", "Achird", "Zubenelgenubi", "Vindemiatrix", "Sadachbia", "Sadaltager", "Sulafat"];
export type GeminiTTSVoice = (typeof GEMINI_TTS_VOICES)[number];
/**
 * Video generation models. Veo models run on the long-running
 * `:predictLongRunning` flow; Gemini Omni Flash runs on the Interactions
 * API — the video adapter routes by model.
 * @experimental Video generation is an experimental feature and may change.
 */
export declare const GEMINI_VIDEO_MODELS: readonly ["veo-3.1-generate-preview", "veo-3.1-fast-generate-preview", "veo-3.1-lite-generate-preview", "gemini-omni-1.1-flash"];
/**
 * Video models served by the Interactions API rather than Veo's
 * `:predictLongRunning` operations flow.
 * @experimental Omni video generation is an experimental feature and may change.
 */
export declare const GEMINI_INTERACTIONS_VIDEO_MODELS: readonly ["gemini-omni-1.1-flash"];
/**
 * Embedding models
 */
export declare const GEMINI_EMBEDDING_MODELS: readonly ["gemini-embedding-001"];
export type GeminiEmbeddingModel = (typeof GEMINI_EMBEDDING_MODELS)[number];
/**
 * Type-only map from embedding model name to its provider options type.
 */
export type GeminiEmbeddingModelProviderOptionsByName = {
    'gemini-embedding-001': GeminiEmbeddingProviderOptions;
};
/**
 * Per-model input modalities for embedding models. Gemini embedding models
 * are text-only, so image inputs fail at compile time.
 */
export type GeminiEmbeddingModelInputModalitiesByName = {
    'gemini-embedding-001': readonly ['text'];
};
export type GeminiChatModelProviderOptionsByName = {
    [GEMINI_3_8_FLASH.name]: GeminiToolConfigOptions & GeminiSafetyOptions & GeminiCommonConfigOptions & GeminiCachedContentOptions & GeminiStructuredOutputOptions;
    [GEMINI_3_7_FLASH.name]: GeminiToolConfigOptions & GeminiSafetyOptions & GeminiCommonConfigOptions & GeminiCachedContentOptions & GeminiStructuredOutputOptions;
    [GEMINI_3_6_FLASH.name]: GeminiToolConfigOptions & GeminiSafetyOptions & GeminiCommonConfigOptions & GeminiCachedContentOptions & GeminiStructuredOutputOptions;
    [GEMINI_3_5_FLASH.name]: GeminiToolConfigOptions & GeminiSafetyOptions & GeminiCommonConfigOptions & GeminiCachedContentOptions & GeminiStructuredOutputOptions;
    [GEMINI_3_5_FLASH_LITE.name]: GeminiToolConfigOptions & GeminiSafetyOptions & GeminiCommonConfigOptions & GeminiCachedContentOptions & GeminiStructuredOutputOptions;
    [GEMINI_3_1_PRO.name]: GeminiToolConfigOptions & GeminiSafetyOptions & GeminiCommonConfigOptions & GeminiCachedContentOptions & GeminiStructuredOutputOptions;
    [GEMINI_3_FLASH.name]: GeminiToolConfigOptions & GeminiSafetyOptions & GeminiCommonConfigOptions & GeminiCachedContentOptions & GeminiStructuredOutputOptions;
    [GEMINI_3_1_FLASH_LITE.name]: GeminiToolConfigOptions & GeminiSafetyOptions & GeminiCommonConfigOptions & GeminiCachedContentOptions & GeminiStructuredOutputOptions;
    [GEMINI_3_1_FLASH_LITE_PREVIEW.name]: GeminiToolConfigOptions & GeminiSafetyOptions & GeminiCommonConfigOptions & GeminiCachedContentOptions & GeminiStructuredOutputOptions;
    [GEMINI_2_5_PRO.name]: GeminiToolConfigOptions & GeminiSafetyOptions & GeminiCommonConfigOptions & GeminiCachedContentOptions & GeminiStructuredOutputOptions;
    [GEMINI_2_5_FLASH.name]: GeminiToolConfigOptions & GeminiSafetyOptions & GeminiCommonConfigOptions & GeminiCachedContentOptions & GeminiStructuredOutputOptions;
    [GEMINI_2_5_FLASH_LITE.name]: GeminiToolConfigOptions & GeminiSafetyOptions & GeminiCommonConfigOptions & GeminiCachedContentOptions & GeminiStructuredOutputOptions;
};
/**
 * Type-only map from chat model name to its supported tool capabilities.
 * Based on the 'supports.tools' arrays defined for each model.
 */
export type GeminiChatModelToolCapabilitiesByName = {
    [GEMINI_3_8_FLASH.name]: typeof GEMINI_3_8_FLASH.supports.tools;
    [GEMINI_3_7_FLASH.name]: typeof GEMINI_3_7_FLASH.supports.tools;
    [GEMINI_3_6_FLASH.name]: typeof GEMINI_3_6_FLASH.supports.tools;
    [GEMINI_3_5_FLASH.name]: typeof GEMINI_3_5_FLASH.supports.tools;
    [GEMINI_3_5_FLASH_LITE.name]: typeof GEMINI_3_5_FLASH_LITE.supports.tools;
    [GEMINI_3_1_PRO.name]: typeof GEMINI_3_1_PRO.supports.tools;
    [GEMINI_3_FLASH.name]: typeof GEMINI_3_FLASH.supports.tools;
    [GEMINI_3_1_FLASH_LITE.name]: typeof GEMINI_3_1_FLASH_LITE.supports.tools;
    [GEMINI_3_1_FLASH_LITE_PREVIEW.name]: typeof GEMINI_3_1_FLASH_LITE_PREVIEW.supports.tools;
    [GEMINI_2_5_PRO.name]: typeof GEMINI_2_5_PRO.supports.tools;
    [GEMINI_2_5_FLASH.name]: typeof GEMINI_2_5_FLASH.supports.tools;
    [GEMINI_2_5_FLASH_LITE.name]: typeof GEMINI_2_5_FLASH_LITE.supports.tools;
};
/**
 * Type-only map from chat model name to its supported input modalities.
 * Based on the 'supports.input' arrays defined for each model.
 * Note: 'document' in the model meta is mapped to 'document' modality.
 * Used by the core AI types to constrain ContentPart types based on the selected model.
 * Note: These must be inlined as readonly arrays (not typeof) because the model
 * constants are not exported and typeof references don't work in .d.ts files
 * when consumed by external packages.
 *
 * @see https://ai.google.dev/gemini-api/docs/vision
 * @see https://ai.google.dev/gemini-api/docs/audio
 * @see https://ai.google.dev/gemini-api/docs/document-processing
 */
export type GeminiModelInputModalitiesByName = {
    [GEMINI_3_8_FLASH.name]: typeof GEMINI_3_8_FLASH.supports.input;
    [GEMINI_3_7_FLASH.name]: typeof GEMINI_3_7_FLASH.supports.input;
    [GEMINI_3_6_FLASH.name]: typeof GEMINI_3_6_FLASH.supports.input;
    [GEMINI_3_5_FLASH.name]: typeof GEMINI_3_5_FLASH.supports.input;
    [GEMINI_3_5_FLASH_LITE.name]: typeof GEMINI_3_5_FLASH_LITE.supports.input;
    [GEMINI_3_1_PRO.name]: typeof GEMINI_3_1_PRO.supports.input;
    [GEMINI_3_FLASH.name]: typeof GEMINI_3_FLASH.supports.input;
    [GEMINI_3_1_FLASH_LITE.name]: typeof GEMINI_3_1_FLASH_LITE.supports.input;
    [GEMINI_3_1_FLASH_LITE_PREVIEW.name]: typeof GEMINI_3_1_FLASH_LITE_PREVIEW.supports.input;
    [GEMINI_2_5_PRO.name]: typeof GEMINI_2_5_PRO.supports.input;
    [GEMINI_2_5_FLASH_LITE.name]: typeof GEMINI_2_5_FLASH_LITE.supports.input;
    [GEMINI_2_5_FLASH.name]: typeof GEMINI_2_5_FLASH.supports.input;
};
/**
 * Runtime map from chat model name to its supported input modalities, for the
 * text adapter's `inputModalities`. `satisfies` keeps it equal to
 * {@link GeminiModelInputModalitiesByName}. An unknown name gives `undefined`.
 */
export declare const GEMINI_MODEL_INPUT_MODALITIES: Readonly<Record<string, ReadonlyArray<Modality>>>;
export {};
