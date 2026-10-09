import { AnthropicVertex } from '@anthropic-ai/vertex-sdk';
import { ModelReasoning } from '@tanstack/ai';
export declare class AnthropicVertexAuthError extends Error {
    constructor(message: string);
}
type VertexSdkOptions = NonNullable<ConstructorParameters<typeof AnthropicVertex>[0]>;
/**
 * Public Vertex config for Claude. `project` and `location` match the Gemini
 * Vertex factories so one auth object works for both.
 */
export type AnthropicVertexConfig = Omit<VertexSdkOptions, 'projectId' | 'region'> & {
    project?: string;
    location?: string;
    /** See `AnthropicTextConfig.reasoning`. It does not go to the Vertex SDK. */
    reasoning?: ModelReasoning;
};
export declare function resolveAnthropicVertexOptions(config?: AnthropicVertexConfig): VertexSdkOptions;
export {};
