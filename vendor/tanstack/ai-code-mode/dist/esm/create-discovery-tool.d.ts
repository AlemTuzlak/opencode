import { z } from 'zod';
import { LazyToolsConfig, ServerTool } from '@tanstack/ai';
import { CodeModeTool } from './types.js';
declare const discoverInputSchema: z.ZodObject<{
    toolNames: z.ZodArray<z.ZodString>;
}, z.core.$strip>;
declare const discoverOutputSchema: z.ZodObject<{
    tools: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodString;
        typeStub: z.ZodString;
    }, z.core.$strip>>;
    errors: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
/**
 * Build the `discover_tools` sibling tool for Code Mode lazy tools. The model
 * calls it with lazy tool names and receives each one's TypeScript type stub +
 * description, which it can then use to write correctly-typed `external_*`
 * calls inside `execute_typescript`. The bindings themselves are always present
 * in the sandbox — this only reveals documentation.
 *
 * Tools are catalogued in `external_<name>` form to match the "Discoverable
 * APIs" section of the Code Mode system prompt; lookups tolerate either form.
 * `lazyToolsConfig.includeDescription` controls how much of each tool's
 * description appears in this tool's own catalog (mirroring the system prompt).
 */
export declare function createDiscoveryTool(lazyTools: Array<CodeModeTool>, lazyToolsConfig?: LazyToolsConfig): ServerTool<typeof discoverInputSchema, typeof discoverOutputSchema, 'discover_tools'>;
export {};
