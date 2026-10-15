import { BaseEmbeddingAdapter } from '@tanstack/ai/adapters';
import { BedrockRuntimeClient, BedrockRuntimeClientConfig } from '@aws-sdk/client-bedrock-runtime';
import { EmbeddingOptions, EmbeddingResult } from '@tanstack/ai';
import { ResolvedBedrockAuth } from '../utils/auth.js';
import { BedrockClientConfig } from '../utils/client.js';
import { BedrockEmbeddingModel, BedrockEmbeddingModelInputModalitiesByName, BedrockEmbeddingModelProviderOptionsByName, ResolveEmbeddingProviderOptions } from '../model-meta.js';
import type * as BedrockRuntime from '@aws-sdk/client-bedrock-runtime';
/**
 * Config for the Bedrock embedding adapter — the same auth surface as the
 * other Bedrock adapters (apiKey → env → SigV4 via `resolveBedrockAuth`),
 * minus the OpenAI-compat client options that don't apply to `InvokeModel`.
 */
export interface BedrockEmbeddingConfig extends Pick<BedrockClientConfig, 'apiKey' | 'region' | 'auth' | 'baseURL'> {
}
/**
 * Bedrock Embedding Adapter
 *
 * Tree-shakeable adapter for embeddings served through Bedrock's native
 * `InvokeModel` API (embedding models have no Converse surface). Each model
 * family has its own JSON body dialect:
 *
 * - `amazon.titan-embed-text-v2:0` — text-only, ONE text per call; the batch
 *   is fanned out with a small concurrency cap and per-call
 *   `inputTextTokenCount`s are summed into usage.
 * - `amazon.titan-embed-image-v1` — MULTIMODAL: text, image, or a fused
 *   text+image item embedded into a single vector; one item per call.
 * - `cohere.embed-english-v3` / `cohere.embed-multilingual-v3` — text-only,
 *   batched natively (chunked at 96 texts per call). `inputType` is required.
 *
 * The SDK call lives behind a protected `invokeModel` seam so tests can
 * subclass and inject canned response bodies without a real AWS request, and
 * the AWS SDK itself is imported lazily (it's Node/server-only).
 */
export declare class BedrockEmbeddingAdapter<TModel extends BedrockEmbeddingModel, TProviderOptions extends Record<string, any> = ResolveEmbeddingProviderOptions<TModel>> extends BaseEmbeddingAdapter<TModel, TProviderOptions, BedrockEmbeddingModelProviderOptionsByName, BedrockEmbeddingModelInputModalitiesByName> {
    readonly name: "bedrock";
    private clientPromise?;
    private readonly clientConfig;
    constructor(config: BedrockEmbeddingConfig, model: TModel);
    /**
     * Dynamically import `@aws-sdk/client-bedrock-runtime`. The specifier is
     * held in a variable (not a string literal) so bundler dep scanners cannot
     * statically discover the AWS SDK and try to pre-bundle it for the browser.
     * Same pattern as the Converse text adapter.
     */
    protected importBedrockRuntime(): Promise<typeof BedrockRuntime>;
    /**
     * Lazily construct the `BedrockRuntimeClient`, deferring
     * `resolveBedrockAuth` until a real request is made.
     */
    protected getClient(): Promise<BedrockRuntimeClient>;
    /**
     * Map resolved auth + endpoint to a `BedrockRuntimeClientConfig`. Bearer
     * auth needs `authSchemePreference` pinned or the SDK still tries SigV4
     * first — same reasoning as the Converse text adapter.
     */
    protected buildClientConfig(resolved: ResolvedBedrockAuth, region: string, endpoint: string | undefined): BedrockRuntimeClientConfig;
    /** Send one InvokeModel call and parse its JSON response body. */
    protected invokeModel(modelId: string, body: Record<string, unknown>): Promise<unknown>;
    createEmbeddings(options: EmbeddingOptions<TProviderOptions>): Promise<EmbeddingResult>;
    /**
     * `amazon.titan-embed-text-v2:0` — one text per InvokeModel call, fanned
     * out with a concurrency cap; result order matches input order and per-call
     * `inputTextTokenCount`s are summed into usage.
     */
    private embedTitanText;
    /**
     * `amazon.titan-embed-image-v1` (Titan Multimodal) — one item per
     * InvokeModel call. An item may carry text, an image, or both (a fused
     * item embedded into a single vector). Titan accepts at most one image per
     * request and never fetches remote URLs.
     */
    private embedTitanImage;
    /**
     * `cohere.embed-*-v3` — natively batched (chunked at 96 texts per call,
     * order preserved across chunks). `inputType` is required by the Cohere
     * API; output dimensionality is fixed, so `dimensions` is rejected.
     */
    private embedCohere;
    /** Assemble an EmbeddingResult from per-item Titan responses. */
    private toTitanResult;
}
/**
 * Creates a Bedrock embedding adapter with an explicit API key (bearer).
 * Type resolution happens here at the call site.
 *
 * @param model - The model name (e.g., 'amazon.titan-embed-text-v2:0')
 * @param apiKey - Your Bedrock API key
 * @param config - Optional additional configuration (region, baseURL, ...)
 * @returns Configured Bedrock embedding adapter instance with resolved types
 *
 * @example
 * ```typescript
 * const adapter = createBedrockEmbedding(
 *   'amazon.titan-embed-text-v2:0',
 *   'bedrock-api-key',
 * );
 *
 * const result = await embed({
 *   adapter,
 *   input: 'a red guitar',
 * });
 * ```
 */
export declare function createBedrockEmbedding<TModel extends BedrockEmbeddingModel>(model: TModel, apiKey: string, config?: Omit<BedrockEmbeddingConfig, 'apiKey'>): BedrockEmbeddingAdapter<TModel>;
/**
 * Creates a Bedrock embedding adapter using the ambient auth cascade:
 * `config.apiKey` → `BEDROCK_API_KEY` → `AWS_BEARER_TOKEN_BEDROCK` → SigV4
 * (AWS credential provider chain). Auth resolves lazily on the first
 * request, so `auth: 'sigv4'` never requires an API key.
 *
 * @param model - The model name (e.g., 'cohere.embed-english-v3')
 * @param config - Optional configuration (region, auth, baseURL, ...)
 * @returns Configured Bedrock embedding adapter instance with resolved types
 *
 * @example
 * ```typescript
 * const adapter = bedrockEmbedding('cohere.embed-english-v3');
 *
 * const result = await embed({
 *   adapter,
 *   input: ['a red guitar', 'a blue drum kit'],
 *   modelOptions: { inputType: 'search_document' },
 * });
 *
 * console.log(result.embeddings[0].vector)
 * ```
 */
export declare function bedrockEmbedding<TModel extends BedrockEmbeddingModel>(model: TModel, config?: BedrockEmbeddingConfig): BedrockEmbeddingAdapter<TModel>;
