import { getVercelGatewayApiKeyFromEnv, withVercelGatewayDefaults } from "../utils/client.js";
import { mapGatewayModelOptions } from "../utils/map-gateway-options.js";
import { VERCEL_GATEWAY_MODEL_REASONING } from "../model-reasoning.js";
import OpenAI from "openai";
import { OpenAIBaseResponsesTextAdapter } from "@tanstack/openai-base";
//#region src/adapters/responses-text.ts
/**
* Vercel AI Gateway Responses text adapter.
*
* Talks to the public OpenAI-compatible Responses API at
* `https://ai-gateway.vercel.sh/v1`.
*/
var VercelGatewayResponsesTextAdapter = class extends OpenAIBaseResponsesTextAdapter {
	kind = "text";
	name = "vercel-gateway";
	constructor(config, model) {
		super(model, "vercel-gateway", new OpenAI(withVercelGatewayDefaults(config)), config);
	}
	modelReasoning(model) {
		return VERCEL_GATEWAY_MODEL_REASONING[model];
	}
	mapOptionsToRequest(options) {
		const { gateway: _gateway, ...rest } = super.mapOptionsToRequest({
			...options,
			modelOptions: mapGatewayModelOptions(options.modelOptions)
		});
		return rest;
	}
};
function createVercelGatewayResponsesText(model, apiKey, config) {
	return new VercelGatewayResponsesTextAdapter({
		apiKey,
		...config
	}, model);
}
function vercelGatewayResponsesText(model, config) {
	return createVercelGatewayResponsesText(model, getVercelGatewayApiKeyFromEnv(), config);
}
//#endregion
export { VercelGatewayResponsesTextAdapter, createVercelGatewayResponsesText, vercelGatewayResponsesText };

//# sourceMappingURL=responses-text.js.map