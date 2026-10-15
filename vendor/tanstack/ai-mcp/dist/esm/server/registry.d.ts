import { MCPServerOptions } from './create-server.js';
/** Internal. Records the options that `server` was created with. */
export declare function rememberServerOptions(server: object, options: MCPServerOptions): void;
/** Internal. Returns the options that `server` was created with. */
export declare function optionsOfServer(server: object): MCPServerOptions | undefined;
/** Internal. Records that `serveMCPStdio` serves `server`. */
export declare function markServedOverStdio(server: object): void;
/** Internal. True when `serveMCPStdio` serves `server`. */
export declare function isServedOverStdio(server: object): boolean;
