import { resolveBedrockAuth } from "../utils/auth.js";
import { BEDROCK_EMBEDDING_MODELS } from "../model-meta.js";
import { isFileSource, requireTextOnlyEmbeddingInput, resolveEmbeddingInput, unsupportedFileSourceError } from "@tanstack/ai";
import { BaseEmbeddingAdapter } from "@tanstack/ai/adapters";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
//#region src/adapters/embedding.ts
/** InvokeModel calls issued concurrently during a per-item fan-out. */
var MAX_CONCURRENT_INVOCATIONS = 5;
/** Valid `dimensions` for `amazon.titan-embed-text-v2:0`. */
var TITAN_TEXT_DIMENSIONS = [
	256,
	512,
	1024
];
/** Valid `dimensions` (outputEmbeddingLength) for `amazon.titan-embed-image-v1`. */
var TITAN_IMAGE_DIMENSIONS = [
	256,
	384,
	1024
];
var TITAN_IMAGE_DEFAULT_DIMENSIONS = 1024;
/** Cohere embed accepts at most 96 texts per InvokeModel call. */
var COHERE_MAX_BATCH_SIZE = 96;
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
var BedrockEmbeddingAdapter = class extends BaseEmbeddingAdapter {
	name = "bedrock";
	clientPromise;
	clientConfig;
	constructor(config, model) {
		super(model, {});
		this.clientConfig = config;
	}
	/**
	* Dynamically import `@aws-sdk/client-bedrock-runtime`. The specifier is
	* held in a variable (not a string literal) so bundler dep scanners cannot
	* statically discover the AWS SDK and try to pre-bundle it for the browser.
	* Same pattern as the Converse text adapter.
	*/
	importBedrockRuntime() {
		return import(
			/* @vite-ignore */
			"@aws-sdk/client-bedrock-runtime"
);
	}
	/**
	* Lazily construct the `BedrockRuntimeClient`, deferring
	* `resolveBedrockAuth` until a real request is made.
	*/
	async getClient() {
		if (!this.clientPromise) this.clientPromise = (async () => {
			const { BedrockRuntimeClient } = await this.importBedrockRuntime();
			const region = this.clientConfig.region ?? "us-east-1";
			const resolved = resolveBedrockAuth({
				apiKey: this.clientConfig.apiKey,
				region,
				auth: this.clientConfig.auth
			}, "runtime");
			return new BedrockRuntimeClient(this.buildClientConfig(resolved, region, this.clientConfig.baseURL));
		})().catch((error) => {
			this.clientPromise = void 0;
			throw error;
		});
		return this.clientPromise;
	}
	/**
	* Map resolved auth + endpoint to a `BedrockRuntimeClientConfig`. Bearer
	* auth needs `authSchemePreference` pinned or the SDK still tries SigV4
	* first — same reasoning as the Converse text adapter.
	*/
	buildClientConfig(resolved, region, endpoint) {
		if (resolved.kind === "bearer") return {
			region,
			token: { token: resolved.token },
			authSchemePreference: ["httpBearerAuth"],
			...endpoint ? { endpoint } : {}
		};
		return {
			region: resolved.region,
			credentials: resolved.credentials,
			...endpoint ? { endpoint } : {}
		};
	}
	/** Send one InvokeModel call and parse its JSON response body. */
	async invokeModel(modelId, body) {
		const { InvokeModelCommand } = await this.importBedrockRuntime();
		const response = await (await this.getClient()).send(new InvokeModelCommand({
			modelId,
			contentType: "application/json",
			accept: "application/json",
			body: JSON.stringify(body)
		}));
		return JSON.parse(new TextDecoder().decode(response.body));
	}
	async createEmbeddings(options) {
		const { model, logger } = options;
		try {
			logger.request(`activity=embed provider=${this.name} model=${model} inputs=${options.input.length}`, {
				provider: this.name,
				model
			});
			switch (model) {
				case "amazon.titan-embed-text-v2:0": return await this.embedTitanText(options);
				case "amazon.titan-embed-image-v1": return await this.embedTitanImage(options);
				case "cohere.embed-english-v3":
				case "cohere.embed-multilingual-v3": return await this.embedCohere(options);
				default: throw new Error(`Unknown Bedrock embedding model "${model}". Supported models: ${BEDROCK_EMBEDDING_MODELS.join(", ")}.`);
			}
		} catch (error) {
			logger.errors(`${this.name}.createEmbeddings fatal`, {
				error: toRunErrorPayload(error, `${this.name}.createEmbeddings failed`),
				source: `${this.name}.createEmbeddings`
			});
			throw error;
		}
	}
	/**
	* `amazon.titan-embed-text-v2:0` — one text per InvokeModel call, fanned
	* out with a concurrency cap; result order matches input order and per-call
	* `inputTextTokenCount`s are summed into usage.
	*/
	async embedTitanText(options) {
		const { model, dimensions } = options;
		if (dimensions !== void 0 && !TITAN_TEXT_DIMENSIONS.includes(dimensions)) throw new Error(`${model} supports dimensions 256, 512, or 1024; got ${dimensions}`);
		const normalize = options.modelOptions?.normalize;
		const responses = await mapWithConcurrency(requireTextOnlyEmbeddingInput(options.input, this.name, model), MAX_CONCURRENT_INVOCATIONS, async (text) => {
			const body = { inputText: text };
			if (dimensions !== void 0) body.dimensions = dimensions;
			if (normalize !== void 0) body.normalize = normalize;
			return readTitanEmbeddingBody(await this.invokeModel(model, body), `${this.name} ${model}`);
		});
		return this.toTitanResult(model, responses);
	}
	/**
	* `amazon.titan-embed-image-v1` (Titan Multimodal) — one item per
	* InvokeModel call. An item may carry text, an image, or both (a fused
	* item embedded into a single vector). Titan accepts at most one image per
	* request and never fetches remote URLs.
	*/
	async embedTitanImage(options) {
		const { model, dimensions } = options;
		const outputEmbeddingLength = dimensions ?? TITAN_IMAGE_DEFAULT_DIMENSIONS;
		if (!TITAN_IMAGE_DIMENSIONS.includes(outputEmbeddingLength)) throw new Error(`${model} supports dimensions 256, 384, or 1024; got ${outputEmbeddingLength}`);
		const responses = await mapWithConcurrency(resolveEmbeddingInput(options.input), MAX_CONCURRENT_INVOCATIONS, async (item, index) => {
			if (item.images.length > 1) throw new Error(`${model} accepts at most one image per input item; input item at index ${index} contains ${item.images.length} images. Pass them as separate input items (one vector each).`);
			const body = { embeddingConfig: { outputEmbeddingLength } };
			if (item.texts.length > 0) body.inputText = item.texts.join("\n");
			const image = item.images[0];
			if (image) body.inputImage = toTitanInputImage(image, model);
			return readTitanEmbeddingBody(await this.invokeModel(model, body), `${this.name} ${model}`);
		});
		return this.toTitanResult(model, responses);
	}
	/**
	* `cohere.embed-*-v3` — natively batched (chunked at 96 texts per call,
	* order preserved across chunks). `inputType` is required by the Cohere
	* API; output dimensionality is fixed, so `dimensions` is rejected.
	*/
	async embedCohere(options) {
		const { model, dimensions } = options;
		if (dimensions !== void 0) throw new Error(`${model} does not support the dimensions option; its output size is fixed`);
		const inputType = options.modelOptions?.inputType;
		if (inputType === void 0) throw new Error(`${model} requires modelOptions.inputType ('search_document' | 'search_query' | 'classification' | 'clustering')`);
		const truncate = options.modelOptions?.truncate;
		const responses = await mapWithConcurrency(chunk(requireTextOnlyEmbeddingInput(options.input, this.name, model), COHERE_MAX_BATCH_SIZE), MAX_CONCURRENT_INVOCATIONS, async (batch) => {
			const body = {
				texts: batch,
				input_type: inputType
			};
			if (truncate !== void 0) body.truncate = truncate;
			return readCohereEmbeddingBody(await this.invokeModel(model, body), `${this.name} ${model}`);
		});
		return {
			id: this.generateId(),
			model,
			embeddings: responses.flat().map((vector, index) => ({
				vector,
				index
			}))
		};
	}
	/** Assemble an EmbeddingResult from per-item Titan responses. */
	toTitanResult(model, responses) {
		let promptTokens = 0;
		const embeddings = responses.map((response, index) => {
			promptTokens += response.inputTextTokenCount;
			return {
				vector: response.embedding,
				index
			};
		});
		const usage = {
			promptTokens,
			completionTokens: 0,
			totalTokens: promptTokens
		};
		return {
			id: this.generateId(),
			model,
			embeddings,
			usage
		};
	}
};
function isRecord(value) {
	return typeof value === "object" && value !== null;
}
/** Narrow a Titan InvokeModel JSON body: `{ embedding, inputTextTokenCount? }`. */
function readTitanEmbeddingBody(raw, context) {
	const embedding = isRecord(raw) && Array.isArray(raw.embedding) ? raw.embedding : void 0;
	if (!embedding) throw new Error(`${context}: response body is missing the "embedding" array`);
	return {
		embedding,
		inputTextTokenCount: isRecord(raw) && typeof raw.inputTextTokenCount === "number" ? raw.inputTextTokenCount : 0
	};
}
/** Narrow a Cohere InvokeModel JSON body: `{ embeddings: number[][] }` (float). */
function readCohereEmbeddingBody(raw, context) {
	const embeddings = isRecord(raw) && Array.isArray(raw.embeddings) ? raw.embeddings : void 0;
	if (!embeddings) throw new Error(`${context}: response body is missing the "embeddings" array`);
	return embeddings;
}
/**
* Map an ImagePart to Titan's `inputImage` (RAW base64, no data: prefix).
* Accepts `data` sources as-is and `url` sources ONLY when the value is a
* `data:` URI; Titan cannot fetch remote http(s) URLs.
*/
function toTitanInputImage(image, model) {
	const source = image.source;
	if (isFileSource(source)) throw unsupportedFileSourceError("bedrock");
	if (source.type === "data") return source.value;
	if (source.value.startsWith("data:")) {
		const comma = source.value.indexOf(",");
		if (comma !== -1) return source.value.slice(comma + 1);
	}
	throw new Error(`Bedrock Titan does not fetch remote image URLs; pass base64 data (a { type: 'data' } source or a data: URI) for ${model}.`);
}
/** Split into runs of at most `size`, preserving order. */
function chunk(items, size) {
	const chunks = [];
	for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
	return chunks;
}
/**
* Map `fn` over `items` with at most `limit` calls in flight, returning
* results in input order (result[i] corresponds to items[i] regardless of
* completion order). Rejects with the first error.
*/
async function mapWithConcurrency(items, limit, fn) {
	const results = new Array(items.length);
	let next = 0;
	const worker = async () => {
		while (next < items.length) {
			const index = next++;
			const item = items[index];
			if (item === void 0) continue;
			results[index] = await fn(item, index);
		}
	};
	const workerCount = Math.max(1, Math.min(limit, items.length));
	await Promise.all(Array.from({ length: workerCount }, () => worker()));
	return results;
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
function createBedrockEmbedding(model, apiKey, config) {
	return new BedrockEmbeddingAdapter({
		...config,
		apiKey
	}, model);
}
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
function bedrockEmbedding(model, config) {
	return new BedrockEmbeddingAdapter(config ?? {}, model);
}
//#endregion
export { BedrockEmbeddingAdapter, bedrockEmbedding, createBedrockEmbedding };

//# sourceMappingURL=embedding.js.map