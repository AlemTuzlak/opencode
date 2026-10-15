export type OpenRouterPkceChallengeMethod = 'S256';
export interface OpenRouterPkcePending {
    codeVerifier: string;
    codeChallengeMethod: OpenRouterPkceChallengeMethod;
    callbackUrl: string;
}
export interface OpenRouterAuthUrlOptions {
    callbackUrl: string;
    codeChallenge?: string;
    codeChallengeMethod?: OpenRouterPkceChallengeMethod;
}
export interface StartOpenRouterPkceOptions {
    callbackUrl?: string;
    navigate?: (url: string) => void;
}
export interface ExchangeOpenRouterCodeOptions {
    code: string;
    codeVerifier?: string;
    codeChallengeMethod?: OpenRouterPkceChallengeMethod;
    fetchImpl?: typeof fetch;
}
export interface OpenRouterSignInOptions {
    /** How long to wait for the browser to come back. Default: 10 minutes. */
    timeoutMs?: number;
    fetchImpl?: typeof fetch;
}
export interface CompleteOpenRouterPkceFromUrlOptions {
    url?: string;
    fetchImpl?: typeof fetch;
    clearPending?: boolean;
    cleanUrl?: boolean;
}
/**
 * Duck-typed BYOK store. `ByokClient.update` matches this. The slug is always
 * {@link openrouterByok.id}.
 */
export interface OpenRouterByokStore {
    update: (provider: string, key: string) => void | Promise<void>;
}
export declare function generateCodeVerifier(length?: number): string;
export declare function createS256CodeChallenge(codeVerifier: string): Promise<string>;
export declare function buildOpenRouterAuthUrl(options: OpenRouterAuthUrlOptions): string;
export declare function storeOpenRouterPkcePending(pending: OpenRouterPkcePending): void;
export declare function loadOpenRouterPkcePending(): {
    codeVerifier: string;
    codeChallengeMethod: "S256";
    callbackUrl: string;
} | null;
export declare function clearOpenRouterPkcePending(): void;
export declare function defaultOpenRouterCallbackUrl(): string;
export declare function startOpenRouterPkceLogin(options?: StartOpenRouterPkceOptions): Promise<void>;
export declare function exchangeOpenRouterCode(options: ExchangeOpenRouterCodeOptions): Promise<string>;
export declare function stripOpenRouterCodeFromUrl(href?: string): void;
export declare function completeOpenRouterPkceFromUrl(options?: CompleteOpenRouterPkceFromUrlOptions): Promise<string | null>;
/**
 * Finish the OpenRouter PKCE callback and save the key under
 * {@link openrouterByok.id}.
 */
export declare function completeOpenRouterPkceIntoByok(byok: OpenRouterByokStore, options?: CompleteOpenRouterPkceFromUrlOptions): Promise<string | null>;
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
export declare function openrouterSignIn(options?: OpenRouterSignInOptions): (ctx: {
    open: (url: string) => void;
    signal?: AbortSignal;
}) => Promise<string>;
