import { withVercelGatewayDefaults } from "../utils/client.js";
import { mapGatewayModelOptions } from "../utils/map-gateway-options.js";
import { VERCEL_GATEWAY_MODEL_REASONING } from "../model-reasoning.js";
import OpenAI from "openai";
import { OpenAIBaseChatCompletionsTextAdapter } from "@tanstack/openai-base";
import { resolveReasoning } from "@tanstack/ai/adapter-internals";
//#region src/adapters/text.ts
/**
* AI Gateway's `reasoning` object for Chat Completions: `enabled: false` for
* `off`, a `max_tokens` budget when the request sets one (it cannot go with
* `effort`), or the effort. `exclude` hides the thinking text.
*/
function gatewayReasoning(resolved) {
	if (resolved.level === "off") return { enabled: false };
	const exclude = resolved.summary ? {} : { exclude: true };
	if (resolved.budgetTokens !== void 0) return {
		enabled: true,
		max_tokens: resolved.budgetTokens,
		...exclude
	};
	return {
		effort: resolved.value ?? resolved.level,
		...exclude
	};
}
/**
* Vercel AI Gateway text adapter.
*
* Talks to the public OpenAI-compatible Chat Completions API at
* `https://ai-gateway.vercel.sh/v1`.
*/
var VercelGatewayTextAdapter = class extends OpenAIBaseChatCompletionsTextAdapter {
	kind = "text";
	name = "vercel-gateway";
	constructor(config, model) {
		super(model, "vercel-gateway", new OpenAI(withVercelGatewayDefaults(config)), config);
	}
	mapOptionsToRequest(options) {
		const { gateway: _gateway, ...rest } = super.mapOptionsToRequest({
			...options,
			modelOptions: mapGatewayModelOptions(options.modelOptions)
		});
		const resolved = resolveReasoning(options.reasoning, VERCEL_GATEWAY_MODEL_REASONING[options.model]);
		if (resolved) Object.assign(rest, { reasoning: gatewayReasoning(resolved) });
		return rest;
	}
};
//#endregion
export { VercelGatewayTextAdapter };

//# sourceMappingURL=text.js.map