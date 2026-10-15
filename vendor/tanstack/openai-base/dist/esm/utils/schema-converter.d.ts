import { NullWideningMap } from '@tanstack/ai-utils';
import { Tool } from '@tanstack/ai';
import { InternalLogger } from '@tanstack/ai/adapter-internals';
/**
 * Recursively drop JSON-Schema `format` keywords whose value isn't in OpenAI's
 * strict-mode allowlist. Pure — returns a fresh tree and never mutates `node`,
 * so the caller's original tool definition is left intact.
 *
 * A property *named* `format` always has a schema (object/boolean) value, never
 * a bare string, so it is preserved and recursed into; only the `format`
 * *keyword* (whose value is a string) is subject to removal.
 */
export declare function stripUnsupportedFormats(node: any): any;
/**
 * Transform a JSON schema to be compatible with OpenAI's structured output requirements.
 * OpenAI requires:
 * - All properties must be in the `required` array
 * - Optional fields should have null added to their type union
 * - additionalProperties must be false for objects
 * - String `format` keywords must be from a fixed allowlist (others are stripped)
 *
 * @param schema - JSON schema to transform
 * @param originalRequired - Original required array (to know which fields were optional)
 * @returns Transformed schema compatible with OpenAI structured output
 */
export declare function makeStructuredOutputCompatible(schema: Record<string, any>, originalRequired?: Array<string>): Record<string, any>;
export interface StructuredOutputCompatibility {
    schema: Record<string, any>;
    nullWideningMap: NullWideningMap | undefined;
}
/**
 * Strict-schema conversion plus an exact map of the nullability introduced by
 * that conversion. Consumers can pass provider output through
 * `undoNullWidening` before validating it against the original schema.
 */
export declare function makeStructuredOutputCompatibleWithMap(schema: Record<string, any>, originalRequired?: Array<string>): StructuredOutputCompatibility;
/**
 * Returns `false` when `schema` cannot be made strict-compatible and must be
 * sent with `strict: false`. Two ways that happens:
 *
 * 1. It uses a JSON-Schema keyword outside OpenAI's strict subset anywhere in
 *    the tree (`oneOf`/`allOf`/`not`/`prefixItems`/`$ref`/`$defs`).
 * 2. It contains a *typeless* schema node — a property/items/anyOf entry with
 *    no `type` (nor `enum`/`const`/combinator), e.g. the `{}` that `z.any()`
 *    produces. Strict mode rejects typeless schemas.
 * 3. It contains an open object schema. OpenAI strict mode requires objects to
 *    set `additionalProperties: false`, which would change the semantics of a
 *    free-form map rather than merely normalizing it.
 * 4. An `anyOf` variant itself needs null widening. The inverse map is
 *    intentionally schema-blind, so it cannot select a variant without risking
 *    removal of a genuine nullable value accepted by another variant.
 *
 * Conservative by design: for (1) keywords are matched as object keys, so a
 * property literally named e.g. `oneOf` also trips it. That only costs that one
 * tool its strict mode, which is strictly safer than a false "compatible"
 * verdict that 400s the whole request.
 */
export declare function isStrictModeCompatible(schema: unknown): boolean;
/**
 * Why `schema` must be sent with `strict: false`, or `undefined` when it can be
 * strict. Runs the same checks as `isStrictModeCompatible`, in the same order.
 */
export declare function strictModeFallbackReason(schema: unknown): string | undefined;
/** Options that every `openai-base` text adapter accepts in its config. */
export interface OpenAIBaseTextAdapterOptions {
    /**
     * In development, warn once per tool that is sent with `strict: false`
     * because its schema cannot be strict. Set to `false` to turn the warning
     * off. It never runs when `NODE_ENV` is `production`. Default: `true`.
     */
    strictFallbackWarning?: boolean;
}
/**
 * Warn once per tool that is sent with `strict: false` because its schema
 * cannot be strict. The tool still works, but the model is not held to the
 * schema, so the developer must know (#1213).
 */
export declare function warnStrictFallback(tools: Array<Tool> | undefined, logger: InternalLogger): void;
