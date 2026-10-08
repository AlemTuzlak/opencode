import { isKeyedAdapter } from "@tanstack/ai";
//#region src/auth.ts
/**
* Thrown when a tool or command needs a credential the user has not saved.
* The session publishes `harness.auth_required`, so a host can show the
* sign-in link or run `/connect`.
*/
var AuthRequiredError = class extends Error {
	connector;
	url;
	constructor(connector, url) {
		super(url ? `Sign in to ${connector} first: ${url}` : `Sign in to ${connector} first. Run /connect ${connector}.`);
		this.name = "AuthRequiredError";
		this.connector = connector;
		this.url = url;
	}
};
/**
* The error that chat() reads as "stop the turn for input" (the shape of
* `MCPInputRequiredError`), with the reason `'auth_required'`.
*/
function signInRequired(error) {
	return Object.assign(new Error(error.message), {
		name: "MCPInputRequiredError",
		kind: "form",
		reason: "auth_required",
		request: {
			connector: error.connector,
			...error.url ? { url: error.url } : {}
		}
	});
}
/**
* The tenant scope of a user scope: the same tenant, no user. A credential
* saved there belongs to every user of the tenant.
*/
var tenantOf = ({ userId, ...tenant }) => userId === void 0 ? void 0 : tenant;
/**
* Scope credentials to one principal and thread. A function `scope` is read
* at each call, so the scope can follow the sender of the running turn.
*
* A read finds the user's own credential first, then the tenant's (saved
* without a `userId`). A save or a delete changes the user's own only.
*/
function credentialsFor(store, scope, onMissing, hooks) {
	const scopeNow = typeof scope === "function" ? scope : () => scope;
	const get = async (id) => {
		const user = scopeNow();
		const own = await store.get(user, id);
		if (own) return own;
		const tenant = tenantOf(user);
		return tenant ? store.get(tenant, id) : null;
	};
	return {
		get,
		require: async (id, options) => {
			const credential = await get(id);
			if (credential) return credential;
			const error = new AuthRequiredError(id);
			onMissing(error);
			if (options?.wait && hooks?.canWait?.(id)) throw signInRequired(error);
			throw error;
		},
		set: async (id, credential) => {
			await store.set(scopeNow(), id, credential);
			await hooks?.onSet?.(id);
		},
		delete: (id) => store.delete(scopeNow(), id),
		list: async () => {
			const user = scopeNow();
			const tenant = tenantOf(user);
			const own = await store.list(user);
			if (!tenant) return own;
			const shared = await store.list(tenant);
			return [...own, ...shared.filter((item) => !own.some((o) => o.id === item.id))];
		}
	};
}
/**
* The first name in `provider.env` that is set, with its value. A provider
* id has no env names. Where `process` is missing (a browser, a worker) it
* returns `null`.
*/
function envKeyOf(provider) {
	if (typeof provider === "string") return null;
	const env = globalThis.process?.env;
	for (const name of provider.env ?? []) {
		const value = env?.[name];
		if (typeof value === "string" && value.length > 0) return {
			name,
			value
		};
	}
	return null;
}
/**
* The provider keys of the session's principal. A key is the `api_key`
* credential saved under the provider id (`/connect <id>` saves it), else
* the first `provider.env` name that is set. A missing key calls `onMissing`
* and throws {@link AuthRequiredError}, so the user sees `/connect <id>`.
*/
function providerKeysFor(credentials, onMissing) {
	const providerIdOf = (provider) => typeof provider === "string" ? provider : provider.id;
	const get = async (provider) => {
		const saved = await credentials.get(providerIdOf(provider));
		if (saved?.type === "api_key") return saved.value;
		return envKeyOf(provider)?.value ?? null;
	};
	const requireKey = async (provider) => {
		const key = await get(provider);
		if (key !== null) return key;
		const error = new AuthRequiredError(providerIdOf(provider));
		onMissing(error);
		throw error;
	};
	return {
		get,
		require: requireKey,
		adapter: async (adapter) => isKeyedAdapter(adapter) ? adapter.create(await requireKey(adapter.provider)) : adapter
	};
}
/** Remove secret-looking values from a message before it reaches a model or a log. */
function scrubSecrets(text, secrets) {
	let scrubbed = text;
	for (const secret of secrets) if (secret.length >= 6) scrubbed = scrubbed.split(secret).join("[redacted]");
	return scrubbed;
}
//#endregion
export { AuthRequiredError, credentialsFor, envKeyOf, providerKeysFor, scrubSecrets };

//# sourceMappingURL=auth.js.map