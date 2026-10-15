export declare class MistralVertexAuthError extends Error {
    constructor(message: string, options?: ErrorOptions);
}
export type VertexAuthClient = {
    getRequestHeaders: (url?: string | URL) => Promise<Headers>;
};
/**
 * Public Vertex config for Mistral. `project` and `location` match the
 * Gemini Vertex factories so one auth object works for both.
 *
 * Mistral on Vertex is regional only (`us-central1`, `europe-west4`).
 * There is no global endpoint.
 */
export type MistralVertexConfig = {
    project?: string;
    location?: string;
    /**
     * Override the chat completions URL. When set, the Vertex
     * `:rawPredict` / `:streamRawPredict` rewrite is skipped. Used by e2e.
     */
    resolveRequestUrl?: (stream: boolean) => string;
    getAccessToken?: () => Promise<string>;
    authClient?: VertexAuthClient;
    defaultHeaders?: Record<string, string>;
};
export declare function resolveMistralVertexProject(config: MistralVertexConfig): string | undefined;
export declare function resolveMistralVertexLocation(config: MistralVertexConfig): string;
export declare function resolveMistralVertexModelUrl(model: string, config: MistralVertexConfig): string;
export declare function resolveMistralVertexAccessToken(config: MistralVertexConfig): Promise<string>;
