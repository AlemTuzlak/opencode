import { ByokProvider } from './define-provider.js';
import { ProviderId } from './providers.js';
/**
 * Read `provider.env` in order and return the first value that is set. A
 * slug has no env names. Where `process` is missing (a browser) it returns
 * `null`.
 */
export declare function envKey(provider: ProviderId | ByokProvider): string | null;
/**
 * Read a key on the relay. Import from `@tanstack/ai/byok/server` so this
 * `process.env` access is not in the client graph.
 *
 * The header wins. A {@link ByokProvider} then tries `provider.env` in order.
 * A slug is header-only.
 */
export declare function getByokKey(request: Request, provider: ProviderId | ByokProvider): string | null;
/**
 * Read several keys at once, one per name. Same rules as {@link getByokKey}
 * for each entry. Use it for a credential made of more than one value.
 */
export declare function getByokKeys<const TProviders extends Record<string, ProviderId | ByokProvider>>(request: Request, providers: TProviders): { [K in keyof TProviders]: string | null; };
