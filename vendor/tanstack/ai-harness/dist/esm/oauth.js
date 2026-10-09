//#region src/oauth.ts
var encoder = new TextEncoder();
/** Base64url (RFC 4648 section 5) without padding. */
function base64url(bytes) {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function randomString(bytes = 32) {
	return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}
/** A PKCE pair with the S256 method (RFC 7636). */
async function createPkce() {
	const verifier = randomString(32);
	const digest = await crypto.subtle.digest("SHA-256", encoder.encode(verifier));
	return {
		verifier,
		challenge: base64url(new Uint8Array(digest))
	};
}
/** The URL that starts a browser sign-in. */
function buildAuthorizationUrl(config, options) {
	const url = new URL(config.authorizationUrl);
	url.searchParams.set("response_type", "code");
	url.searchParams.set("client_id", config.clientId);
	url.searchParams.set("redirect_uri", options.redirectUri);
	url.searchParams.set("state", options.state);
	url.searchParams.set("code_challenge", options.challenge);
	url.searchParams.set("code_challenge_method", "S256");
	if (config.scopes?.length) url.searchParams.set("scope", config.scopes.join(" "));
	return url.toString();
}
async function tokenRequest(config, body, doFetch) {
	const response = await doFetch(config.tokenUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Accept: "application/json"
		},
		body: new URLSearchParams({
			client_id: config.clientId,
			...config.clientSecret ? { client_secret: config.clientSecret } : {},
			...body
		})
	});
	const parsed = await response.json().catch(() => ({}));
	if (typeof parsed !== "object" || parsed === null) throw new Error(`OAuth token request failed (${response.status}).`);
	return parsed;
}
function credentialFrom(response, previous) {
	if (typeof response.access_token !== "string") {
		const reason = typeof response.error === "string" ? response.error : "no access_token";
		throw new Error(`OAuth token request failed: ${reason}`);
	}
	const refreshToken = typeof response.refresh_token === "string" ? response.refresh_token : previous?.type === "oauth" ? previous.refreshToken : void 0;
	return {
		type: "oauth",
		accessToken: response.access_token,
		...refreshToken ? { refreshToken } : {},
		...typeof response.expires_in === "number" ? { expiresAt: Date.now() + response.expires_in * 1e3 } : {},
		...typeof response.scope === "string" ? { scopes: response.scope.split(/[ ,]/).filter(Boolean) } : {}
	};
}
/** Trade an authorization code for tokens. */
async function exchangeCode(config, options) {
	return credentialFrom(await tokenRequest(config, {
		grant_type: "authorization_code",
		code: options.code,
		code_verifier: options.verifier,
		redirect_uri: options.redirectUri
	}, options.fetch ?? fetch));
}
/** True when an OAuth credential expires within `skewMs`. */
function isExpired(credential, skewMs = 6e4) {
	return credential.type === "oauth" && credential.expiresAt !== void 0 && credential.expiresAt - skewMs <= Date.now();
}
/** Get a new access token with the refresh token. */
async function refreshCredential(config, credential, doFetch = fetch) {
	if (credential.type !== "oauth" || !credential.refreshToken) throw new Error("This credential has no refresh token.");
	return credentialFrom(await tokenRequest(config, {
		grant_type: "refresh_token",
		refresh_token: credential.refreshToken
	}, doFetch), credential);
}
var DONE_PAGE = "<!doctype html><title>Signed in</title><p>You are signed in. You can close this tab.</p>";
/**
* A one-time receiver for an OAuth redirect on `127.0.0.1` (RFC 8252). Use it
* when another library runs the OAuth flow and you only need the code back:
* register `redirectUri`, send the user to the authorization URL, then await
* `waitForCode(state)`. It answers one callback, then stops listening.
*
* `waitForCode` resolves with the code and the `iss` the server sent with it
* (RFC 9207). Pass `iss` on to the library: a server that sends it can refuse
* a code without it.
*/
async function startLoopbackReceiver(options = {}) {
	const { createServer } = await import("node:http");
	const server = createServer();
	await new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", () => resolve());
	});
	const address = server.address();
	const redirectUri = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}/callback`;
	const close = () => {
		server.closeAllConnections();
		server.close();
	};
	return {
		redirectUri,
		close,
		waitForCode: (state) => new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				close();
				reject(/* @__PURE__ */ new Error("Sign-in timed out."));
			}, options.timeoutMs ?? 6e5);
			server.on("request", (req, res) => {
				const url = new URL(req.url ?? "/", redirectUri);
				if (url.pathname !== "/callback") {
					res.writeHead(404).end();
					return;
				}
				clearTimeout(timer);
				res.writeHead(200, { "Content-Type": "text/html" }).end(DONE_PAGE);
				close();
				const code = url.searchParams.get("code");
				const iss = url.searchParams.get("iss");
				if (url.searchParams.get("state") !== state) reject(/* @__PURE__ */ new Error("Sign-in failed: the state does not match."));
				else if (!code) reject(/* @__PURE__ */ new Error(`Sign-in failed: ${url.searchParams.get("error") ?? "no code"}`));
				else resolve(iss ? {
					code,
					iss
				} : { code });
			});
		})
	};
}
/**
* Sign in through the browser with a loopback redirect (RFC 8252 + PKCE).
* Listens on `127.0.0.1` on a random port, for one callback only. Calls
* `onUrl` with the URL to open. Resolves with the tokens.
*/
async function loopbackLogin(config, options) {
	const { createServer } = await import("node:http");
	const { verifier, challenge } = await createPkce();
	const state = randomString(16);
	const server = createServer();
	await new Promise((resolve, reject) => {
		server.once("error", reject);
		server.listen(0, "127.0.0.1", () => resolve());
	});
	const address = server.address();
	const redirectUri = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}/callback`;
	try {
		return await exchangeCode(config, {
			code: await new Promise((resolve, reject) => {
				const timer = setTimeout(() => reject(/* @__PURE__ */ new Error("Sign-in timed out.")), options.timeoutMs ?? 6e5);
				server.on("request", (req, res) => {
					const url = new URL(req.url ?? "/", redirectUri);
					if (url.pathname !== "/callback") {
						res.writeHead(404).end();
						return;
					}
					clearTimeout(timer);
					const returnedState = url.searchParams.get("state");
					const returnedCode = url.searchParams.get("code");
					res.writeHead(200, { "Content-Type": "text/html" }).end(DONE_PAGE);
					if (returnedState !== state) reject(/* @__PURE__ */ new Error("Sign-in failed: the state does not match."));
					else if (!returnedCode) reject(/* @__PURE__ */ new Error(`Sign-in failed: ${url.searchParams.get("error") ?? "no code"}`));
					else resolve(returnedCode);
				});
				options.onUrl(buildAuthorizationUrl(config, {
					redirectUri,
					state,
					challenge
				}));
			}),
			verifier,
			redirectUri,
			...options.fetch ? { fetch: options.fetch } : {}
		});
	} finally {
		server.closeAllConnections();
		server.close();
	}
}
/**
* Sign in with a device code (RFC 8628), for SSH sessions, containers, and
* CI. Calls `onCode` with the code and the page to enter it on, then polls.
*/
async function deviceLogin(config, options) {
	if (!config.deviceUrl) throw new Error("This OAuth app has no device endpoint.");
	const doFetch = options.fetch ?? fetch;
	const sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
	const device = await (await doFetch(config.deviceUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Accept: "application/json"
		},
		body: new URLSearchParams({
			client_id: config.clientId,
			...config.scopes?.length ? { scope: config.scopes.join(" ") } : {}
		})
	})).json();
	if (typeof device !== "object" || device === null || !("device_code" in device) || typeof device.device_code !== "string" || !("user_code" in device) || typeof device.user_code !== "string") throw new Error("Device sign-in failed: the server sent no device code.");
	const verificationUri = "verification_uri" in device && typeof device.verification_uri === "string" ? device.verification_uri : config.authorizationUrl;
	let interval = "interval" in device && typeof device.interval === "number" ? device.interval * 1e3 : 5e3;
	const expiresAt = Date.now() + ("expires_in" in device && typeof device.expires_in === "number" ? device.expires_in * 1e3 : 9e5);
	options.onCode({
		userCode: device.user_code,
		verificationUri
	});
	while (Date.now() < expiresAt) {
		await sleep(interval);
		const response = await tokenRequest(config, {
			grant_type: "urn:ietf:params:oauth:grant-type:device_code",
			device_code: device.device_code
		}, doFetch);
		if (response.error === "authorization_pending") continue;
		if (response.error === "slow_down") {
			interval += 5e3;
			continue;
		}
		return credentialFrom(response);
	}
	throw new Error("Device sign-in expired.");
}
//#endregion
export { base64url, buildAuthorizationUrl, createPkce, deviceLogin, exchangeCode, isExpired, loopbackLogin, refreshCredential, startLoopbackReceiver };

//# sourceMappingURL=oauth.js.map