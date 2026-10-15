import { AnyTool } from '@tanstack/ai';
import { OAuthConfig } from './oauth.js';
export interface OAuthConnectorOptions {
    /** A short id, for example `'github'`. Commands are `connect:<id>` and `disconnect:<id>`. */
    id: string;
    label: string;
    oauth: OAuthConfig;
    /** `'loopback'` (default) opens a browser here. `'device'` shows a code to enter elsewhere. */
    login?: 'loopback' | 'device';
    /**
     * The tools of this service. Call `token()` inside a tool: it returns a
     * fresh access token, or fails with `auth_required` before sign-in. With
     * `token({ wait: true })`, the turn waits for the sign-in and the tool
     * runs again after it (see `CredentialsAccess.require`).
     */
    tools?: (token: (options?: {
        wait?: boolean;
    }) => Promise<string>) => ReadonlyArray<AnyTool>;
    /** Test hook for the token endpoint. */
    fetch?: typeof fetch;
}
/**
 * A plugin that signs the user in to an OAuth service and gives the model
 * that service's tools. Adds `connect:<id>` and `disconnect:<id>` commands.
 * Tokens stay in the credential store. The model never sees them.
 *
 * @example
 * ```ts
 * const github = oauthConnector({
 *   id: 'github',
 *   label: 'GitHub',
 *   oauth: { authorizationUrl, tokenUrl, deviceUrl, clientId, scopes: ['repo'] },
 *   tools: (token) => [listIssues(token)],
 * })
 * ```
 */
export declare function oauthConnector(options: OAuthConnectorOptions): import('./plugins.js').HarnessPlugin<{
    readonly name: `connector/${string}`;
    readonly setup: (ctx: import('./plugins.js').PluginSetupContext) => {
        tools: readonly AnyTool[];
        commands: {
            [x: string]: import('./commands.js').CommandDefinition<any>;
        };
    };
}>;
