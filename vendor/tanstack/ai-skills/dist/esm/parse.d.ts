import { SkillMetadata } from './types.js';
export interface ParseWarning {
    code: 'name-dir-mismatch' | 'name-too-long' | 'name-invalid-chars';
    message: string;
}
export interface ParsedSkill {
    metadata: SkillMetadata;
    /** frontmatter stripped. */
    body: string;
    warnings: Array<ParseWarning>;
}
export declare class SkillParseError extends Error {
    name: string;
}
/**
 * Parse a `SKILL.md`. Throws {@link SkillParseError} for cases the spec says to
 * skip (no frontmatter, missing description). Non-fatal issues are returned as
 * `warnings`; `strict` turns them into throws.
 */
export declare function parseSkill(raw: string, opts?: {
    dirName?: string;
    strict?: boolean;
}): ParsedSkill;
/** Strip the frontmatter block, returning just the body. */
export declare function stripFrontmatter(raw: string): string;
