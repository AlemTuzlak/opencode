import { GeminiClientConfig } from '@tanstack/ai-gemini';
export type VertexClientConfig = Omit<GeminiClientConfig, 'vertexai' | 'enterprise'>;
export type VertexVideoConfig = VertexClientConfig & {
    allowUrlFetch?: boolean;
};
/**
 * Resolves Vertex Gemini client options.
 *
 * Factory fields win. Then env. Then ADC inside `@google/genai`.
 * Does not read `GEMINI_API_KEY` or `GOOGLE_API_KEY`.
 */
export declare function resolveVertexGeminiOptions(config?: VertexClientConfig): GeminiClientConfig;
