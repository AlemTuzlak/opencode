import { openaiByok } from "./byok.js";
//#region src/siwc.ts
/**
* Sign in with ChatGPT (SIWC) for BYOK. The user signs in with their ChatGPT
* account and the access token bills their ChatGPT plan instead of an API key.
*
* OpenAI allows this only for open-source and locally hosted apps, and only
* with a `http://127.0.0.1:<port>/auth/callback` redirect.
* https://developers.openai.com/siwc/token-sharing-open-source
*
* The access token goes into the `openai` BYOK slot, so the relay reads it
* like an API key. The refresh credential goes into a second slot that no
* send ever attaches, so the refresh token stays in the browser.
*/
var ISSUER = "https://auth.openai.com";
var AUTHORIZE_URL = `${ISSUER}/api/accounts/authorize`;
var TOKEN_URL = `${ISSUER}/api/accounts/oauth/token`;
var RESOURCE = "https://api.openai.com/v1";
var SCOPE = "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct";
var PLAN_SCOPE = "chatgpt.tokens.use.direct";
var DYNAMIC_CLIENT_ID = "dynamic_agent_client";
var CALLBACK_PATH = "/auth/callback";
var PENDING_STORAGE_KEY = "byok:openai:siwc:pending:v1";
var HOST_STORAGE_KEY = "byok:openai:siwc:host:v1";
/** Keyring slot for the refresh credential. Never sent to the relay. */
var CREDENTIAL_ID = "openai-chatgpt";
var REFRESH_SKEW_MS = 3e5;
function base64UrlEncode(bytes) {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function randomToken() {
	return base64UrlEncode(crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(32)));
}
async function s256(verifier) {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
	return base64UrlEncode(new Uint8Array(digest));
}
function readJson(storage, key) {
	const raw = storage?.getItem(key);
	if (!raw) return null;
	try {
		return JSON.parse(raw);
	} catch {
		return null;
	}
}
function isRecord(value) {
	return typeof value === "object" && value !== null;
}
function readHost() {
	const stored = readJson(globalThis.localStorage, HOST_STORAGE_KEY);
	if (isRecord(stored) && typeof stored.hostId === "string") return {
		hostId: stored.hostId,
		...typeof stored.clientId === "string" && { clientId: stored.clientId }
	};
	const host = { hostId: `urn:uuid:${crypto.randomUUID()}` };
	globalThis.localStorage.setItem(HOST_STORAGE_KEY, JSON.stringify(host));
	return host;
}
function readPending() {
	const stored = readJson(globalThis.sessionStorage, PENDING_STORAGE_KEY);
	if (!isRecord(stored)) return null;
	const { state, nonce, codeVerifier, redirectUri, clientId } = stored;
	if (typeof state !== "string" || typeof nonce !== "string" || typeof codeVerifier !== "string" || typeof redirectUri !== "string" || typeof clientId !== "string") return null;
	return {
		state,
		nonce,
		codeVerifier,
		redirectUri,
		clientId
	};
}
function readCredential(store) {
	const raw = store.keys()[CREDENTIAL_ID];
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		if (isRecord(parsed) && typeof parsed.clientId === "string" && typeof parsed.refreshToken === "string" && typeof parsed.expiresAt === "number") return {
			clientId: parsed.clientId,
			refreshToken: parsed.refreshToken,
			expiresAt: parsed.expiresAt
		};
	} catch {}
	return null;
}
function decodeJwtPayload(token) {
	const part = token.split(".")[1];
	if (!part) throw new Error("ChatGPT sign-in returned a malformed ID token");
	const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
	const parsed = JSON.parse(atob(base64));
	if (!isRecord(parsed)) throw new Error("ChatGPT sign-in returned a malformed ID token");
	return parsed;
}
/**
* The ID token comes straight from the token endpoint over TLS, so OIDC Core
* 3.1.3.7 lets us skip the signature check. We still bind it to this attempt.
*/
function checkIdToken(idToken, clientId, nonce) {
	const claims = decodeJwtPayload(idToken);
	const aud = claims.aud;
	const audOk = Array.isArray(aud) ? aud.includes(clientId) : aud === clientId;
	if (claims.iss !== ISSUER || !audOk || claims.nonce !== nonce) throw new Error("ChatGPT sign-in returned an ID token for another request");
}
var TokenRequestError = class extends Error {
	status;
	constructor(message, status) {
		super(message);
		this.status = status;
	}
};
async function postToken(body, fetchImpl) {
	const response = await fetchImpl(TOKEN_URL, {
		method: "POST",
		headers: { "content-type": "application/x-www-form-urlencoded" },
		body: new URLSearchParams({
			...body,
			resource: RESOURCE
		}).toString()
	});
	const data = await response.json().catch(() => null);
	if (!response.ok) throw new TokenRequestError(`ChatGPT token request failed: ${isRecord(data) && typeof data.error === "string" ? data.error : `${response.status} ${response.statusText}`}`, response.status);
	if (!isRecord(data) || typeof data.access_token !== "string" || typeof data.refresh_token !== "string" || typeof data.expires_in !== "number") throw new Error("ChatGPT token response is missing tokens");
	return {
		access_token: data.access_token,
		refresh_token: data.refresh_token,
		expires_in: data.expires_in,
		scope: typeof data.scope === "string" ? data.scope : "",
		...typeof data.id_token === "string" && { id_token: data.id_token }
	};
}
function toSignIn(clientId, tokens) {
	return {
		clientId,
		accessToken: tokens.access_token,
		refreshToken: tokens.refresh_token,
		expiresAt: Date.now() + tokens.expires_in * 1e3
	};
}
/**
* Open the ChatGPT consent page. Call it from a click handler.
*
* The first sign-in registers a client for your app. Later sign-ins reuse the
* client id saved in `localStorage`.
*
* ChatGPT accepts only a `127.0.0.1` redirect. On `localhost`, the redirect
* goes to `127.0.0.1` on the same port, and {@link completeChatGptSignIn}
* sends the browser back to `localhost` to finish.
*/
async function startChatGptSignIn(options) {
	const redirect = new URL(options.redirectUri ?? new URL(CALLBACK_PATH, globalThis.location.origin));
	if (!options.redirectUri && redirect.hostname === "localhost") redirect.hostname = "127.0.0.1";
	const redirectUri = redirect.toString();
	if (redirect.hostname !== "127.0.0.1" || redirect.pathname !== CALLBACK_PATH) throw new Error(`Sign in with ChatGPT needs a http://127.0.0.1:<port>${CALLBACK_PATH} redirect. Run the app on localhost or 127.0.0.1.`);
	const host = readHost();
	const clientId = host.clientId ?? DYNAMIC_CLIENT_ID;
	const pending = {
		state: randomToken(),
		nonce: randomToken(),
		codeVerifier: randomToken(),
		redirectUri,
		clientId
	};
	globalThis.sessionStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(pending));
	const url = new URL(AUTHORIZE_URL);
	url.searchParams.set("client_id", clientId);
	if (clientId === DYNAMIC_CLIENT_ID) url.searchParams.set("agent_name_hint", options.agentName);
	url.searchParams.set("ext_agent_host_id", host.hostId);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("redirect_uri", redirectUri);
	url.searchParams.set("scope", SCOPE);
	url.searchParams.set("resource", RESOURCE);
	url.searchParams.set("state", pending.state);
	url.searchParams.set("nonce", pending.nonce);
	url.searchParams.set("code_challenge_method", "S256");
	url.searchParams.set("code_challenge", await s256(pending.codeVerifier));
	(options.navigate ?? ((next) => globalThis.location.assign(next)))(url.toString());
}
/**
* Finish the sign-in on your `/auth/callback` page: check the callback and
* exchange the code. Pass the result to {@link saveChatGptSignIn}.
*
* Returns `null` when the URL is not a sign-in callback. Also returns `null`
* when the sign-in started on `localhost`: it then reopens this URL there.
*/
async function completeChatGptSignIn(options = {}) {
	const here = new URL(options.url ?? globalThis.location.href);
	const params = here.searchParams;
	const state = params.get("state");
	if (!state || !params.has("code") && !params.has("error")) return null;
	const pending = readPending();
	if (!pending && here.hostname === "127.0.0.1") {
		here.hostname = "localhost";
		(options.navigate ?? ((next) => globalThis.location.replace(next)))(here.toString());
		return null;
	}
	if (!pending || pending.state !== state) throw new Error("ChatGPT sign-in expired or did not start here. Try again.");
	globalThis.sessionStorage.removeItem(PENDING_STORAGE_KEY);
	const error = params.get("error");
	if (error) {
		const description = params.get("error_description");
		throw new Error(`ChatGPT sign-in failed: ${description ? `${error}: ${description}` : error}`);
	}
	const returnedClientId = params.get("client_id");
	let clientId = pending.clientId;
	if (clientId === DYNAMIC_CLIENT_ID) {
		if (!returnedClientId) throw new Error("ChatGPT sign-in did not return a client id");
		clientId = returnedClientId;
	} else if (returnedClientId && returnedClientId !== clientId) throw new Error("ChatGPT sign-in returned a different client id");
	const tokens = await postToken({
		grant_type: "authorization_code",
		client_id: clientId,
		code: params.get("code") ?? "",
		code_verifier: pending.codeVerifier,
		redirect_uri: pending.redirectUri
	}, options.fetchImpl ?? fetch);
	if (!tokens.id_token) throw new Error("ChatGPT sign-in returned no ID token");
	checkIdToken(tokens.id_token, clientId, pending.nonce);
	if (!tokens.scope.split(" ").includes(PLAN_SCOPE)) throw new Error("ChatGPT plan use was not allowed for this app");
	globalThis.localStorage.setItem(HOST_STORAGE_KEY, JSON.stringify({
		...readHost(),
		clientId
	}));
	return toSignIn(clientId, tokens);
}
/**
* Save a sign-in into the BYOK keyring: the access token under `openai`, the
* refresh credential in a slot that no send attaches. With passkey storage,
* call it from a click handler, before any other `await`.
*/
async function saveChatGptSignIn(store, signIn) {
	const { accessToken, ...credential } = signIn;
	await store.update(CREDENTIAL_ID, JSON.stringify(credential));
	await store.update(openaiByok.id, accessToken);
}
var inFlight = /* @__PURE__ */ new WeakMap();
/**
* Refresh the ChatGPT access token when it expires in under five minutes.
* Call it before each send. It does nothing when the user did not sign in
* with ChatGPT or the keyring is locked.
*
* Refresh tokens rotate, so calls on the same store share one request.
*/
function refreshChatGptSignIn(store, options = {}) {
	const running = inFlight.get(store);
	if (running) return running;
	const next = refresh(store, options.fetchImpl ?? fetch).finally(() => inFlight.delete(store));
	inFlight.set(store, next);
	return next;
}
async function refresh(store, fetchImpl) {
	const credential = readCredential(store);
	if (!credential) return;
	if (!store.keys()[openaiByok.id]) {
		await store.clear(CREDENTIAL_ID);
		return;
	}
	if (credential.expiresAt - Date.now() > REFRESH_SKEW_MS) return;
	try {
		const tokens = await postToken({
			grant_type: "refresh_token",
			client_id: credential.clientId,
			refresh_token: credential.refreshToken
		}, fetchImpl);
		await saveChatGptSignIn(store, toSignIn(credential.clientId, tokens));
	} catch (error) {
		if (error instanceof TokenRequestError && (error.status === 400 || error.status === 401)) {
			await store.clear(CREDENTIAL_ID);
			await store.clear(openaiByok.id);
		}
		throw error;
	}
}
//#endregion
export { completeChatGptSignIn, refreshChatGptSignIn, saveChatGptSignIn, startChatGptSignIn };

//# sourceMappingURL=siwc.js.map