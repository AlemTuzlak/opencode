import { GROK_MODEL_INPUT_MODALITIES } from "../model-meta.js";
import { GROK_MODEL_REASONING } from "../model-reasoning.js";
import { getGrokApiKeyFromEnv, withGrokDefaults } from "../utils/client.js";
import { convertToolsToProviderFormat } from "../tools/index.js";
import OpenAI$1 from "openai";
import { fileReferenceFor, isFileSource } from "@tanstack/ai";
import { OpenAIBaseResponsesTextAdapter, toResponsesToolChoice } from "@tanstack/openai-base";
//#region src/adapters/text.ts
/**
* Grok Text (Chat) Adapter
*
* Tree-shakeable adapter for Grok chat/text completion functionality.
* Uses xAI's OpenAI-compatible Responses API.
*
* Delegates implementation to {@link OpenAIBaseResponsesTextAdapter}
* from `@tanstack/openai-base` and threads Grok-specific tool-capability
* typing through the 5th generic of the base class.
*/
var GrokTextAdapter = class extends OpenAIBaseResponsesTextAdapter {
	kind = "text";
	name = "grok";
	supportsFileSources = true;
	inputModalities = GROK_MODEL_INPUT_MODALITIES[this.model];
	constructor(config, model) {
		const options = withGrokDefaults(config);
		super(model, "grok", new OpenAI$1(options), { fetch: options.fetch });
	}
	modelReasoning(model) {
		return GROK_MODEL_REASONING[model];
	}
	/**
	* Route a `{ type: 'file' }` source to xAI's URL-shaped fields rather than
	* the `file_id` the OpenAI Responses base emits.
	*
	* xAI accepts `file_id` only on `input_file`, and only on agentic-capable
	* models; its image path takes `image_url`. A `grokFiles()` handle carries
	* an xAI public URL, which both fields accept, so one handle works for
	* every modality on every chat model.
	*/
	convertContentPartToInput(part) {
		if ("source" in part && isFileSource(part.source)) {
			const url = fileReferenceFor(part.source, this.name);
			if (part.type === "image") return {
				type: "input_image",
				image_url: url,
				detail: part.metadata?.detail || "auto"
			};
			return {
				type: "input_file",
				file_url: url
			};
		}
		return super.convertContentPartToInput(part);
	}
	mapOptionsToRequest(options) {
		const { tools: baseTools, ...request } = super.mapOptionsToRequest({
			...options,
			tools: void 0
		});
		const tools = options.tools ? convertToolsToProviderFormat(options.tools) : void 0;
		return {
			...tools?.length && options.toolChoice !== void 0 ? { tool_choice: toResponsesToolChoice(options.toolChoice) } : void 0,
			...request,
			store: request.store ?? false,
			include: request.include ?? ["reasoning.encrypted_content"],
			...tools && tools.length > 0 && { tools },
			...!tools?.length && baseTools?.length === 0 && { tools: [] }
		};
	}
};
/**
* Creates a Grok text adapter with explicit API key.
* Type resolution happens here at the call site.
*
* @param model - The model name (e.g., 'grok-build-0.1')
* @param apiKey - Your xAI API key
* @param config - Optional additional configuration
* @returns Configured Grok text adapter instance with resolved types
*
* @example
* ```typescript
* const adapter = createGrokText('grok-build-0.1', "xai-...");
* // adapter has type-safe providerOptions for grok-build-0.1
* ```
*/
function createGrokText(model, apiKey, config) {
	return new GrokTextAdapter({
		apiKey,
		...config
	}, model);
}
/**
* Creates a Grok text adapter with automatic API key detection from environment variables.
* Type resolution happens here at the call site.
*
* Looks for `XAI_API_KEY` in:
* - `process.env` (Node.js)
* - `window.env` (Browser with injected env)
*
* @param model - The model name (e.g., 'grok-build-0.1')
* @param config - Optional configuration (excluding apiKey which is auto-detected)
* @returns Configured Grok text adapter instance with resolved types
* @throws Error if XAI_API_KEY is not found in environment
*
* @example
* ```typescript
* // Automatically uses XAI_API_KEY from environment
* const adapter = grokText('grok-build-0.1');
*
* const stream = chat({
*   adapter,
*   messages: [{ role: "user", content: "Hello!" }]
* });
* ```
*/
function grokText(model, config) {
	return createGrokText(model, getGrokApiKeyFromEnv(), config);
}
//#endregion
export { GrokTextAdapter, createGrokText, grokText };

//# sourceMappingURL=text.js.map