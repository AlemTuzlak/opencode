//#region src/model-meta.ts
/**
* Embedding models (based on endpoints: "v2/embed")
*/
var COHERE_EMBEDDING_MODELS = ["embed-v4.0"];
/**
* Cohere rerank model metadata.
*
* Provider options are resolved per model at the `cohereRerank('model')` call
* site via {@link CohereRerankModelProviderOptionsByName}. Cohere's rerank
* models currently share the same options, but the per-model map keeps the
* surface symmetric with the other adapters and lets divergent options be
* expressed later without changing the adapter contract.
*/
/** Available Cohere rerank models. */
var COHERE_RERANK_MODELS = [
	"rerank-v3.5",
	"rerank-english-v3.0",
	"rerank-multilingual-v3.0"
];
//#endregion
export { COHERE_EMBEDDING_MODELS, COHERE_RERANK_MODELS };

//# sourceMappingURL=model-meta.js.map