import { OAuthError, OAuthErrorCode } from "@modelcontextprotocol/server";
import { createRemoteJWKSet, customFetch, errors, jwtVerify } from "jose";
//#region src/server/auth.ts
/**
* Builds an `OAuthTokenVerifier` for a JWT access token.
*
* The verifier reads the keys from `jwksUrl`, caches them, and checks the
* signature, `iss`, `aud`, `exp`, and `nbf` with `jose`.
* A token that fails any check gets a 401 from `createMCPServer`.
* When the key set cannot be read, the caller gets a 500 `server_error`,
* so a provider outage does not look like a bad token.
*
* `clientId` on the result is the `client_id`, `azp`, or `sub` claim.
* `scopes` comes from the `scope` claim. `extra` holds every claim,
* so a tool can read `ctx.context.authInfo.extra.sub`.
*
* @param options - The JWKS URL, the issuer, and the audience
*
* @example
* ```ts
* const server = createMCPServer({
*   name: 'notes',
*   version: '1.0.0',
*   auth: {
*     verifier: jwtVerifier({
*       jwksUrl: 'https://auth.example.com/.well-known/jwks.json',
*       issuer: 'https://auth.example.com/',
*       audience: 'https://mcp.example.com/mcp',
*     }),
*   },
* })
* ```
*/
function jwtVerifier(options) {
	const fetchImpl = options.fetch;
	const keys = createRemoteJWKSet(new URL(options.jwksUrl), { ...fetchImpl === void 0 ? {} : { [customFetch]: fetchImpl } });
	return { async verifyAccessToken(token) {
		let claims;
		try {
			claims = (await jwtVerify(token, keys, {
				issuer: options.issuer,
				audience: options.audience,
				algorithms: options.algorithms
			})).payload;
		} catch (error) {
			if (isTokenError(error)) throw invalidToken(errorText(error));
			throw new OAuthError("server_error", `The key set could not be read: ${errorText(error)}`);
		}
		return authInfoFromClaims(token, claims);
	} };
}
var tokenKeySetCodes = /* @__PURE__ */ new Set([
	"ERR_JWKS_NO_MATCHING_KEY",
	"ERR_JWKS_MULTIPLE_MATCHING_KEYS",
	"ERR_JOSE_ALG_NOT_ALLOWED",
	"ERR_JOSE_NOT_SUPPORTED"
]);
function isTokenError(error) {
	if (!(error instanceof errors.JOSEError)) return false;
	const code = error.code;
	return code.startsWith("ERR_JWT_") || code.startsWith("ERR_JWS_") || tokenKeySetCodes.has(code);
}
/**
* Builds an `OAuthTokenVerifier` for an opaque access token.
*
* The verifier posts the token to the RFC 7662 introspection endpoint.
* A token that is not `active` gets a 401 from `createMCPServer`.
* When the endpoint fails, the caller gets a 500 `server_error`.
*
* `clientId`, `scopes`, `expiresAt`, and `extra` come from the
* introspection response, the same as {@link jwtVerifier}.
*
* @param options - The introspection URL and the client credentials
*
* @example
* ```ts
* const verifier = introspectionVerifier({
*   introspectionUrl: 'https://auth.example.com/oauth/introspect',
*   clientId: process.env.OAUTH_CLIENT_ID ?? '',
*   clientSecret: process.env.OAUTH_CLIENT_SECRET ?? '',
* })
* ```
*/
function introspectionVerifier(options) {
	const fetchImpl = options.fetch ?? fetch;
	const credentials = btoa(`${options.clientId}:${options.clientSecret}`);
	return { async verifyAccessToken(token) {
		const response = await fetchImpl(options.introspectionUrl, {
			method: "POST",
			headers: {
				authorization: `Basic ${credentials}`,
				"content-type": "application/x-www-form-urlencoded",
				accept: "application/json"
			},
			body: new URLSearchParams({ token }).toString()
		});
		if (!response.ok) throw new OAuthError("server_error", `The introspection endpoint answered ${response.status}.`);
		const claims = await response.json();
		if (!isRecord(claims) || claims.active !== true) throw invalidToken("The token is not active.");
		return authInfoFromClaims(token, claims);
	} };
}
/**
* Turns the claims of a verified token into the SDK `AuthInfo`.
* The bearer-auth gate rejects an `AuthInfo` without `expiresAt`,
* so a token without `exp` is invalid.
*/
function authInfoFromClaims(token, claims) {
	const clientId = firstString(claims.client_id, claims.azp, claims.sub);
	if (clientId === void 0) throw invalidToken("The token has no client_id, azp, or sub claim.");
	const expiresAt = claims.exp;
	if (typeof expiresAt !== "number") throw invalidToken("The token has no exp claim.");
	const resource = resourceUrl(claims.aud);
	return {
		token,
		clientId,
		scopes: scopesOf(claims.scope),
		expiresAt,
		...resource === void 0 ? {} : { resource },
		extra: claims
	};
}
function scopesOf(scope) {
	if (typeof scope === "string") return scope.split(" ").filter(Boolean);
	if (!Array.isArray(scope)) return [];
	return scope.filter((item) => typeof item === "string");
}
function resourceUrl(aud) {
	const first = typeof aud === "string" ? aud : Array.isArray(aud) ? aud[0] : void 0;
	if (typeof first !== "string") return void 0;
	try {
		return new URL(first);
	} catch {
		return;
	}
}
function firstString(...values) {
	return values.find((value) => typeof value === "string" && value.length > 0);
}
function invalidToken(message) {
	return new OAuthError(OAuthErrorCode.InvalidToken, message);
}
function errorText(error) {
	return error instanceof Error ? error.message : "The token is invalid.";
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
//#endregion
export { introspectionVerifier, jwtVerifier };

//# sourceMappingURL=auth.js.map