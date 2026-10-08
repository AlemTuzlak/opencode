import { definePlugin } from "../plugins.js";
import { defineCommand } from "../commands.js";
import { envKeyOf } from "../auth.js";
import { maskKey } from "@tanstack/ai/byok";
//#region src/first-party/provider-keys.ts
/** The state of one provider, and its `/keys` line. The key shows masked only. */
async function describeKey(credentials, provider) {
	const { id, label } = provider;
	const status = (state) => ({
		id,
		label,
		state
	});
	const saved = await credentials.get(id);
	if (saved?.type === "api_key") return {
		status: status("connected"),
		line: `${label}: connected (key ...${maskKey(saved.value)})`
	};
	const env = envKeyOf(provider);
	if (env) return {
		status: status("env"),
		line: `${label}: from the ${env.name} env var`
	};
	return {
		status: status("missing"),
		line: `${label}: missing. Run /connect ${id}.`
	};
}
/**
* Let each user connect their own model providers inside the app, so a
* shipped harness needs no `.env` file. For each provider it adds
* `/connect <id>` and `/disconnect <id>`, and `/keys` lists where each key
* comes from. `/connect` runs the provider's `signIn` when it has one (the
* host opens the browser), else it asks the user to paste the key. The key
* is saved in the credential store of the session's principal. A
* `keyedAdapter(...)` for that provider then uses it. The env var still works
* when no key is saved. Keys show masked only (the last 4 characters).
*
* @param options.providers - BYOK descriptors, for example `openaiByok`. Add
*   `signIn` for a provider with a browser sign-in, for example
*   `{ ...openrouterByok, signIn: openrouterSignIn() }`, or `keyUrl` to open
*   the provider's key page before the question, for example
*   `{ ...openaiByok, keyUrl: 'https://platform.openai.com/api-keys' }`.
*
* @example
* ```ts
* plugins: () => [
*   providerKeys({
*     providers: [
*       openaiByok,
*       anthropicByok,
*       { ...openrouterByok, signIn: openrouterSignIn() },
*     ],
*   }),
* ]
* ```
*/
function providerKeys(options) {
	const { providers } = options;
	return definePlugin({
		name: "tanstack/provider-keys",
		setup: async (ctx) => {
			const state = ctx.state({ providers: [] });
			/**
			* Check every provider, keep the result for UIs, and return the `/keys`
			* lines. A command passes the credentials of the user who runs it.
			*/
			const refresh = async (credentials = ctx.credentials) => {
				const described = await Promise.all(providers.map((provider) => describeKey(credentials, provider)));
				await state.update(() => ({ providers: described.map((entry) => entry.status) }));
				return described.map((entry) => entry.line).join("\n");
			};
			await refresh();
			/** The key from the provider's sign-in, else the one the user pastes. */
			const readKey = async (provider, signal) => {
				const open = (url) => ctx.session.authRequired({
					connector: provider.id,
					url
				});
				if (provider.signIn) return provider.signIn({
					open,
					signal
				});
				if (provider.keyUrl) open(provider.keyUrl);
				return ctx.session.ask({
					message: provider.keyUrl ? `Paste your ${provider.label} API key. The page to make one is open in your browser.` : `Paste your ${provider.label} API key`,
					secret: true
				});
			};
			const commands = { keys: defineCommand({
				description: "Show the model providers and where their keys come from",
				run: (_input, { credentials }) => refresh(credentials)
			}) };
			for (const provider of providers) {
				const { id, label } = provider;
				commands[`connect:${id}`] = defineCommand({
					description: `Connect ${label} with your own key`,
					run: async (_input, { signal, credentials }) => {
						const key = (await readKey(provider, signal)).trim();
						if (key === "") throw new Error(`No ${label} key was given. Nothing was saved.`);
						await credentials.set(id, {
							type: "api_key",
							value: key
						});
						await refresh(credentials);
						return `Connected to ${label} (key ...${maskKey(key)}).`;
					}
				});
				commands[`disconnect:${id}`] = defineCommand({
					description: `Remove your ${label} key`,
					run: async (_input, { credentials }) => {
						await credentials.delete(id);
						await refresh(credentials);
						return `Disconnected from ${label}.`;
					}
				});
			}
			return { commands };
		}
	});
}
//#endregion
export { providerKeys };

//# sourceMappingURL=provider-keys.js.map