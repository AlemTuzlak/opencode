import { defineByokProvider } from "@tanstack/ai/byok";
//#region src/byok.ts
var perplexityByok = defineByokProvider({
	id: "perplexity",
	label: "Perplexity",
	env: ["PERPLEXITY_API_KEY", "PPLX_API_KEY"]
});
//#endregion
export { perplexityByok };

//# sourceMappingURL=byok.js.map