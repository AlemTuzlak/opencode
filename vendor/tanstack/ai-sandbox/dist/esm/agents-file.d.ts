import { SandboxHandle } from './contracts.js';
import { WorkspaceSkill } from './workspace.js';
/**
 * Resolve the directory a `gitSkill` repo is cloned into when no explicit
 * `into` override is provided. The convention is:
 *
 *   `<root>/.tanstack-skills/<basename>`
 *
 * where `basename` is derived from the `repo` field by taking the last
 * path segment and stripping a trailing `.git` suffix.
 *
 * Per-harness projectors (e.g. the Claude Code adapter) import this helper
 * so they can locate cloned skill repos consistently.
 *
 * @param root  - Workspace root inside the sandbox (e.g. `/workspace`).
 * @param skill - A `WorkspaceSkill` of `kind === 'git'`.
 */
export declare function resolveGitSkillDir(root: string, skill: Extract<WorkspaceSkill, {
    kind: 'git';
}>): string;
/** A folder that contains `SKILL.md`, ready to project under a harness skills dir. */
export interface DiscoveredSkillDir {
    name: string;
    dir: string;
}
/**
 * Find every skill folder under a cloned `gitSkill` repo.
 *
 * A skill folder is a directory that contains `SKILL.md`. Nested packs
 * (`skills/foo/SKILL.md`) are returned as `{ name: 'foo', dir: '…/skills/foo' }`.
 * A flat clone with `SKILL.md` at the root is returned as one entry named
 * after the clone. If no `SKILL.md` is found, the clone itself is returned
 * so existing basename projection still works.
 *
 * The tree walk itself is the shared `walkSkillDirs` from `@tanstack/ai-skills`
 * (parameterized over an injected lister — here `handle.fs.list`). The
 * empty→clone-dir fallback is kept here because it is correct for harness
 * projection but wrong for a skills catalog, so it must not live in the shared
 * helper.
 */
export declare function discoverSkillDirs(handle: SandboxHandle, cloneDir: string): Promise<Array<DiscoveredSkillDir>>;
/** Format workspace scripts as a `## Workspace scripts` markdown section. */
export declare function formatWorkspaceScriptsSection(scripts: Record<string, string>): string;
/**
 * Merge base AGENTS.md content with an optional workspace scripts section.
 * Returns `undefined` when there is nothing to write.
 */
export declare function mergeAgentsContent(base: string | undefined, scripts: Record<string, string> | undefined): string | undefined;
/**
 * Write `AGENTS.md` under `root` and create per-CLI symlinks (or copies as a
 * fallback when `ln -s` is unavailable).
 *
 * @param handle - The sandbox handle providing `fs` and `process`.
 * @param root   - Absolute path inside the sandbox under which to write.
 * @param content - Markdown content for the instruction file.
 */
export declare function writeAgentsFile(handle: SandboxHandle, root: string, content: string): Promise<void>;
