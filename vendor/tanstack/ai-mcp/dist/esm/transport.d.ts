import { SSEClientTransport, StreamableHTTPClientTransport, OAuthClientProvider, Transport } from '@modelcontextprotocol/client';
export interface HttpTransportConfig {
    type: 'http';
    url: string;
    headers?: Record<string, string>;
    fetch?: typeof fetch;
    authProvider?: OAuthClientProvider;
}
export interface SseTransportConfig {
    type: 'sse';
    url: string;
    headers?: Record<string, string>;
    fetch?: typeof fetch;
    authProvider?: OAuthClientProvider;
}
/** stdio is declared here for typing but constructed only via `@tanstack/ai-mcp/stdio`. */
export interface StdioTransportConfig {
    type: 'stdio';
    command: string;
    args?: Array<string>;
    env?: Record<string, string>;
    cwd?: string;
}
export type TransportConfig = HttpTransportConfig | SseTransportConfig | StdioTransportConfig;
/** Either a built-in config or a ready-made Transport instance (escape hatch). */
export type TransportInput = TransportConfig | Transport;
/**
 * Return true when `input` is already a Transport, not a config object.
 */
export declare function isTransportInstance(input: TransportInput): input is Transport;
/**
 * Build a Transport from HTTP config, SSE config, or an existing Transport.
 *
 * For stdio, build the Transport with `stdioTransport` and pass that instance.
 * Throws an Error when the config type is `stdio` or is not a known type.
 */
export declare function resolveTransport(input: TransportInput): Promise<Transport | StreamableHTTPClientTransport | SSEClientTransport>;
