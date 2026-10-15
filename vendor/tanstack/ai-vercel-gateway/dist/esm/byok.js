import { defineByokProvider } from "@tanstack/ai/byok";
//#region src/byok.ts
var vercelGatewayByok = defineByokProvider({
	id: "vercel-gateway",
	label: "Vercel AI Gateway",
	env: ["AI_GATEWAY_API_KEY", "VERCEL_OIDC_TOKEN"]
});
//#endregion
export { vercelGatewayByok };

//# sourceMappingURL=byok.js.map