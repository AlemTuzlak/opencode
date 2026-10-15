import { resolveConfigFromEnv } from "../utils/config.js";
import { runModel } from "../utils/run.js";
import { toRunErrorPayload } from "@tanstack/ai/adapter-internals";
import { BaseEvaluateAdapter } from "@tanstack/ai/adapters";
import { buildBaseUsage } from "@tanstack/ai";
//#region src/adapters/evaluate.ts
/**
* Cloudflare evaluate adapter. Runs TypeSafe Jev (`typesafe/jev`) through
* Workers AI (`{ state, questions }` in, `{ model, answers, usage }` out)
* through the binding or the REST API.
*/
var CloudflareEvaluateAdapter = class extends BaseEvaluateAdapter {
	cfConfig;
	name = "cloudflare";
	constructor(cfConfig, model) {
		super({}, model);
		this.cfConfig = cfConfig;
	}
	async evaluate(options) {
		const { model, state, questions, abortSignal, logger } = options;
		try {
			logger.request(`activity=evaluate provider=${this.name} model=${model}`, {
				provider: this.name,
				model
			});
			const output = await runModel(this.cfConfig, model, {
				state,
				questions
			}, { signal: abortSignal });
			const inputTokens = output.usage.input_tokens;
			const outputTokens = output.usage.output_tokens;
			return {
				model: output.model,
				answers: output.answers,
				usage: buildBaseUsage({
					promptTokens: inputTokens,
					completionTokens: outputTokens,
					totalTokens: inputTokens + outputTokens
				})
			};
		} catch (error) {
			logger.errors(`${this.name}.evaluate fatal`, {
				error: toRunErrorPayload(error, `${this.name}.evaluate failed`),
				source: `${this.name}.evaluate`
			});
			throw error;
		}
	}
};
/**
* Creates a Cloudflare evaluate adapter with explicit configuration.
*
* @example
* ```typescript
* // Inside a Worker
* const adapter = createCloudflareDecider('typesafe/jev', { binding: env.AI })
* // Anywhere, over REST
* const adapter = createCloudflareDecider('typesafe/jev', { accountId, apiKey })
* ```
*/
function createCloudflareDecider(model, config) {
	return new CloudflareEvaluateAdapter(config, model);
}
/**
* Creates a Cloudflare evaluate adapter, reading `CLOUDFLARE_ACCOUNT_ID` and
* `CLOUDFLARE_API_TOKEN` from the environment unless a binding is passed.
*/
function cloudflareDecider(model, config) {
	return new CloudflareEvaluateAdapter(resolveConfigFromEnv(config), model);
}
//#endregion
export { CloudflareEvaluateAdapter, cloudflareDecider, createCloudflareDecider };

//# sourceMappingURL=evaluate.js.map