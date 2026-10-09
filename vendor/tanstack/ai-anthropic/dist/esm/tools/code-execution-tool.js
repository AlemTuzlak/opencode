import { brandAnthropicProviderTool, getAnthropicProviderToolMetadata } from "./anthropic-provider-tool.js";
import { SkillLimitError } from "@tanstack/ai";
//#region src/tools/code-execution-tool.ts
function convertCodeExecutionToolToAdapterFormat(tool) {
	return readCodeExecutionConfig(tool);
}
/**
* Reads the SDK tool config attached to a `code_execution` tool, if any.
* Used by the text adapter to select the version-aware code-execution beta.
*/
function readCodeExecutionConfig(tool) {
	return getAnthropicProviderToolMetadata(tool)?.config;
}
/**
* Reads the hosted skills attached to a `code_execution` tool, if any.
* Used by the text adapter to build the top-level `container.skills` param.
*/
function readCodeExecutionSkills(tool) {
	return getAnthropicProviderToolMetadata(tool)?.skills;
}
function codeExecutionTool(config, options = {}) {
	const { skills } = options;
	if (skills) {
		if (skills.length > 8) throw new SkillLimitError({
			provider: "anthropic",
			path: "native",
			limit: "code_execution supports at most 8 skills per request",
			allowed: 8,
			actual: skills.length,
			offending: skills.map((s) => s.skill_id)
		});
		for (const skill of skills) if (skill.skill_id.length < 1 || skill.skill_id.length > 64) throw new Error("skill_id must be between 1 and 64 characters.");
	}
	const metadata = {
		config,
		...skills && { skills }
	};
	return brandAnthropicProviderTool({
		name: "code_execution",
		description: "",
		metadata
	}, "code_execution");
}
//#endregion
export { codeExecutionTool, convertCodeExecutionToolToAdapterFormat, readCodeExecutionConfig, readCodeExecutionSkills };

//# sourceMappingURL=code-execution-tool.js.map