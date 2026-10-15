import { ToolBinding } from '../types.js';
/**
 * Options for type stub generation
 */
export interface TypeGeneratorOptions {
    /**
     * Include JSDoc comments with descriptions
     * @default true
     */
    includeDescriptions?: boolean;
}
/**
 * Generate TypeScript type stubs for all tool bindings
 *
 * These stubs are included in the LLM system prompt so it knows
 * the exact type signatures of available tools.
 *
 * Tool names match the actual function names injected into the sandbox.
 */
export declare function generateTypeStubs(bindings: Record<string, ToolBinding>, options?: TypeGeneratorOptions): string;
interface TypeResult {
    name: string;
    declaration: string;
}
/**
 * Convert a JSON Schema to a TypeScript type
 *
 * Supports basic types: string, number, boolean, object, array
 */
export declare function jsonSchemaToTypeScript(schema: Record<string, unknown>, typeName: string, includeDescriptions?: boolean): TypeResult;
export {};
