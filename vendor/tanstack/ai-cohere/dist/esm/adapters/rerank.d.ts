import { BaseRerankAdapter } from '@tanstack/ai/adapters';
import { CohereClientConfig } from '../utils/client.js';
import { CohereRerankModel, InferCohereRerankProviderOptions } from '../model-meta.js';
import { RerankAdapterResult, RerankOptions } from '@tanstack/ai';
/**
 * Cohere rerank adapter.
 *
 * Talks to Cohere's `/v2/rerank` endpoint over raw `fetch` — no SDK. Returns
 * scored indices into the submitted documents; the `rerank()` activity maps
 * those back to the caller's original documents.
 */
export declare class CohereRerankAdapter<TModel extends CohereRerankModel> extends BaseRerankAdapter<TModel, InferCohereRerankProviderOptions<TModel>> {
    readonly name: "cohere";
    private readonly apiKey;
    private readonly baseUrl;
    private readonly headers;
    constructor(config: CohereClientConfig, model: TModel);
    rerank(options: RerankOptions<InferCohereRerankProviderOptions<TModel>>): Promise<RerankAdapterResult>;
}
/**
 * Creates a Cohere rerank adapter with an explicit API key. Type resolution
 * (per-model provider options) happens here at the call site.
 *
 * @example
 * ```typescript
 * const adapter = createCohereRerank('rerank-v3.5', 'co-...')
 * ```
 */
export declare function createCohereRerank<TModel extends CohereRerankModel>(model: TModel, apiKey: string, config?: Omit<CohereClientConfig, 'apiKey'>): CohereRerankAdapter<TModel>;
/**
 * Creates a Cohere rerank adapter, reading `COHERE_API_KEY` from the
 * environment.
 *
 * @throws Error if `COHERE_API_KEY` is not found.
 *
 * @example
 * ```typescript
 * import { rerank } from '@tanstack/ai'
 * import { cohereRerank } from '@tanstack/ai-cohere'
 *
 * const { rerankedDocuments } = await rerank({
 *   adapter: cohereRerank('rerank-v3.5'),
 *   query: 'talk about rain',
 *   documents: ['sunny day', 'rainy afternoon'],
 * })
 * ```
 */
export declare function cohereRerank<TModel extends CohereRerankModel>(model: TModel, config?: Omit<CohereClientConfig, 'apiKey'>): CohereRerankAdapter<TModel>;
