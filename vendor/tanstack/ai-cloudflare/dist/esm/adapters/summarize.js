import { resolveConfigFromEnv } from "../utils/config.js";
import { CloudflareTextAdapter } from "./text.js";
import { ChatStreamSummarizeAdapter } from "@tanstack/ai/adapters";
//#region src/adapters/summarize.ts
/**
* Creates a Cloudflare summarize adapter. Summaries run as a chat request
* against the given model.
*/
function createCloudflareSummarize(model, config) {
	return new ChatStreamSummarizeAdapter(new CloudflareTextAdapter(config, model), model, "cloudflare");
}
/**
* Creates a Cloudflare summarize adapter, reading `CLOUDFLARE_ACCOUNT_ID` and
* `CLOUDFLARE_API_TOKEN` from the environment unless a binding is passed.
*/
function cloudflareSummarize(model, config) {
	return createCloudflareSummarize(model, resolveConfigFromEnv(config));
}
//#endregion
export { cloudflareSummarize, createCloudflareSummarize };

//# sourceMappingURL=summarize.js.map