import { defineByokProvider } from "@tanstack/ai/byok";
//#region src/byok.ts
var anthropicByok = defineByokProvider({
	id: "anthropic",
	label: "Anthropic",
	env: "ANTHROPIC_API_KEY"
});
//#endregion
export { anthropicByok };

//# sourceMappingURL=byok.js.map