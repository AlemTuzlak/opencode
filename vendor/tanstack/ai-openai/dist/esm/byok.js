import { defineByokProvider } from "@tanstack/ai/byok";
//#region src/byok.ts
var openaiByok = defineByokProvider({
	id: "openai",
	label: "OpenAI",
	env: "OPENAI_API_KEY"
});
//#endregion
export { openaiByok };

//# sourceMappingURL=byok.js.map