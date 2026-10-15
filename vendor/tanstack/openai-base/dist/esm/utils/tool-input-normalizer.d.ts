import { Tool } from '@tanstack/ai';
import { StructuredOutputCompatibility } from './schema-converter.js';
type ToolInputNormalizer = (toolName: string, input: unknown) => unknown;
type SchemaConverterWithMap = (schema: Record<string, any>, originalRequired?: Array<string>) => StructuredOutputCompatibility;
/**
 * Build the inverse transform for the strict tool schemas sent in one request.
 * Pass the same converter the request used so subclass schema tweaks stay
 * aligned with undo. Non-strict tools are excluded because they were not
 * null-widened on the wire.
 */
export declare function createToolInputNormalizer(tools: Array<Tool> | undefined, convertSchema?: SchemaConverterWithMap): ToolInputNormalizer;
export {};
