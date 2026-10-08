import { defineByokProvider } from "@tanstack/ai/byok";
//#region src/byok.ts
var groqByok = defineByokProvider({
	id: "groq",
	label: "Groq",
	env: "GROQ_API_KEY"
});
//#endregion
export { groqByok };

//# sourceMappingURL=byok.js.map