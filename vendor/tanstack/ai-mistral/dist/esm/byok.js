import { defineByokProvider } from "@tanstack/ai/byok";
//#region src/byok.ts
var mistralByok = defineByokProvider({
	id: "mistral",
	label: "Mistral",
	env: "MISTRAL_API_KEY"
});
//#endregion
export { mistralByok };

//# sourceMappingURL=byok.js.map