import { CLOUDFLARE_MODEL_REASONING } from "../model-reasoning.js";
import { gatewayHeaders, isBindingConfig, resolveConfigFromEnv, restChatBaseURL } from "../utils/config.js";
import { createBindingFetch, createRestFetch } from "../utils/fetch.js";
import OpenAI from "openai";
import { OpenAIBaseChatCompletionsTextAdapter } from "@tanstack/openai-base";
import { resolveReasoning } from "@tanstack/ai/adapter-internals";
//#region src/adapters/text.ts
function clientOptions(config) {
	if (isBindingConfig(config)) return {
		apiKey: "cloudflare-binding",
		fetch: createBindingFetch(config.binding, config.gateway)
	};
	const { accountId: _accountId, binding: _binding, gateway, reasoning: _reasoning, ...options } = config;
	return {
		...options,
		baseURL: restChatBaseURL(config),
		defaultHeaders: {
			...gatewayHeaders(gateway),
			...options.defaultHeaders
		},
		fetch: createRestFetch(options.fetch)
	};
}
/**
* Cloudflare text (chat) adapter.
*
* Drives Workers AI's OpenAI-compatible Chat Completions surface with the
* OpenAI SDK. Inside a Worker pass `{ binding: env.AI }`; anywhere else pass
* `{ accountId, apiKey }`. Add `gateway` to route through AI Gateway. Any
* catalog model works, including third-party `provider/model` ids billed
* through AI Gateway.
*/
var CloudflareTextAdapter = class extends OpenAIBaseChatCompletionsTextAdapter {
	kind = "text";
	name = "cloudflare";
	/** `config.reasoning`, which wins over `CLOUDFLARE_MODEL_REASONING`. */
	configReasoning;
	constructor(config, model) {
		const options = clientOptions(config);
		super(model, "cloudflare", new OpenAI(options), {
			...config,
			fetch: options.fetch
		});
		this.configReasoning = config.reasoning;
	}
	/**
	* `chat({ reasoning })` as `reasoning_effort`. Workers AI turns reasoning
	* off with `null`, so `off` sends `null`, not the model's off value.
	*/
	mapOptionsToRequest(options) {
		const request = super.mapOptionsToRequest(options);
		const resolved = resolveReasoning(options.reasoning, this.configReasoning ?? CLOUDFLARE_MODEL_REASONING[options.model]);
		if (resolved) Object.assign(request, { reasoning_effort: resolved.level === "off" ? null : resolved.value ?? resolved.level });
		return request;
	}
	/**
	* Workers AI validates `messages[].content` as a string, so a tool-call-only
	* assistant turn (which OpenAI accepts as `content: null`) is sent as `''`.
	*/
	convertMessage(message) {
		const converted = super.convertMessage(message);
		if (converted.role === "assistant" && converted.content == null) return {
			...converted,
			content: ""
		};
		return converted;
	}
	/**
	* Workers AI accepts `response_format` next to `tools` but its models answer
	* the tool follow-up turn in prose, so structured output with tools runs as
	* a separate finalization request instead.
	*/
	supportsCombinedToolsAndSchema() {
		return false;
	}
	/** Workers AI reasoning models stream thinking as `reasoning_content` (some as `reasoning`). */
	extractReasoning(chunk) {
		const delta = chunk.choices[0]?.delta;
		const raw = delta?.reasoning_content ?? delta?.reasoning;
		return typeof raw === "string" && raw.length > 0 ? { text: raw } : void 0;
	}
};
/**
* Creates a Cloudflare text adapter with explicit configuration.
*
* @example
* ```typescript
* // Inside a Worker
* const adapter = createCloudflareText('@cf/zai-org/glm-5.3-flash', { binding: env.AI })
* // Anywhere, over REST
* const adapter = createCloudflareText('@cf/zai-org/glm-5.3-flash', { accountId, apiKey })
* ```
*/
function createCloudflareText(model, config) {
	return new CloudflareTextAdapter(config, model);
}
/**
* Creates a Cloudflare text adapter, reading `CLOUDFLARE_ACCOUNT_ID` and
* `CLOUDFLARE_API_TOKEN` from the environment unless a binding is passed.
*/
function cloudflareText(model, config) {
	return new CloudflareTextAdapter(resolveConfigFromEnv(config), model);
}
//#endregion
export { CloudflareTextAdapter, cloudflareText, createCloudflareText };

//# sourceMappingURL=text.js.map