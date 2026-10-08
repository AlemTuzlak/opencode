import { OAuthTokenVerifier } from '@modelcontextprotocol/server';
/**
 * Options for {@link jwtVerifier}.
 * `issuer` and `audience` are required. A token for another issuer or
 * another API must not call this server.
 */
export type JwtVerifierOptions = {
    /** The JWKS URL of the authorization server. */
    jwksUrl: string;
    /** The `iss` claim the token must carry. */
    issuer: string;
    /** The `aud` claim the token must carry. Usually this MCP server URL. */
    audience: string;
    /** Accepted JWS algorithms. The default accepts what the key set advertises. */
    algorithms?: Array<string>;
    /** Fetch for the JWKS request. The default is the global `fetch`. */
    fetch?: (url: string, init?: RequestInit) => Promise<Response>;
};
/**
 * Options for {@link introspectionVerifier}.
 * The server sends the token to `introspectionUrl` with HTTP Basic auth.
 */
export type IntrospectionVerifierOptions = {
    /** The RFC 7662 introspection endpoint of the authorization server. */
    introspectionUrl: string;
    /** The client id this MCP server uses at the authorization server. */
    clientId: string;
    /** The client secret for `clientId`. */
    clientSecret: string;
    /** Fetch for the introspection request. The default is the global `fetch`. */
    fetch?: (url: string, init?: RequestInit) => Promise<Response>;
};
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
export declare function jwtVerifier(options: JwtVerifierOptions): OAuthTokenVerifier;
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
export declare function introspectionVerifier(options: IntrospectionVerifierOptions): OAuthTokenVerifier;
