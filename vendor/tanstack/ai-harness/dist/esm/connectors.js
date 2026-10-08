import { definePlugin } from "./plugins.js";
import { defineCommand } from "./commands.js";
import { deviceLogin, isExpired, loopbackLogin, refreshCredential } from "./oauth.js";
//#region src/connectors.ts
/**
* A plugin that signs the user in to an OAuth service and gives the model
* that service's tools. Adds `connect:<id>` and `disconnect:<id>` commands.
* Tokens stay in the credential store. The model never sees them.
*
* @example
* ```ts
* const github = oauthConnector({
*   id: 'github',
*   label: 'GitHub',
*   oauth: { authorizationUrl, tokenUrl, deviceUrl, clientId, scopes: ['repo'] },
*   tools: (token) => [listIssues(token)],
* })
* ```
*/
function oauthConnector(options) {
	const { id, label, oauth } = options;
	return definePlugin({
		name: `connector/${id}`,
		setup: (ctx) => {
			const token = async (tokenOptions) => {
				let credential = await ctx.credentials.require(id, tokenOptions);
				if (credential.type === "api_key") return credential.value;
				if (isExpired(credential) && credential.refreshToken) {
					credential = await refreshCredential(oauth, credential, options.fetch);
					await ctx.credentials.set(id, credential);
				}
				if (credential.type === "api_key") return credential.value;
				return credential.accessToken;
			};
			return {
				tools: options.tools?.(token) ?? [],
				commands: {
					[`connect:${id}`]: defineCommand({
						description: `Sign in to ${label}`,
						run: async (_input, { credentials }) => {
							const credential = options.login === "device" ? await deviceLogin(oauth, {
								onCode: ({ userCode, verificationUri }) => ctx.session.authRequired({
									connector: id,
									url: verificationUri,
									userCode
								}),
								...options.fetch ? { fetch: options.fetch } : {}
							}) : await loopbackLogin(oauth, {
								onUrl: (url) => ctx.session.authRequired({
									connector: id,
									url
								}),
								...options.fetch ? { fetch: options.fetch } : {}
							});
							await credentials.set(id, credential);
							return `Connected to ${label}.`;
						}
					}),
					[`disconnect:${id}`]: defineCommand({
						description: `Sign out of ${label}`,
						run: async (_input, { credentials }) => {
							await credentials.delete(id);
							return `Disconnected from ${label}.`;
						}
					})
				}
			};
		}
	});
}
//#endregion
export { oauthConnector };

//# sourceMappingURL=connectors.js.map