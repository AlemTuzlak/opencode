import { OPENAI_MODEL_REASONING } from "../model-reasoning.js";
import { validateTextProviderOptions } from "../text/text-provider-options.js";
import { convertToolsToProviderFormat } from "../tools/tool-converter.js";
import "../tools/index.js";
import { getOpenAIApiKeyFromEnv } from "../utils/client.js";
import { OPENAI_MODEL_INPUT_MODALITIES, OPENAI_MODEL_MID_CONVERSATION_CHANNELS, openAIModelRejectsSamplingParams, openAIModelUsesExplicitPromptCache } from "../model-meta.js";
import { responsesPromptCacheFields } from "../prompt-cache.js";
import OpenAI$1 from "openai";
import { OpenAIBaseResponsesTextAdapter } from "@tanstack/openai-base";
//#region src/adapters/text.ts
/**
* OpenAI Text (Chat) Adapter
*
* Tree-shakeable adapter for OpenAI chat/text completion functionality.
* Delegates implementation to {@link OpenAIBaseResponsesTextAdapter} from
* `@tanstack/openai-base`. The base calls `openai.responses.create`
* directly; this subclass hands it a configured client, overrides
* `convertTools` to use OpenAI's full tool converter (supporting
* file_search, web_search, etc.), and overrides `mapOptionsToRequest` to
* apply provider option validation.
*/
var OpenAITextAdapter = class extends OpenAIBaseResponsesTextAdapter {
	kind = "text";
	name = "openai";
	supportsFileSources = true;
	inputModalities = OPENAI_MODEL_INPUT_MODALITIES[this.model];
	/** Set from `OPENAI_MODEL_MID_CONVERSATION_CHANNELS` in the constructor. */
	midConversationChannels = void 0;
	/** `config.reasoning`, which wins over `OPENAI_MODEL_REASONING`. */
	configReasoning;
	constructor(config, model) {
		super(model, "openai", new OpenAI$1(config), config);
		this.configReasoning = config.reasoning;
		const envBaseURL = typeof process !== "undefined" && Boolean(process.env.OPENAI_BASE_URL);
		if (config.midConversationChannels ?? !(config.baseURL || config.fetch || envBaseURL)) this.midConversationChannels = OPENAI_MODEL_MID_CONVERSATION_CHANNELS[model];
	}
	modelReasoning(model) {
		return this.configReasoning ?? OPENAI_MODEL_REASONING[model];
	}
	/** OpenAI's full tool converter (file_search, web_search, etc.). */
	convertTools(tools) {
		return convertToolsToProviderFormat(tools);
	}
	/**
	* Maps common options to OpenAI-specific format.
	* Overrides the base class to apply OpenAI-specific provider option
	* validation and request fields. The tools go through `convertTools`.
	*/
	mapOptionsToRequest(options) {
		const modelOptions = options.modelOptions;
		if (modelOptions) validateTextProviderOptions({
			...modelOptions,
			input: this.convertMessagesToInput(options.messages),
			model: options.model
		});
		const { tools: baseTools, ...baseRequest } = super.mapOptionsToRequest(options);
		const tools = options.tools?.length ? baseTools : options.messages.some((message) => message.role === "tool" || !!message.toolCalls?.length) ? [] : void 0;
		const request = {
			...responsesPromptCacheFields(options.promptCache, {
				explicitMode: openAIModelUsesExplicitPromptCache(options.model),
				longRetention: true
			}),
			...baseRequest,
			...tools !== void 0 && { tools }
		};
		if (openAIModelRejectsSamplingParams(options.model)) {
			delete request.temperature;
			delete request.top_p;
		}
		if (request.include === void 0 && openAIModelRejectsSamplingParams(options.model)) request.include = ["reasoning.encrypted_content"];
		if (options.tools?.some((tool) => {
			const kind = tool.metadata?.["__kind"];
			return kind === "openai.web_search" || kind === "openai.web_search_preview";
		})) {
			const include = request.include ?? [];
			if (!include.includes("web_search_call.action.sources")) request.include = [...include, "web_search_call.action.sources"];
		}
		return request;
	}
};
/**
* Creates an OpenAI chat adapter with explicit API key.
* Type resolution happens here at the call site.
*
* @param model - The model name (e.g., 'gpt-4o', 'gpt-4-turbo')
* @param apiKey - Your OpenAI API key
* @param config - Optional additional configuration
* @returns Configured OpenAI chat adapter instance with resolved types
*
* @example
* ```typescript
* const adapter = createOpenaiChat('gpt-4o', "sk-...");
* // adapter has type-safe modelOptions for gpt-4o
* ```
*/
function createOpenaiChat(model, apiKey, config) {
	return new OpenAITextAdapter({
		apiKey,
		...config
	}, model);
}
/**
* Creates an OpenAI text adapter with automatic API key detection from environment variables.
* Type resolution happens here at the call site.
*
* Looks for `OPENAI_API_KEY` in:
* - `process.env` (Node.js)
* - `window.env` (Browser with injected env)
*
* @param model - The model name (e.g., 'gpt-4o', 'gpt-4-turbo')
* @param config - Optional configuration (excluding apiKey which is auto-detected)
* @returns Configured OpenAI text adapter instance with resolved types
* @throws Error if OPENAI_API_KEY is not found in environment
*
* @example
* ```typescript
* // Automatically uses OPENAI_API_KEY from environment
* const adapter = openaiText('gpt-4o');
*
* const stream = chat({
*   adapter,
*   messages: [{ role: "user", content: "Hello!" }]
* });
* ```
*/
function openaiText(model, config) {
	return createOpenaiChat(model, getOpenAIApiKeyFromEnv(), config);
}
//#endregion
export { OpenAITextAdapter, createOpenaiChat, openaiText };

//# sourceMappingURL=text.js.map