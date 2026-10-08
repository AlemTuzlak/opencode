import { GENERATED_BEDROCK_MODELS } from "./model-catalog.generated.js";
//#region src/model-meta.ts
/** Runtime catalogs. Cast-free narrowing via a type predicate (the ai-bedrock pattern). */
var BEDROCK_CONVERSE_MODELS = GENERATED_BEDROCK_MODELS.filter((m) => m.apis.converse).map((m) => m.id);
var BEDROCK_CHAT_MODELS = GENERATED_BEDROCK_MODELS.filter((m) => m.apis.chat).map((m) => m.id);
var BEDROCK_RESPONSES_MODELS = GENERATED_BEDROCK_MODELS.filter((m) => m.apis.responses).map((m) => m.id);
/**
* Embedding models reachable through Bedrock's `InvokeModel` API. These are
* not part of the generated Converse catalog (embedding models have no
* conversational surface), so they're maintained by hand here.
*/
var BEDROCK_EMBEDDING_MODELS = [
	"amazon.titan-embed-text-v2:0",
	"amazon.titan-embed-image-v1",
	"cohere.embed-english-v3",
	"cohere.embed-multilingual-v3"
];
//#endregion
export { BEDROCK_CHAT_MODELS, BEDROCK_CONVERSE_MODELS, BEDROCK_EMBEDDING_MODELS, BEDROCK_RESPONSES_MODELS };

//# sourceMappingURL=model-meta.js.map