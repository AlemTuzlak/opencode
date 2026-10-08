import { getVercelGatewayApiKeyFromEnv } from "../utils/client.js";
import { VercelGatewayTextAdapter } from "./text.js";
import { ChatStreamSummarizeAdapter } from "@tanstack/ai/adapters";
//#region src/adapters/summarize.ts
function createVercelGatewaySummarize(model, apiKey, config) {
	return new ChatStreamSummarizeAdapter(new VercelGatewayTextAdapter({
		apiKey,
		...config
	}, model), model, "vercel-gateway");
}
function vercelGatewaySummarize(model, config) {
	return createVercelGatewaySummarize(model, getVercelGatewayApiKeyFromEnv(), config);
}
//#endregion
export { createVercelGatewaySummarize, vercelGatewaySummarize };

//# sourceMappingURL=summarize.js.map