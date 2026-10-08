/** The account id that goes with {@link cloudflareByok}. */
export declare const cloudflareAccountByok: import('@tanstack/ai/byok').ByokProvider<"cloudflare-account">;
/**
 * BYOK descriptor for a user-supplied Cloudflare API token. A user who brings
 * a token brings the account it belongs to, so {@link cloudflareAccountByok}
 * rides along: register both with `defineByok({ providers })` and a send for
 * `cloudflare` carries both headers.
 */
export declare const cloudflareByok: import('@tanstack/ai/byok').ByokProvider<"cloudflare">;
