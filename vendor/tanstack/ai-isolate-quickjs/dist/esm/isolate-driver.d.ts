import { IsolateDriver } from '@tanstack/ai-code-mode';
/**
 * Configuration for the QuickJS WASM isolate driver
 */
export interface QuickJSIsolateDriverConfig {
    /**
     * Default execution timeout in ms (default: 30000)
     */
    timeout?: number;
    /**
     * Default memory limit in MB (default: 128).
     * Applied via QuickJS `runtime.setMemoryLimit`.
     */
    memoryLimit?: number;
    /**
     * Default max stack size in bytes (default: 512 KiB).
     * Applied via QuickJS `runtime.setMaxStackSize`.
     */
    maxStackSize?: number;
    /**
     * URL or path from which Emscripten loads the QuickJS WASM binary.
     *
     * When omitted, `quickjs-emscripten` resolves its bundled WASM binary.
     * Set this when serving the binary from a public directory or CDN.
     */
    wasmLocation?: string;
}
/**
 * Create a QuickJS WASM isolate driver
 *
 * This driver uses QuickJS compiled to WebAssembly via Emscripten.
 * It provides a sandboxed JavaScript environment that runs anywhere
 * (Node.js, browser, edge) without native dependencies.
 *
 * Tools are injected as async functions that bridge back to the host.
 *
 * @example
 * ```typescript
 * import { createQuickJSIsolateDriver } from '@tanstack/ai-isolate-quickjs'
 *
 * const driver = createQuickJSIsolateDriver({
 *   timeout: 30000,
 * })
 *
 * const context = await driver.createContext({
 *   bindings: {
 *     readFile: {
 *       name: 'readFile',
 *       description: 'Read a file',
 *       inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
 *       execute: async ({ path }) => fs.readFile(path, 'utf-8'),
 *     },
 *   },
 * })
 *
 * const result = await context.execute(`
 *   const content = await readFile({ path: './data.json' })
 *   return JSON.parse(content)
 * `)
 * ```
 */
export declare function createQuickJSIsolateDriver(config?: QuickJSIsolateDriverConfig): IsolateDriver;
