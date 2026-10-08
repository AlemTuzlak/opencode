/**
 * Duck-typed BYOK store. `ByokClient` from `defineByok` matches this.
 */
export interface ChatGptByokStore {
    keys: () => Record<string, string | undefined>;
    update: (provider: string, key: string) => void | Promise<void>;
    clear: (provider?: string) => void | Promise<void>;
}
export interface StartChatGptSignInOptions {
    /** Your app's name. OpenAI shows it on the consent screen. */
    agentName: string;
    /**
     * Defaults to `<origin>/auth/callback`, with `localhost` swapped for
     * `127.0.0.1`. The host must be `127.0.0.1`.
     */
    redirectUri?: string;
    navigate?: (url: string) => void;
}
export interface CompleteChatGptSignInOptions {
    /** Defaults to `location.href`. */
    url?: string;
    fetchImpl?: typeof fetch;
    navigate?: (url: string) => void;
}
export interface RefreshChatGptSignInOptions {
    fetchImpl?: typeof fetch;
}
interface Credential {
    clientId: string;
    refreshToken: string;
    expiresAt: number;
}
/** A finished sign-in. Hold it in memory until you save it. */
export interface ChatGptSignIn extends Credential {
    accessToken: string;
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
export declare function startChatGptSignIn(options: StartChatGptSignInOptions): Promise<void>;
/**
 * Finish the sign-in on your `/auth/callback` page: check the callback and
 * exchange the code. Pass the result to {@link saveChatGptSignIn}.
 *
 * Returns `null` when the URL is not a sign-in callback. Also returns `null`
 * when the sign-in started on `localhost`: it then reopens this URL there.
 */
export declare function completeChatGptSignIn(options?: CompleteChatGptSignInOptions): Promise<ChatGptSignIn | null>;
/**
 * Save a sign-in into the BYOK keyring: the access token under `openai`, the
 * refresh credential in a slot that no send attaches. With passkey storage,
 * call it from a click handler, before any other `await`.
 */
export declare function saveChatGptSignIn(store: ChatGptByokStore, signIn: ChatGptSignIn): Promise<void>;
/**
 * Refresh the ChatGPT access token when it expires in under five minutes.
 * Call it before each send. It does nothing when the user did not sign in
 * with ChatGPT or the keyring is locked.
 *
 * Refresh tokens rotate, so calls on the same store share one request.
 */
export declare function refreshChatGptSignIn(store: ChatGptByokStore, options?: RefreshChatGptSignInOptions): Promise<void>;
export {};
