import { defineByokProvider } from "@tanstack/ai/byok";
//#region src/byok.ts
var cohereByok = defineByokProvider({
	id: "cohere",
	label: "Cohere",
	env: "COHERE_API_KEY"
});
//#endregion
export { cohereByok };

//# sourceMappingURL=byok.js.map