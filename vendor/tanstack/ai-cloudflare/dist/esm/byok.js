import { defineByokProvider } from "@tanstack/ai/byok";
//#region src/byok.ts
/** The account id that goes with {@link cloudflareByok}. */
var cloudflareAccountByok = defineByokProvider({
	id: "cloudflare-account",
	label: "Cloudflare account ID",
	env: "CLOUDFLARE_ACCOUNT_ID"
});
/**
* BYOK descriptor for a user-supplied Cloudflare API token. A user who brings
* a token brings the account it belongs to, so {@link cloudflareAccountByok}
* rides along: register both with `defineByok({ providers })` and a send for
* `cloudflare` carries both headers.
*/
var cloudflareByok = defineByokProvider({
	id: "cloudflare",
	label: "Cloudflare API token",
	env: "CLOUDFLARE_API_TOKEN",
	with: [cloudflareAccountByok]
});
//#endregion
export { cloudflareAccountByok, cloudflareByok };

//# sourceMappingURL=byok.js.map