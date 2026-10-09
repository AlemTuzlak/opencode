import { BetaCodeExecutionTool20250522, BetaCodeExecutionTool20250825 } from '@anthropic-ai/sdk/resources/beta';
import { ProviderTool, Tool } from '@tanstack/ai';
export type CodeExecutionToolConfig = BetaCodeExecutionTool20250522 | BetaCodeExecutionTool20250825;
/** @deprecated Renamed to `CodeExecutionToolConfig`. Will be removed in a future release. */
export type CodeExecutionTool = CodeExecutionToolConfig;
/**
 * A hosted/managed Anthropic Skill reference. Lifted by the text adapter into
 * the top-level `container.skills` request param (NOT serialized into the
 * `tools[]` entry). Requires the `code_execution` tool to be enabled.
 */
export interface AnthropicContainerSkill {
    /** 1–64 characters. */
    skill_id: string;
    type: 'anthropic' | 'custom';
    /** Skill version, or `'latest'` (default) when omitted. */
    version?: string;
}
export interface CodeExecutionToolOptions {
    /** Hosted skills to load into the code-execution container (max 8). */
    skills?: Array<AnthropicContainerSkill>;
}
export type AnthropicCodeExecutionTool = ProviderTool<'anthropic', 'code_execution'>;
export declare function convertCodeExecutionToolToAdapterFormat(tool: Tool): CodeExecutionToolConfig;
/**
 * Reads the SDK tool config attached to a `code_execution` tool, if any.
 * Used by the text adapter to select the version-aware code-execution beta.
 */
export declare function readCodeExecutionConfig(tool: Tool): CodeExecutionToolConfig | undefined;
/**
 * Reads the hosted skills attached to a `code_execution` tool, if any.
 * Used by the text adapter to build the top-level `container.skills` param.
 */
export declare function readCodeExecutionSkills(tool: Tool): Array<AnthropicContainerSkill> | undefined;
export declare function codeExecutionTool(config: CodeExecutionToolConfig, options?: CodeExecutionToolOptions): AnthropicCodeExecutionTool;
