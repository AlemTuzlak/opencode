import { ToolBridgeProvisioner } from './tool-bridge.js';
/** Whether ngrok tunnelling is configured (an authtoken is present). */
export declare function ngrokConfigured(): boolean;
/**
 * A {@link ToolBridgeProvisioner} that tunnels the loopback bridge through ngrok
 * (one ephemeral tunnel per run; both are torn down together). Requires the
 * optional `@ngrok/ngrok` peer dependency and `NGROK_AUTHTOKEN`.
 */
export declare const ngrokBridgeProvisioner: ToolBridgeProvisioner;
/**
 * Chat middleware that routes the tool bridge through ngrok. Add it AFTER
 * `withSandbox(...)` for cloud providers so the in-sandbox harness can reach the
 * host tools. Not needed for local-process / Docker (they reach the bridge
 * directly) — just don't add it there.
 */
export declare const withNgrokBridge: import('@tanstack/ai').DefinedChatMiddleware<unknown, readonly [], readonly [], never>;
