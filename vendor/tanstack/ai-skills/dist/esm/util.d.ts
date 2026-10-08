/**
 * Reject a resource/script path that escapes its skill root. Pure string check
 * (edge-safe, no `node:path`): no absolute paths, no `..` segments, no
 * backslashes. Enforced here so both the resource tool and `skillDirectory`
 * share one guard and the conformance suite can pin it.
 */
export declare function assertSafeResourcePath(path: string): void;
/** Small, edge-safe (no `node:crypto`) stable string hash for `revision()`. */
export declare function stableHash(input: string): string;
