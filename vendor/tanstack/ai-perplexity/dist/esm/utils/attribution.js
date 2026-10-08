//#region src/utils/attribution.ts
var PERPLEXITY_INTEGRATION_HEADER = "X-Pplx-Integration";
var PERPLEXITY_INTEGRATION_HEADER_VALUE = `tanstack/0.2.21`;
/**
* Attribution header Perplexity uses to identify TanStack AI traffic
* (`X-Pplx-Integration: tanstack/<package-version>`).
*
* The Search client sends this automatically. Pass it as
* `openaiCompatible({ defaultHeaders })` if you want the same header on
* Sonar chat requests.
*/
function getPerplexityIntegrationHeaders() {
	return { [PERPLEXITY_INTEGRATION_HEADER]: PERPLEXITY_INTEGRATION_HEADER_VALUE };
}
//#endregion
export { PERPLEXITY_INTEGRATION_HEADER, PERPLEXITY_INTEGRATION_HEADER_VALUE, getPerplexityIntegrationHeaders };

//# sourceMappingURL=attribution.js.map