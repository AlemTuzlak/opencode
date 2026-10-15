import { defineByokProvider } from "@tanstack/ai/byok";
//#region src/byok.ts
var grokByok = defineByokProvider({
	id: "grok",
	label: "xAI Grok",
	env: "XAI_API_KEY"
});
//#endregion
export { grokByok };

//# sourceMappingURL=byok.js.map