import { BetaToolBash20241022, BetaToolBash20250124 } from '@anthropic-ai/sdk/resources/beta';
import { ProviderTool, Tool } from '@tanstack/ai';
export type BashToolConfig = BetaToolBash20241022 | BetaToolBash20250124;
/** @deprecated Renamed to `BashToolConfig`. Will be removed in a future release. */
export type BashTool = BashToolConfig;
export type AnthropicBashTool = ProviderTool<'anthropic', 'bash'>;
export declare function convertBashToolToAdapterFormat(tool: Tool): BashToolConfig;
export declare function bashTool(config: BashToolConfig): AnthropicBashTool;
