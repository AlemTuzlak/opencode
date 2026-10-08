import { ByokProvider } from '@tanstack/ai/byok';
import { AnyCommand } from '../commands.js';
/** Signs the user in and resolves to an API key, for example `openrouterSignIn()`. */
type ProviderSignIn = (ctx: {
    open: (url: string) => void;
    signal?: AbortSignal;
}) => Promise<string>;
/**
 * A provider the user can connect: its BYOK descriptor, with a sign-in when
 * it has one. `keyUrl` is the provider's page to make a key: `/connect` opens
 * it in the browser before it asks for the key.
 */
type KeyProvider = ByokProvider & {
    signIn?: ProviderSignIn;
    keyUrl?: string;
};
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
export declare function providerKeys(options: {
    providers: ReadonlyArray<KeyProvider>;
}): import('..').HarnessPlugin<{
    readonly name: "tanstack/provider-keys";
    readonly setup: (ctx: import('..').PluginSetupContext) => Promise<{
        commands: Record<string, AnyCommand>;
    }>;
}>;
export {};
