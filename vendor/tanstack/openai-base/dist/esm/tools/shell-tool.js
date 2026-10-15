import { getOpenAIProviderToolMetadata, openAIProviderTool } from "./openai-provider-tool.js";
//#region src/tools/shell-tool.ts
/**
* Validate skill references carried by a shell `environment`. Previously the
* factory validated nothing, so a malformed `skill_id` surfaced as an unframed
* provider 400. Only `skill_reference` entries carry a `skill_id`; inline and
* local skills are shaped differently and left untouched.
*
* ponytail: OpenAI documents no client-checkable count cap for shell skills
* (unlike Anthropic's 8), so we validate `skill_id` format only and do not
* fabricate a `SkillLimitError` count limit. Add one here if OpenAI publishes a cap.
*/
function validateShellEnvironment(environment) {
	const skills = environment && "skills" in environment ? environment.skills : void 0;
	if (!skills) return;
	for (const skill of skills) if ("skill_id" in skill) {
		const id = skill.skill_id;
		if (id.length < 1 || id.length > 64) throw new Error("skill_id must be between 1 and 64 characters.");
	}
}
/**
* Converts a standard Tool to OpenAI ShellTool format, preserving any
* `environment` (container config + skills) stored in metadata.
*/
function convertShellToolToAdapterFormat(tool) {
	const metadata = getOpenAIProviderToolMetadata(tool) ?? {};
	return {
		type: "shell",
		...metadata.environment !== void 0 && { environment: metadata.environment }
	};
}
/**
* Creates a standard Tool from ShellTool parameters.
*
* Base (non-branded) factory. Providers that need branded return types should
* re-wrap this in their own package.
*/
function shellTool(config = {}) {
	validateShellEnvironment(config.environment);
	return openAIProviderTool({
		name: "shell",
		description: "Execute shell commands",
		metadata: { ...config.environment !== void 0 && { environment: config.environment } }
	}, "shell");
}
//#endregion
export { convertShellToolToAdapterFormat, shellTool };

//# sourceMappingURL=shell-tool.js.map