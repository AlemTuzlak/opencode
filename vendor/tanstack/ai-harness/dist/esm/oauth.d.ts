import { Credential } from '@tanstack/ai-persistence';
/** An OAuth 2 app: where to send the user, and where to get tokens. */
export interface OAuthConfig {
    authorizationUrl: string;
    tokenUrl: string;
    /** The device authorization endpoint (RFC 8628), for logins without a browser here. */
    deviceUrl?: string;
    clientId: string;
    /** Only for confidential clients. A CLI is a public client and has none. */
    clientSecret?: string;
    scopes?: ReadonlyArray<string>;
}
type Fetch = typeof fetch;
/** Base64url (RFC 4648 section 5) without padding. */
export declare function base64url(bytes: Uint8Array): string;
/** A PKCE pair with the S256 method (RFC 7636). */
export declare function createPkce(): Promise<{
    verifier: string;
    challenge: string;
}>;
/** The URL that starts a browser sign-in. */
export declare function buildAuthorizationUrl(config: OAuthConfig, options: {
    redirectUri: string;
    state: string;
    challenge: string;
}): string;
/** Trade an authorization code for tokens. */
export declare function exchangeCode(config: OAuthConfig, options: {
    code: string;
    verifier: string;
    redirectUri: string;
    fetch?: Fetch;
}): Promise<Credential>;
/** True when an OAuth credential expires within `skewMs`. */
export declare function isExpired(credential: Credential, skewMs?: number): boolean;
/** Get a new access token with the refresh token. */
export declare function refreshCredential(config: OAuthConfig, credential: Credential, doFetch?: Fetch): Promise<Credential>;
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
export declare function startLoopbackReceiver(options?: {
    timeoutMs?: number;
}): Promise<{
    redirectUri: string;
    waitForCode: (state: string) => Promise<{
        code: string;
        iss?: string;
    }>;
    close: () => void;
}>;
/**
 * Sign in through the browser with a loopback redirect (RFC 8252 + PKCE).
 * Listens on `127.0.0.1` on a random port, for one callback only. Calls
 * `onUrl` with the URL to open. Resolves with the tokens.
 */
export declare function loopbackLogin(config: OAuthConfig, options: {
    onUrl: (url: string) => void;
    fetch?: Fetch;
    timeoutMs?: number;
}): Promise<Credential>;
/**
 * Sign in with a device code (RFC 8628), for SSH sessions, containers, and
 * CI. Calls `onCode` with the code and the page to enter it on, then polls.
 */
export declare function deviceLogin(config: OAuthConfig, options: {
    onCode: (info: {
        userCode: string;
        verificationUri: string;
    }) => void;
    fetch?: Fetch;
    /** Test hook. Default waits the interval the server asks for. */
    sleep?: (ms: number) => Promise<void>;
}): Promise<Credential>;
export {};
