import { MCPConnectionError } from "./errors.js";
import { connectTransport } from "./client.js";
import { askForInput, elicitFor, harnessClientOptions } from "./harness-plugin.js";
import { auth } from "@modelcontextprotocol/client";
import { randomBytes } from "node:crypto";
import { AuthRequiredError, defineCommand, definePlugin, startLoopbackReceiver } from "@tanstack/ai-harness";
//#region src/connector.ts
/**
* An `OAuthClientProvider` for the MCP SDK that keeps tokens (and the client
* that dynamic registration made) in the harness credential store.
*/
function credentialProvider(id, credentials, options) {
	const { state } = options;
	let client;
	let verifier = "";
	let discovery;
	const stored = async () => {
		const credential = await credentials.get(id);
		return credential?.type === "oauth" ? credential : void 0;
	};
	return {
		get redirectUrl() {
			return options.redirectUri;
		},
		get clientMetadata() {
			return {
				client_name: options.clientName,
				redirect_uris: [options.redirectUri],
				grant_types: ["authorization_code", "refresh_token"],
				response_types: ["code"],
				token_endpoint_auth_method: "none",
				...options.scopes?.length ? { scope: options.scopes.join(" ") } : {}
			};
		},
		...state ? { state: () => state } : {},
		clientInformation: async () => {
			if (client) return client;
			if (options.onRedirect) return void 0;
			const saved = (await stored())?.client;
			if (!saved) return void 0;
			client = {
				client_id: saved.clientId,
				...saved.clientSecret ? { client_secret: saved.clientSecret } : {},
				...saved.issuer ? { issuer: saved.issuer } : {}
			};
			return client;
		},
		saveClientInformation: (information) => {
			client = information;
		},
		tokens: async () => {
			if (options.onRedirect) return void 0;
			const credential = await stored();
			if (!credential) return void 0;
			return {
				access_token: credential.accessToken,
				token_type: "Bearer",
				...credential.refreshToken ? { refresh_token: credential.refreshToken } : {},
				...credential.expiresAt ? { expires_in: Math.max(0, Math.floor((credential.expiresAt - Date.now()) / 1e3)) } : {},
				...credential.client?.issuer ? { issuer: credential.client.issuer } : {}
			};
		},
		saveTokens: async (tokens) => {
			const information = client;
			if (!information) throw new Error("The MCP SDK saved OAuth tokens before the client.");
			await credentials.set(id, {
				type: "oauth",
				accessToken: tokens.access_token,
				...tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {},
				...tokens.expires_in ? { expiresAt: Date.now() + tokens.expires_in * 1e3 } : {},
				...tokens.scope ? { scopes: tokens.scope.split(" ") } : {},
				client: {
					clientId: information.client_id,
					...information.client_secret ? { clientSecret: information.client_secret } : {},
					redirectUri: options.redirectUri,
					issuer: information.issuer
				}
			});
		},
		invalidateCredentials: async () => {
			if (!options.onRedirect) await credentials.delete(id);
		},
		redirectToAuthorization: (url) => {
			if (!options.onRedirect) throw new AuthRequiredError(id);
			options.onRedirect(url);
		},
		saveCodeVerifier: (value) => {
			verifier = value;
		},
		codeVerifier: () => verifier,
		saveDiscoveryState: (value) => {
			discovery = value;
		},
		discoveryState: () => discovery
	};
}
/**
* A plugin that signs the user in to a remote MCP server (for example Notion
* or Linear) and gives the model its tools, the way Claude Code connects to
* MCP servers:
*
* - `/connect <id>` finds the server's OAuth settings, registers a client,
*   and opens the browser (PKCE, loopback on `127.0.0.1`).
* - The tokens stay in the credential store. The model never sees them.
* - After sign-in, the next turn has the server's tools, named
*   `<prefix>_<tool>` by default. `toolName` can change the names.
*   Tools that can change data ask for approval.
*
* @example
* ```ts
* const notion = mcpConnector({ id: 'notion', label: 'Notion', url: 'https://mcp.notion.com/mcp' })
* ```
*/
function mcpConnector(options) {
	const { id, label, url } = options;
	const prefix = options.prefix ?? id;
	const clientName = options.clientName ?? "TanStack AI Harness";
	return definePlugin({
		name: `connector/${id}`,
		setup: async (ctx) => {
			const connections = /* @__PURE__ */ new Map();
			const keyOf = (principal) => principal ? JSON.stringify([principal.tenantId ?? null, principal.id]) : "";
			const close = async (connection) => {
				await connection?.client?.close().catch(() => {});
			};
			/** Set the sign-in of `principal`, and drop its old client and tools. */
			const signedIn = async (principal, connected) => {
				const key = keyOf(principal);
				const old = connections.get(key);
				connections.set(key, { connected });
				await close(old);
			};
			await ctx.resources.acquire(() => void 0, () => Promise.all([...connections.values()].map(close)));
			return {
				prompts: [{
					id: `connector/${id}:status`,
					text: () => connections.get(keyOf(ctx.session.principal))?.connected ? "" : `${label} is not connected. If the user asks for ${label}, tell them to run /connect ${id}.`
				}],
				discoverTools: async () => {
					const key = keyOf(ctx.session.principal);
					let connection = connections.get(key);
					if (!connection) {
						connection = { connected: await ctx.credentials.get(id) !== null };
						connections.set(key, connection);
					}
					if (!connection.connected) return [];
					if (!connection.tools) {
						const saved = await ctx.credentials.get(id);
						const redirectUri = (saved?.type === "oauth" ? saved.client?.redirectUri : void 0) ?? "http://127.0.0.1/callback";
						try {
							connection.client = await connectTransport({
								transport: {
									type: "http",
									url,
									authProvider: credentialProvider(id, ctx.credentials, {
										redirectUri,
										clientName,
										scopes: options.scopes
									}),
									...options.fetch ? { fetch: options.fetch } : {}
								},
								prefix,
								toolName: options.toolName,
								requestOptions: options.requestOptions,
								needsApproval: options.needsApproval ?? ((tool) => tool.annotations?.readOnlyHint !== true),
								clientOptions: harnessClientOptions
							}, elicitFor(ctx.session));
						} catch (error) {
							if (!(error instanceof MCPConnectionError && error.cause instanceof AuthRequiredError)) throw error;
							connection.connected = false;
							ctx.session.authRequired({ connector: id });
							throw error.cause;
						}
						connection.tools = askForInput(await connection.client.tools(), ctx.session);
					}
					return connection.tools;
				},
				commands: {
					[`connect:${id}`]: defineCommand({
						description: `Sign in to ${label}`,
						run: async (_input, { credentials, principal }) => {
							const receiver = await startLoopbackReceiver();
							const state = randomBytes(16).toString("base64url");
							try {
								const provider = credentialProvider(id, credentials, {
									redirectUri: receiver.redirectUri,
									clientName,
									scopes: options.scopes,
									state,
									onRedirect: (authorizationUrl) => ctx.session.authRequired({
										connector: id,
										url: authorizationUrl.href
									})
								});
								const fetchFn = options.fetch ? { fetchFn: options.fetch } : {};
								await auth(provider, {
									serverUrl: url,
									...fetchFn
								});
								const { code, iss } = await receiver.waitForCode(state).catch((error) => {
									throw new Error(`${label}: ${error instanceof Error ? error.message : String(error)}`);
								});
								await auth(provider, {
									serverUrl: url,
									authorizationCode: code,
									...iss ? { iss } : {},
									...fetchFn
								});
							} finally {
								receiver.close();
							}
							await signedIn(principal, true);
							return `Connected to ${label}.`;
						}
					}),
					[`disconnect:${id}`]: defineCommand({
						description: `Sign out of ${label}`,
						run: async (_input, { credentials, principal }) => {
							await credentials.delete(id);
							await signedIn(principal, false);
							return `Disconnected from ${label}.`;
						}
					})
				}
			};
		}
	});
}
//#endregion
export { mcpConnector };

//# sourceMappingURL=connector.js.map