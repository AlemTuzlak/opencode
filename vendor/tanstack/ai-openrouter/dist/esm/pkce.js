import { openrouterByok } from "./byok.js";
//#region src/pkce.ts
var AUTH_ORIGIN = "https://openrouter.ai";
var AUTH_PATH = "/auth";
var KEYS_URL = `${AUTH_ORIGIN}/api/v1/auth/keys`;
var PENDING_STORAGE_KEY = "byok:openrouter:pkce:v1";
var VERIFIER_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
var SIGN_IN_TIMEOUT_MS = 6e5;
var SIGNED_IN_PAGE = "<!doctype html><title>Signed in</title><p>You are signed in to OpenRouter. You can close this tab.</p>";
var SIGN_IN_FAILED_PAGE = "<!doctype html><title>Sign-in failed</title><p>OpenRouter sign-in failed. You can close this tab and try again.</p>";
function getSessionStorage() {
	if (typeof globalThis.sessionStorage === "undefined") return null;
	return globalThis.sessionStorage;
}
function base64UrlEncode(bytes) {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return (typeof btoa === "function" ? btoa(binary) : Buffer.from(bytes).toString("base64")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function generateCodeVerifier(length = 64) {
	const size = Math.min(128, Math.max(43, length));
	const bytes = crypto.getRandomValues(new Uint8Array(size));
	let out = "";
	for (const byte of bytes) {
		const ch = VERIFIER_CHARS[byte % 66];
		out += ch ?? "A";
	}
	return out;
}
async function createS256CodeChallenge(codeVerifier) {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier));
	return base64UrlEncode(new Uint8Array(digest));
}
function buildOpenRouterAuthUrl(options) {
	const url = new URL(AUTH_PATH, AUTH_ORIGIN);
	url.searchParams.set("callback_url", options.callbackUrl);
	if (options.codeChallenge) {
		url.searchParams.set("code_challenge", options.codeChallenge);
		url.searchParams.set("code_challenge_method", options.codeChallengeMethod ?? "S256");
	}
	return url.toString();
}
function storeOpenRouterPkcePending(pending) {
	getSessionStorage()?.setItem(PENDING_STORAGE_KEY, JSON.stringify(pending));
}
function loadOpenRouterPkcePending() {
	const raw = getSessionStorage()?.getItem(PENDING_STORAGE_KEY);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		if (typeof parsed !== "object" || parsed === null) return null;
		if (!("codeVerifier" in parsed) || !("codeChallengeMethod" in parsed)) return null;
		if (!("callbackUrl" in parsed)) return null;
		const { codeVerifier, codeChallengeMethod, callbackUrl } = parsed;
		if (typeof codeVerifier !== "string") return null;
		if (codeChallengeMethod !== "S256") return null;
		if (typeof callbackUrl !== "string") return null;
		return {
			codeVerifier,
			codeChallengeMethod,
			callbackUrl
		};
	} catch {
		return null;
	}
}
function clearOpenRouterPkcePending() {
	getSessionStorage()?.removeItem(PENDING_STORAGE_KEY);
}
function defaultOpenRouterCallbackUrl() {
	if (typeof globalThis.location === "undefined") return "";
	return `${globalThis.location.origin}${globalThis.location.pathname}`;
}
async function startOpenRouterPkceLogin(options = {}) {
	const callbackUrl = options.callbackUrl ?? defaultOpenRouterCallbackUrl();
	if (!callbackUrl) throw new Error("OpenRouter PKCE login requires a callbackUrl");
	const codeVerifier = generateCodeVerifier();
	const codeChallenge = await createS256CodeChallenge(codeVerifier);
	storeOpenRouterPkcePending({
		codeVerifier,
		codeChallengeMethod: "S256",
		callbackUrl
	});
	const authUrl = buildOpenRouterAuthUrl({
		callbackUrl,
		codeChallenge,
		codeChallengeMethod: "S256"
	});
	(options.navigate ?? ((url) => {
		globalThis.location.assign(url);
	}))(authUrl);
}
async function exchangeOpenRouterCode(options) {
	const fetchImpl = options.fetchImpl ?? fetch;
	const body = { code: options.code };
	if (options.codeVerifier) {
		body.code_verifier = options.codeVerifier;
		if (options.codeChallengeMethod) body.code_challenge_method = options.codeChallengeMethod;
	}
	const response = await fetchImpl(KEYS_URL, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body)
	});
	if (!response.ok) {
		let detail = `${response.status} ${response.statusText}`;
		try {
			const err = await response.json();
			if (typeof err === "object" && err !== null && "error" in err) detail = String(err.error);
		} catch {}
		throw new Error(`OpenRouter PKCE exchange failed: ${detail}`);
	}
	const data = await response.json();
	if (typeof data !== "object" || data === null || !("key" in data) || typeof data.key !== "string" || data.key.length === 0) throw new Error("OpenRouter PKCE exchange returned no key");
	return data.key;
}
function stripOpenRouterCodeFromUrl(href) {
	if (typeof globalThis.history === "undefined") return;
	const base = href ?? globalThis.location.href;
	const url = new URL(base);
	if (!url.searchParams.has("code")) return;
	url.searchParams.delete("code");
	const next = `${url.pathname}${url.search}${url.hash}`;
	globalThis.history.replaceState({}, "", next);
}
async function completeOpenRouterPkceFromUrl(options = {}) {
	const href = options.url ?? (typeof globalThis.location !== "undefined" ? globalThis.location.href : "");
	if (!href) return null;
	const code = new URL(href).searchParams.get("code");
	if (!code) return null;
	const pending = loadOpenRouterPkcePending();
	if (!pending) throw new Error("OpenRouter authorization code present but PKCE session expired — try signing in again");
	const key = await exchangeOpenRouterCode({
		code,
		codeVerifier: pending.codeVerifier,
		codeChallengeMethod: pending.codeChallengeMethod,
		fetchImpl: options.fetchImpl
	});
	if (options.clearPending !== false) clearOpenRouterPkcePending();
	if (options.cleanUrl !== false) stripOpenRouterCodeFromUrl(href);
	return key;
}
/**
* Finish the OpenRouter PKCE callback and save the key under
* {@link openrouterByok.id}.
*/
async function completeOpenRouterPkceIntoByok(byok, options = {}) {
	const key = await completeOpenRouterPkceFromUrl(options);
	if (!key) return null;
	await byok.update(openrouterByok.id, key);
	return key;
}
/**
* OpenRouter sign-in for a local app, such as a CLI. The user signs in with a
* browser and the app gets an API key (PKCE with S256), so nobody copies a
* key by hand.
*
* The returned `signIn` starts a one-time listener on `127.0.0.1`, calls
* `open` with the OpenRouter sign-in URL, and waits for the browser to come
* back. Then it trades the code for a key and resolves with the key. The
* listener closes when `signIn` settles. `signIn` rejects when the state does
* not match, after `timeoutMs`, or when `signal` aborts.
*
* `node:http` loads only when `signIn` runs, so this module stays safe to
* import in a browser.
*
* @example
* const signIn = openrouterSignIn()
* const key = await signIn({ open: (url) => console.log(`Open ${url}`) })
*/
function openrouterSignIn(options = {}) {
	return async (ctx) => {
		const { createServer } = await import("node:http");
		const codeVerifier = generateCodeVerifier();
		const codeChallenge = await createS256CodeChallenge(codeVerifier);
		const state = base64UrlEncode(crypto.getRandomValues(/* @__PURE__ */ new Uint8Array(16)));
		const server = createServer();
		await new Promise((resolve, reject) => {
			server.once("error", reject);
			server.listen(0, "127.0.0.1", () => resolve());
		});
		const address = server.address();
		const port = typeof address === "object" && address ? address.port : 0;
		const callbackPath = `/callback/${state}`;
		const callbackUrl = `http://127.0.0.1:${port}${callbackPath}`;
		const settled = new AbortController();
		try {
			return await exchangeOpenRouterCode({
				code: await new Promise((resolve, reject) => {
					const { signal } = ctx;
					if (signal?.aborted) {
						reject(signal.reason);
						return;
					}
					signal?.addEventListener("abort", () => reject(signal.reason), { signal: settled.signal });
					const timer = setTimeout(() => reject(/* @__PURE__ */ new Error("OpenRouter sign-in timed out.")), options.timeoutMs ?? SIGN_IN_TIMEOUT_MS);
					settled.signal.addEventListener("abort", () => clearTimeout(timer));
					server.on("request", (req, res) => {
						const url = new URL(req.url ?? "/", callbackUrl);
						if (!url.pathname.startsWith("/callback/")) {
							res.writeHead(404).end();
							return;
						}
						const hasState = url.pathname === callbackPath;
						const returnedCode = url.searchParams.get("code");
						const isSignedIn = hasState && Boolean(returnedCode);
						res.writeHead(isSignedIn ? 200 : 400, {
							"content-type": "text/html; charset=utf-8",
							connection: "close"
						}).end(isSignedIn ? SIGNED_IN_PAGE : SIGN_IN_FAILED_PAGE);
						if (!hasState) reject(/* @__PURE__ */ new Error("OpenRouter sign-in failed: the state does not match."));
						else if (!returnedCode) reject(/* @__PURE__ */ new Error("OpenRouter sign-in failed: the callback has no code."));
						else resolve(returnedCode);
					});
					ctx.open(buildOpenRouterAuthUrl({
						callbackUrl,
						codeChallenge,
						codeChallengeMethod: "S256"
					}));
				}),
				codeVerifier,
				codeChallengeMethod: "S256",
				fetchImpl: options.fetchImpl
			});
		} finally {
			settled.abort();
			server.close();
			server.closeIdleConnections();
		}
	};
}
//#endregion
export { buildOpenRouterAuthUrl, clearOpenRouterPkcePending, completeOpenRouterPkceFromUrl, completeOpenRouterPkceIntoByok, createS256CodeChallenge, defaultOpenRouterCallbackUrl, exchangeOpenRouterCode, generateCodeVerifier, loadOpenRouterPkcePending, openrouterSignIn, startOpenRouterPkceLogin, storeOpenRouterPkcePending, stripOpenRouterCodeFromUrl };

//# sourceMappingURL=pkce.js.map