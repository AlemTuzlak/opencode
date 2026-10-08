import { SetupInput } from './setup-plan.js';
import { BearerRef, SecretRef, Secrets } from './secrets.js';
/**
 * Workspace definition — the portable description of what the agent sees
 * inside the sandbox. Each harness adapter PROJECTS this into its own native
 * format via `projectWorkspace()` (e.g. Claude Code → CLAUDE.md + .claude/skills
 * + --mcp-config). The definition itself is provider- and harness-agnostic.
 */
/** Where the working tree comes from. */
export type WorkspaceSource = {
    type: 'git';
    url: string;
    ref?: string;
    auth?: {
        username?: string;
        token: string;
    };
    /**
     * Clone depth. Defaults to `1` (shallow). Pass a number for a specific
     * depth, or `'full'` to fetch the entire history.
     */
    depth?: number | 'full';
} | {
    type: 'local';
    path: string;
} | {
    type: 'none';
};
/** Clone a git repo into the workspace. `githubRepo` is a convenience wrapper. */
export declare function gitSource(input: {
    url: string;
    ref?: string;
    auth?: {
        username?: string;
        token: string;
    };
    depth?: number | 'full';
}): WorkspaceSource;
export declare function githubRepo(input: {
    repo: string;
    ref?: string;
    auth?: {
        username?: string;
        token: string;
    };
    depth?: number | 'full';
}): WorkspaceSource;
export declare function localSource(path: string): WorkspaceSource;
/**
 * An MCP server config where header names/values may be plain strings or
 * unresolved SecretRef values. Secrets are resolved by each harness projector
 * at projection time — never at definition time.
 */
export type McpConfig = {
    headers?: Record<string, string | SecretRef | BearerRef>;
    [key: string]: unknown;
};
/** A unit of agent guidance/config projected into the harness's native format. */
export type WorkspaceSkill = {
    kind: 'file';
    path: string;
    content: string;
} | {
    kind: 'agent-skill';
    name: string;
} | {
    kind: 'mcp';
    name: string;
    config: McpConfig;
} | {
    kind: 'git';
    /** Short `owner/repo` or a full HTTPS URL. */
    repo: string;
    /** Optional SecretRef for private-repo authentication. */
    secret?: SecretRef;
    /** Absolute path inside the sandbox to clone into. Defaults to a `.tanstack-skills/<repo>` dir under the workspace root. */
    into?: string;
};
/** Write a file (e.g. CLAUDE.md) into the workspace / harness config. */
export declare function fileSkill(input: {
    path: string;
    content: string;
}): WorkspaceSkill;
/** Reference a named agent skill the harness should load. */
export declare function agentSkill(name: string): WorkspaceSkill;
/** Project an MCP server into the harness. Header values may be SecretRefs. */
export declare function mcpSkill(name: string, config: McpConfig): WorkspaceSkill;
/**
 * Clone a git repository as a workspace skill (e.g. a private skill repo).
 * The clone is performed during bootstrap; `secret` is resolved from the
 * workspace `secrets` registry at that time.
 */
export declare function gitSkill(input: {
    repo: string;
    secret?: SecretRef;
    into?: string;
}): WorkspaceSkill;
export type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun' | 'auto';
export interface WorkspaceDefinition {
    source: WorkspaceSource;
    /** Defaults to `'auto'` — detect from the lockfile after the source lands. */
    packageManager?: PackageManager;
    /** Commands run once during bootstrap. Accepts a string array (serial) or a builder function for serial/parallel groups. */
    setup?: SetupInput;
    /** Named commands the agent/user can invoke (e.g. { test: 'pnpm test' }). */
    scripts?: Record<string, string>;
    /** Guidance/config projected into the harness. */
    skills?: Array<WorkspaceSkill>;
    /**
     * Natural-language instructions written to AGENTS.md (and symlinked as
     * CLAUDE.md, GEMINI.md, etc.) inside the sandbox during bootstrap.
     */
    instructions?: string;
    /**
     * Harness plugin identifiers installed idempotently by each harness
     * projector (e.g. `['@anthropic/plugin-foo']` for Claude Code).
     */
    plugins?: Array<string>;
    /**
     * Typed secret references. The underlying values are injected into the
     * sandbox env at create/resume — NEVER written to snapshots, the
     * SandboxInstanceStore, or the event log.
     */
    secrets?: Secrets;
    /** Workspace root inside the sandbox. Defaults to `/workspace`. */
    root?: string;
}
export declare function defineWorkspace(definition: WorkspaceDefinition): WorkspaceDefinition;
