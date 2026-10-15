import { getVercelGatewayApiKeyFromEnv } from "../utils/client.js";
import { VercelGatewayTextAdapter } from "./text.js";
import { VercelGatewayResponsesTextAdapter } from "./responses-text.js";
//#region src/adapters/factory.ts
function stripApi(config) {
	const { api, ...rest } = config;
	return rest;
}
function build(model, config) {
	if (config.api === "chat" || config.api === "chat-completions") return new VercelGatewayTextAdapter(stripApi(config), model);
	return new VercelGatewayResponsesTextAdapter(stripApi(config), model);
}
function createVercelGatewayText(model, apiKey, config) {
	return build(model, {
		...config,
		apiKey
	});
}
function vercelGatewayText(model, config) {
	return build(model, {
		...config,
		apiKey: getVercelGatewayApiKeyFromEnv()
	});
}
//#endregion
export { createVercelGatewayText, vercelGatewayText };

//# sourceMappingURL=factory.js.map