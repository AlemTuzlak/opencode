import { defineByokProvider } from "@tanstack/ai/byok";
//#region src/byok.ts
var geminiByok = defineByokProvider({
	id: "gemini",
	label: "Google Gemini",
	env: ["GOOGLE_API_KEY", "GEMINI_API_KEY"]
});
//#endregion
export { geminiByok };

//# sourceMappingURL=byok.js.map