export declare class GrokVertexAuthError extends Error {
    constructor(message: string, options?: ErrorOptions);
}
export type VertexAuthClient = {
    getRequestHeaders: (url?: string | URL) => Promise<Headers>;
};
/**
 * Public Vertex config for Grok. `project` and `location` match the Gemini
 * Vertex factories so one auth object works for both.
 *
 * Default location is `global`. Grok on Vertex uses the OpenAI-compatible
 * Responses endpoint under `/endpoints/openapi`.
 */
export type GrokVertexConfig = {
    project?: string;
    location?: string;
    /** Override the OpenAI-compatible Vertex base URL. Used by e2e. */
    baseURL?: string;
    getAccessToken?: () => Promise<string>;
    authClient?: VertexAuthClient;
    defaultHeaders?: Record<string, string>;
};
export declare function toVertexGrokModelId(model: string): string;
export declare function resolveGrokVertexProject(config: GrokVertexConfig): string | undefined;
export declare function resolveGrokVertexLocation(config: GrokVertexConfig): string;
export declare function resolveGrokVertexBaseURL(config: GrokVertexConfig): string;
export declare function resolveGrokVertexAccessToken(config: GrokVertexConfig): Promise<string>;
