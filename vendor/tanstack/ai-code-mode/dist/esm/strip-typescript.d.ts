/**
 * Strip TypeScript syntax from code, converting it to plain JavaScript.
 *
 * This is a safety net to ensure that even if an LLM generates TypeScript
 * code with type annotations, it will be converted to valid JavaScript
 * before being sent to the sandbox for execution.
 *
 * Uses sucrase's pure-JavaScript `transform`, which strips the TypeScript
 * syntax that LLM-generated snippets use in practice:
 * - Type annotations (: string, : number, etc.)
 * - Generic types (Array<T>, Record<K, V>, etc.)
 * - Interface and type declarations
 * - Type assertions
 * - Enums (converted to JavaScript objects)
 *
 * Unlike esbuild, sucrase has no native binary and pulls in no Node-only
 * built-ins on its `transform` path, so this module is safe to bundle for
 * browsers and edge runtimes (Cloudflare Workers/Pages etc.).
 *
 * Limitations vs esbuild: sucrase is a type-stripper, not a down-leveler.
 * `disableESTransforms` leaves modern ECMAScript syntax untouched (the sandbox
 * engines are modern), and sucrase does NOT compile a few exotic constructs:
 * - TypeScript value `namespace`/`module` blocks are DROPPED (not emitted as an
 *   IIFE), so referencing the namespace at runtime throws `ReferenceError`.
 * - Decorators and the `accessor` keyword pass through un-lowered, so the
 *   sandbox sees invalid syntax.
 * - Post-ES2022 syntax (`using` declarations, RegExp `/v`·`/d` flags) is passed
 *   through; it runs on modern V8/Node sandboxes but may fail on older engines
 *   (e.g. QuickJS).
 * If you need any of these, supply a heavier (Node-only) transpiler via the
 * `transpile` option on `createCodeModeTool`.
 *
 * The code is wrapped in an async function before transformation to allow
 * top-level `return` and `await` statements, then unwrapped after.
 *
 * Note on errors: sucrase reports syntax errors with a position relative to the
 * *wrapped* code (offset by the one-line wrapper prefix), so any line numbers
 * surfaced downstream (e.g. `CodeModeToolResult.error.line`) are approximate.
 *
 * @param code - TypeScript or JavaScript code
 * @returns Plain JavaScript code with all type syntax removed
 * @throws Error if sucrase fails (e.g., syntax error) or wrapper extraction fails
 */
export declare function stripTypeScript(code: string): Promise<string>;
