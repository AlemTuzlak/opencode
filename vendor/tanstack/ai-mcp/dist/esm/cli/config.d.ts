import { MCPCodegenConfig } from './define-config.js';
export type { CodegenServerConfig, MCPCodegenConfig } from './define-config.js';
export { defineConfig } from './define-config.js';
/** Load mcp.config.ts (via jiti) or mcp.config.json from cwd. */
export declare function loadConfig(cwd: string): Promise<MCPCodegenConfig>;
