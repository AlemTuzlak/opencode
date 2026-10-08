//#region src/evaluate/evaluate-provider-options.ts
/**
* OpenRouter evaluate model metadata and provider options.
*
* OpenRouter exposes TypeSafe Jev through `POST /api/alpha/decisions`.
* That endpoint is not chat completions. Known slugs autocomplete; any other
* Jev slug OpenRouter offers also works.
*/
/**
* A non-exhaustive list of known OpenRouter Jev model slugs, surfaced for
* editor autocomplete. Any other Jev model OpenRouter offers also works —
* see {@link OpenRouterEvaluateModel}.
*/
var OPENROUTER_EVALUATE_MODELS = [
	"~typesafe/jev-latest",
	"typesafe/jev-1.13",
	"typesafe/jev-1.13.0"
];
//#endregion
export { OPENROUTER_EVALUATE_MODELS };

//# sourceMappingURL=evaluate-provider-options.js.map