import { createCodeModeTool } from "./create-code-mode-tool.js";
import { createCodeModeSystemPrompt } from "./create-system-prompt.js";
import { createDiscoveryTool } from "./create-discovery-tool.js";
//#region src/create-code-mode.ts
/**
* Create the `execute_typescript` tool, its matching system prompt, and (when
* any tools are marked `lazy: true`) a `discover_tools` companion tool.
*
* @example
* ```typescript
* import { createCodeMode } from '@tanstack/ai-code-mode'
* import { createNodeIsolateDriver } from '@tanstack/ai-isolate-node'
*
* const { tools, systemPrompt } = createCodeMode({
*   driver: createNodeIsolateDriver(),
*   tools: [weatherTool, rarelyUsedTool], // mark rarelyUsedTool lazy: true
* })
*
* chat({
*   systemPrompts: [myPrompt, systemPrompt],
*   tools: [...tools, ...otherTools],
*   messages,
* })
* ```
*/
function createCodeMode(config) {
	const tool = createCodeModeTool(config);
	const systemPrompt = createCodeModeSystemPrompt(config);
	const lazyTools = config.tools.filter((t) => t.lazy);
	const discoveryTool = lazyTools.length > 0 ? createDiscoveryTool(lazyTools, config.lazyToolsConfig) : null;
	return {
		tool,
		discoveryTool,
		tools: discoveryTool ? [tool, discoveryTool] : [tool],
		systemPrompt
	};
}
//#endregion
export { createCodeMode };

//# sourceMappingURL=create-code-mode.js.map