import { NullWideningMap } from '@tanstack/ai-utils';
interface MistralStructuredOutputCompatibility {
    schema: Record<string, any>;
    nullWideningMap: NullWideningMap | undefined;
    strict: boolean;
}
/**
 * Convert a schema for Mistral strict mode and record how to invert it.
 *
 * Outcomes:
 * - `strict: true` — rewritten schema (`required` closed, optionals null-widened).
 *   `nullWideningMap` marks synthesized optional nulls only; already-nullable
 *   fields and enum/const repairs on required nodes are unmarked.
 * - `strict: false` — original schema, no map. Used when `oneOf`/`allOf`/`not`/
 *   `$ref`/`$defs` appear, or an `anyOf` branch would need a branch-dependent map.
 */
export declare function makeMistralStructuredOutputCompatibleWithMap(schema: Record<string, any>, originalRequired?: Array<string>): MistralStructuredOutputCompatibility;
export {};
