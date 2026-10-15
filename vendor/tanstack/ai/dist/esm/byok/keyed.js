import { isProviderId, resolveProviderId } from "./providers.js";
//#region src/byok/keyed.ts
var KEYED_ADAPTER = Symbol.for("tanstack.ai.keyedAdapter");
/**
* Wrap an adapter factory that needs a provider key. The host finds the key
* and calls `create` just before each call, so the key is not in your code
* or in a `.env` file. Works for every adapter kind: text, image, speech,
* audio, video, and the rest.
*
* @param provider - The provider whose key `create` needs: a BYOK descriptor
*   such as `openaiByok` (its `env` names are the fallback), or a provider id.
* @param create - Builds the adapter from the key.
* @throws Error when the provider id is not a valid BYOK slug.
*
* @example
* ```ts
* import { createOpenaiChat } from '@tanstack/ai-openai'
* import { openaiByok } from '@tanstack/ai-openai/byok'
*
* const adapter = keyedAdapter(openaiByok, (key) =>
*   createOpenaiChat('gpt-5.5', key),
* )
* // In an agent: chat({ adapter: await ctx.keys.adapter(adapter), ... })
* ```
*/
function keyedAdapter(provider, create) {
	const id = resolveProviderId(provider);
	if (!isProviderId(id)) throw new Error(`Invalid BYOK provider id: ${id}`);
	return {
		[KEYED_ADAPTER]: true,
		provider,
		create
	};
}
/**
* True when `value` came from {@link keyedAdapter}. A host uses it to decide
* if an adapter needs a key first.
*/
function isKeyedAdapter(value) {
	return typeof value === "object" && value !== null && KEYED_ADAPTER in value;
}
//#endregion
export { isKeyedAdapter, keyedAdapter };

//# sourceMappingURL=keyed.js.map