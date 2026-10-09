import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { StdioTransportConfig } from './transport.js';
/**
 * Build a stdio Transport to pass as `createMCPClient({ transport })`.
 *
 * Node only. This does not start the process.
 * `config.command` is the program. `config.args`, `config.env`, and `config.cwd` go to that program.
 */
export declare function stdioTransport(config: Omit<StdioTransportConfig, 'type'>): StdioClientTransport;
