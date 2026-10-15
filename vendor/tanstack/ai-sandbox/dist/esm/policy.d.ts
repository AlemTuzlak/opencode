/**
 * Sandbox policy — a portable, harness-agnostic description of what the agent
 * may do. Each harness adapter MAPS this onto its native permission system
 * (Claude Code → canUseTool + allowedTools/disallowedTools/permissionMode).
 *
 * Command rules are matched as glob/prefix patterns against the command line.
 * Precedence is deny > ask > allow; unmatched commands fall to `default`.
 * `'ask'` surfaces the existing resume-based `approval-requested` flow.
 */
export type PolicyDecision = 'allow' | 'ask' | 'deny';
export interface CommandRules {
    /** Glob/prefix patterns to allow outright (e.g. 'pnpm *', 'git diff'). */
    allow?: Array<string>;
    /** Patterns that require approval before running. */
    ask?: Array<string>;
    /** Patterns to refuse (e.g. 'sudo *', 'rm -rf *'). */
    deny?: Array<string>;
}
/** Coarse, non-command capability gates for tools like Write/Edit and network. */
export interface CapabilityRules {
    /** File-modifying tools (Write/Edit). Defaults to the policy `default`. */
    fileWrite?: PolicyDecision;
    /** Outbound network access. Defaults to the policy `default`. */
    network?: PolicyDecision;
}
export interface SandboxPolicy {
    commands?: CommandRules;
    capabilities?: CapabilityRules;
    /** Decision for anything not matched by a rule. Defaults to `'ask'`. */
    default?: PolicyDecision;
}
export declare function defineSandboxPolicy(policy: SandboxPolicy): SandboxPolicy;
/**
 * All equivalent forms of a command line when workspace scripts are defined:
 * the literal command, its expanded script value, and any script name that
 * expands to the same value.
 */
export declare function commandAliases(command: string, scripts: Record<string, string> | undefined): Array<string>;
/**
 * Resolve a command line against the policy. Precedence: deny > ask > allow,
 * then `default` (defaults to `'ask'`). Exported for adapter permission
 * mappers and unit tests.
 *
 * When `scripts` is provided, policy patterns may match either a script name
 * or its expanded command value (and vice versa for the command under test).
 */
export declare function evaluateCommand(command: string, policy: SandboxPolicy | undefined, scripts?: Record<string, string>): PolicyDecision;
