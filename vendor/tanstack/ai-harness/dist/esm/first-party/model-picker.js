import { definePlugin } from "../plugins.js";
import { defineCommand } from "../commands.js";
import { configOption } from "../config.js";
//#region src/first-party/model-picker.ts
/**
* Switch the main model at the next turn with the `model` setting or the
* `/model <name>` command. A choice can be a `keyedAdapter(...)`: the
* session builds it for each turn with the user's key.
*
* @example
* ```ts
* modelPicker({
*   choices: {
*     fast: openaiText('gpt-5.6-luna'),
*     claude: keyedAdapter(anthropicByok, (key) =>
*       createAnthropicChat('claude-sonnet-4-5', key),
*     ),
*   },
*   default: 'fast',
* })
* ```
*/
function modelPicker(options) {
	const names = Object.keys(options.choices);
	const fallback = options.default ?? names[0];
	if (fallback === void 0) throw new Error("modelPicker needs at least one choice.");
	return definePlugin({
		name: "tanstack/model-picker",
		setup: (ctx) => ({
			config: { model: configOption.select({
				options: names,
				default: fallback,
				category: "model",
				description: "The main model"
			}) },
			adapter: () => {
				const name = ctx.config.get("model");
				return typeof name === "string" ? options.choices[name] : void 0;
			},
			commands: { model: defineCommand({
				description: `Show or switch the model (${names.join(", ")})`,
				run: async (input) => {
					const name = typeof input === "string" ? input : typeof input === "object" && input !== null && "name" in input ? String(input.name) : void 0;
					if (!name) return `Model: ${String(ctx.config.get("model"))}. Choices: ${names.join(", ")}.`;
					if (!names.includes(name)) return `Unknown model "${name}". Choices: ${names.join(", ")}.`;
					await ctx.session.setConfig("model", name);
					return `Model: ${name}. It applies at the next turn.`;
				}
			}) }
		})
	});
}
//#endregion
export { modelPicker };

//# sourceMappingURL=model-picker.js.map