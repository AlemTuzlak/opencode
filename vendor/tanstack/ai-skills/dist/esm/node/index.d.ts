import { GeneratedCatalog } from '../static/index.js';
import { SkillSource } from '../types.js';
export interface SkillDirectoryOptions {
    maxDepth?: number;
    /** default true — promote parse warnings to errors (see spec §7). */
    strict?: boolean;
}
export declare function skillDirectory(root: string | Array<string>, options?: SkillDirectoryOptions): SkillSource;
/**
 * Read a skill directory tree into a plain {@link GeneratedCatalog} — the shape
 * `staticSkills` consumes. Used by the Vite plugin and directly available for
 * custom build scripts.
 */
export declare function generateCatalog(root: string | Array<string>, options?: SkillDirectoryOptions): Promise<GeneratedCatalog>;
/** Structural Vite plugin (no `vite` type dependency). */
export interface SkillsCatalogPlugin {
    name: string;
    resolveId: (id: string) => string | undefined;
    load: (this: {
        addWatchFile?: (id: string) => void;
    }, id: string) => Promise<string | undefined>;
}
/**
 * Vite plugin that globs `SKILL.md` under `dir` at build time and serves a
 * virtual module (default id `virtual:tanstack-skills`) exporting the catalog
 * `as const`. Consumers then wrap it with `staticSkills` for a literal-union of
 * skill names. The catalog is embedded as JSON, so the bundle hash tracks it.
 */
export declare function skillsCatalogPlugin(options?: {
    dir?: string;
    virtualId?: string;
    maxDepth?: number;
}): SkillsCatalogPlugin;
