import { TokenUsage } from '@tanstack/ai';
import { GenerateContentResponseUsageMetadata } from '@google/genai';
/**
 * Flattened modality token counts for normalized usage reporting.
 * Maps Gemini's ModalityTokenCount array to individual fields.
 */
export interface FlattenedModalityTokens {
    /** Text tokens */
    textTokens?: number;
    /** Image tokens */
    imageTokens?: number;
    /** Audio tokens */
    audioTokens?: number;
    /** Video tokens */
    videoTokens?: number;
    /** Document tokens (e.g. PDF inputs) */
    documentTokens?: number;
}
/**
 * Flattens Gemini's ModalityTokenCount array into individual token fields.
 * Extracts TEXT, IMAGE, AUDIO, VIDEO, DOCUMENT modality counts into a
 * normalized structure.
 */
export declare function flattenModalityTokenCounts(modalities?: Array<{
    modality?: string;
    tokenCount?: number;
}>): FlattenedModalityTokens;
/**
 * Checks if a FlattenedModalityTokens object has any values set.
 */
export declare function hasModalityTokens(tokens: FlattenedModalityTokens): boolean;
/**
 * Gemini-specific provider usage details.
 * These fields are unique to Gemini and placed in providerUsageDetails.
 */
export type GeminiProviderUsageDetails = {
    /**
     * The traffic type for this request.
     * Can indicate whether request was handled by different service tiers.
     */
    trafficType?: string;
    /**
     * Number of tokens in the results from tool executions,
     * which are provided back to the model as input.
     */
    toolUsePromptTokenCount?: number;
    /**
     * Detailed breakdown by modality of the token counts from
     * the results of tool executions.
     */
    toolUsePromptTokensDetails?: Array<{
        modality: string;
        tokenCount: number;
    }>;
    /**
     * Detailed breakdown of cache tokens by modality.
     * More granular than the normalized cachedTokens field.
     */
    cacheTokensDetails?: Array<{
        modality: string;
        tokenCount: number;
    }>;
};
/**
 * Build normalized TokenUsage from Gemini's usageMetadata.
 * Handles modality breakdowns and thinking tokens. Returns `undefined` when the
 * provider reported no usage metadata, so callers omit the field rather than
 * fabricating zeroed totals.
 */
export declare function buildGeminiUsage(usageMetadata: GenerateContentResponseUsageMetadata | undefined | null): TokenUsage<GeminiProviderUsageDetails> | undefined;
