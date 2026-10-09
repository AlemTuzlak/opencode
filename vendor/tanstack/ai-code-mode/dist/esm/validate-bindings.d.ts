export interface SecretParameterInfo {
    toolName: string;
    paramName: string;
    paramPath: Array<string>;
}
export type SecretParameterHandler = 'warn' | 'throw' | 'ignore' | ((info: SecretParameterInfo) => void);
interface ToolLike {
    name: string;
    inputSchema?: Record<string, unknown>;
}
/**
 * Scan tool input schemas for parameter names that look like secrets.
 * Emits a warning (or invokes the configured handler) for each match.
 *
 * Recurses into nested object properties, array items, union branches
 * (anyOf/oneOf/allOf), additionalProperties, and `$ref` targets that
 * resolve within the same schema's `$defs`/`definitions`.
 *
 * Best-effort heuristic, not a security boundary.
 */
export declare function warnIfBindingsExposeSecrets(tools: Array<ToolLike>, options?: {
    handler?: SecretParameterHandler;
    dedupCache?: Set<string>;
}): void;
export {};
