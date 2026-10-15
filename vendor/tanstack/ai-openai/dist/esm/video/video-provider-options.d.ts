import { DurationOptions, VideoDurationSpell } from '@tanstack/ai/adapters';
/**
 * Supported video sizes for OpenAI Sora video generation.
 * Based on the official API documentation.
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export type OpenAIVideoSize = '1280x720' | '720x1280' | '1792x1024' | '1024x1792';
/**
 * Wire values for the Sora `seconds` parameter. The API stores these as
 * strings: `'4'`, `'8'`, or `'12'`.
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export type OpenAIVideoSeconds = '4' | '8' | '12';
/**
 * Spellings of a Sora clip length. Both `sora-2` and `sora-2-pro` accept
 * 4, 8, or 12 seconds (Videos API, checked 2026-09-28). There is no `"auto"`.
 * Callers may pass the number, the numeric string, or a `"4s"` template.
 * The adapter sends {@link OpenAIVideoSeconds}.
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export type OpenAIVideoDuration = VideoDurationSpell<4 | 8 | 12>;
/**
 * Provider-specific options for OpenAI video generation.
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export interface OpenAIVideoProviderOptions {
    /**
     * Video size in WIDTHxHEIGHT format.
     * Supported: '1280x720', '720x1280', '1792x1024', '1024x1792'
     */
    size?: OpenAIVideoSize;
    /**
     * Video duration in seconds.
     * Supported values: 4, 8, or 12 seconds.
     */
    seconds?: OpenAIVideoSeconds;
}
/**
 * Model-specific provider options mapping.
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export type OpenAIVideoModelProviderOptionsByName = {
    'sora-2': OpenAIVideoProviderOptions;
    'sora-2-pro': OpenAIVideoProviderOptions;
};
/**
 * Model-specific provider options mapping.
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export type OpenAIVideoModelSizeByName = {
    'sora-2': OpenAIVideoSize;
    'sora-2-pro': OpenAIVideoSize;
};
/**
 * Per-model duration union. Same vocabulary on both Sora models.
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export type OpenAIVideoModelDurationByName = {
    'sora-2': OpenAIVideoDuration;
    'sora-2-pro': OpenAIVideoDuration;
};
/**
 * Runtime duration table backing `availableDurations()` / `snapDuration()`.
 * `snapDuration` returns the API string (`'4' | '8' | '12'`).
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export declare const OPENAI_VIDEO_DURATIONS: {
    readonly 'sora-2': {
        readonly kind: "discrete";
        readonly values: readonly ["4", "8", "12"];
    };
    readonly 'sora-2-pro': {
        readonly kind: "discrete";
        readonly values: readonly ["4", "8", "12"];
    };
};
/**
 * Look up the duration options for a Sora model.
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export declare function getOpenAIVideoDurationOptions<TModel extends keyof OpenAIVideoModelDurationByName>(model: TModel): DurationOptions<OpenAIVideoSeconds>;
/**
 * Per-model prompt input modalities. Sora models accept a single image part
 * in the prompt, mapped to the API's `input_reference` field.
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export type OpenAIVideoModelInputModalitiesByName = {
    'sora-2': readonly ['image'];
    'sora-2-pro': readonly ['image'];
};
/**
 * Validate video size for a given model.
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export declare function validateVideoSize(model: string, size?: string): asserts size is OpenAIVideoSize | undefined;
/**
 * Validate a Sora duration. Accepts `4`, `"4"`, and `"4s"` (and 8, 12).
 * Rejects other lengths, including `"6s"` and `"auto"`.
 *
 * @experimental Video generation is an experimental feature and may change.
 */
export declare function validateVideoSeconds(model: string, seconds?: number | string): asserts seconds is OpenAIVideoDuration | undefined;
/**
 * Convert a duration spelling to the API string (`'4' | '8' | '12'`).
 */
export declare function toApiSeconds(seconds: number | string | undefined): OpenAIVideoSeconds | undefined;
