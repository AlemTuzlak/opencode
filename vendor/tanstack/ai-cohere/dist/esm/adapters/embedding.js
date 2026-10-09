import { getCohereApiKeyFromEnv, resolveCohereTransport } from "../utils/client.js";
import { BaseEmbeddingAdapter } from "@tanstack/ai/adapters";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
import { arrayBufferToBase64, generateId } from "@tanstack/ai-utils";
import { isFileSource, resolveEmbeddingInput, unsupportedFileSourceError } from "@tanstack/ai";
//#region src/adapters/embedding.ts
var DEFAULT_TIMEOUT_MS = 3e4;
/**
* Returns true when `url` is malformed, non-http(s), or targets a private /
* loopback / link-local host. Used to block SSRF via `allowUrlFetch`.
*/
function isPrivateOrInternalUrl(url) {
	let parsed;
	try {
		parsed = new URL(url);
	} catch {
		return true;
	}
	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return true;
	const host = parsed.hostname.toLowerCase();
	if (host === "localhost" || host.endsWith(".localhost") || host === "::1" || host === "[::1]" || host.startsWith("127.") || host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("169.254.") || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) return true;
	return false;
}
async function fetchWithTimeout(url, init, timeoutMs) {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
	try {
		return await fetch(url, {
			...init,
			signal: controller.signal
		});
	} finally {
		clearTimeout(timeoutId);
	}
}
/**
* Cohere Embedding Adapter
*
* Tree-shakeable adapter for Cohere multimodal embeddings (embed-v4.0),
* implemented with plain `fetch` against the v2/embed endpoint — no Cohere
* SDK dependency.
*
* Features:
* - Batch embedding (one request for the whole input array)
* - Multimodal inputs: text, images, and fused text+image items (one vector
*   per input item)
* - Matryoshka dimension reduction via the top-level `dimensions` option
*   (mapped to Cohere's `output_dimension`)
*/
var CohereEmbeddingAdapter = class extends BaseEmbeddingAdapter {
	name = "cohere";
	clientConfig;
	constructor(config, model) {
		super(model, {});
		this.clientConfig = config;
	}
	async createEmbeddings(options) {
		const { model, logger, modelOptions } = options;
		try {
			const inputType = modelOptions?.inputType;
			if (!inputType) throw new Error(`Cohere embeddings require modelOptions.inputType ('search_document' | 'search_query' | 'classification' | 'clustering').`);
			const resolved = resolveEmbeddingInput(options.input);
			const inputs = await Promise.all(resolved.map(async (item) => {
				const content = item.texts.map((text) => ({
					type: "text",
					text
				}));
				for (const image of item.images) content.push({
					type: "image_url",
					image_url: { url: await this.resolveImageUrl(image) }
				});
				return { content };
			}));
			const body = {
				model,
				inputs,
				input_type: inputType,
				embedding_types: ["float"]
			};
			const truncate = modelOptions?.truncate;
			if (truncate !== void 0) body.truncate = truncate;
			if (options.dimensions !== void 0) body.output_dimension = options.dimensions;
			logger.request(`activity=embed provider=${this.name} model=${model} inputs=${inputs.length}`, {
				provider: this.name,
				model
			});
			const timeoutMs = this.clientConfig.timeout ?? DEFAULT_TIMEOUT_MS;
			const transport = resolveCohereTransport(this.clientConfig);
			const response = await fetchWithTimeout(`${transport.baseUrl}/v2/embed`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.clientConfig.apiKey}`,
					"Content-Type": "application/json",
					...transport.headers
				},
				body: JSON.stringify(body)
			}, timeoutMs);
			if (!response.ok) {
				const bodyText = await response.text();
				let message = bodyText;
				try {
					const parsed = JSON.parse(bodyText);
					if (typeof parsed === "object" && parsed !== null && "message" in parsed && typeof parsed.message === "string") message = parsed.message;
				} catch {}
				throw new Error(`Cohere embed failed (${response.status}): ${message}`);
			}
			const data = await response.json();
			const vectors = data.embeddings?.float;
			if (!vectors) throw new Error("Cohere embed response did not include float embeddings");
			if (vectors.length !== inputs.length) throw new Error(`Cohere embed returned ${vectors.length} embeddings for ${inputs.length} inputs`);
			const result = {
				id: generateId(this.name),
				model,
				embeddings: vectors.map((vector, index) => ({
					vector,
					index
				}))
			};
			const inputTokens = data.meta?.billed_units?.input_tokens;
			if (inputTokens !== void 0) result.usage = {
				promptTokens: inputTokens,
				completionTokens: 0,
				totalTokens: inputTokens
			};
			return result;
		} catch (error) {
			logger.errors(`${this.name}.createEmbeddings fatal`, {
				error: toRunErrorPayload(error, `${this.name}.createEmbeddings failed`),
				source: `${this.name}.createEmbeddings`
			});
			throw error;
		}
	}
	/**
	* Resolves an image part to a URL Cohere accepts. Cohere does not fetch
	* remote image URLs, so everything is normalized to a `data:` URI unless
	* the caller already provided one.
	*/
	async resolveImageUrl(image) {
		const source = image.source;
		if (isFileSource(source)) throw unsupportedFileSourceError(this.name);
		if (source.type === "data") return `data:${source.mimeType};base64,${source.value}`;
		if (source.value.startsWith("data:")) return source.value;
		if (!this.clientConfig.allowUrlFetch) throw new Error("Cohere does not fetch remote image URLs; pass base64 data or a data: URI (or enable config.allowUrlFetch to have the adapter download it)");
		if (isPrivateOrInternalUrl(source.value)) throw new Error(`Refusing to fetch internal or private URL for Cohere embedding: ${source.value}`);
		const response = await fetchWithTimeout(source.value, void 0, this.clientConfig.timeout ?? DEFAULT_TIMEOUT_MS);
		if (!response.ok) throw new Error(`Failed to fetch image URL for Cohere embedding (${response.status}): ${source.value}`);
		return `data:${response.headers.get("content-type") ?? source.mimeType ?? "application/octet-stream"};base64,${arrayBufferToBase64(await response.arrayBuffer())}`;
	}
};
/**
* Creates a Cohere embedding adapter with explicit API key.
* Type resolution happens here at the call site.
*
* @param model - The model name (e.g., 'embed-v4.0')
* @param apiKey - Your Cohere API key
* @param config - Optional additional configuration
* @returns Configured Cohere embedding adapter instance with resolved types
*
* @example
* ```typescript
* const adapter = createCohereEmbedding('embed-v4.0', 'api_key');
*
* const result = await embed({
*   adapter,
*   input: 'a red guitar',
*   modelOptions: { inputType: 'search_document' }
* });
* ```
*/
function createCohereEmbedding(model, apiKey, config) {
	return new CohereEmbeddingAdapter({
		apiKey,
		...config
	}, model);
}
/**
* Creates a Cohere embedding adapter using the `COHERE_API_KEY` environment variable.
* Type resolution happens here at the call site.
*
* Looks for `COHERE_API_KEY` in:
* - `process.env` (Node.js)
* - `window.env` (Browser with injected env)
*
* @param model - The model name (e.g., 'embed-v4.0')
* @param config - Optional configuration (excluding apiKey which is auto-detected)
* @returns Configured Cohere embedding adapter instance with resolved types
* @throws Error if COHERE_API_KEY is not found in environment
*
* @example
* ```typescript
* // Automatically uses COHERE_API_KEY from environment
* const adapter = cohereEmbedding('embed-v4.0');
*
* const result = await embed({
*   adapter,
*   input: ['a red guitar', 'a blue drum kit'],
*   modelOptions: { inputType: 'search_query' },
*   dimensions: 1024
* });
*
* console.log(result.embeddings[0].vector)
* ```
*/
function cohereEmbedding(model, config) {
	return createCohereEmbedding(model, getCohereApiKeyFromEnv(), config);
}
//#endregion
export { CohereEmbeddingAdapter, cohereEmbedding, createCohereEmbedding };

//# sourceMappingURL=embedding.js.map