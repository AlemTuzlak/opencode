/**
 * Generic skill-directory walk, shared with `@tanstack/ai-sandbox`.
 *
 * The algorithm is identical to the one in `ai-sandbox/src/agents-file.ts`, but
 * parameterized over an injected `list` function so it works over any backing
 * store (`node:fs`, a `SandboxHandle.fs`, an in-memory tree). Taking only an
 * injected function keeps this edge-safe, so it lives in the root barrel.
 */
/** A directory that contains `SKILL.md`. */
export interface DiscoveredSkillDir {
    name: string;
    dir: string;
}
/** One entry as reported by an injected {@link ListDir}. */
export interface WalkEntry {
    name: string;
    path: string;
    type: 'file' | 'dir';
}
export type ListDir = (dir: string) => Promise<Array<WalkEntry>>;
export declare const SKILL_FILE = "SKILL.md";
export declare const MAX_SKILL_WALK_DEPTH = 6;
/**
 * Find every skill folder under `root`. A skill folder is a directory that
 * directly contains `SKILL.md`; the walk stops descending once found. Skips
 * dot-directories, `.git`, and `node_modules`. Bounded by `maxDepth`. Errors
 * from `list` are swallowed (an unreadable directory yields nothing).
 *
 * Unlike `ai-sandbox`'s `discoverSkillDirs`, this returns `[]` when nothing is
 * found — the "fall back to the clone dir" behavior is a harness-projection
 * concern and stays at that call site (it is wrong for a catalog).
 */
export declare function walkSkillDirs(list: ListDir, root: string, opts?: {
    maxDepth?: number;
}): Promise<Array<DiscoveredSkillDir>>;
