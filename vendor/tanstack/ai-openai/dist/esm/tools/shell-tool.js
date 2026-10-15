import { convertShellToolToAdapterFormat, shellTool } from "@tanstack/openai-base";
//#region src/tools/shell-tool.ts
/**
* Creates a standard Tool from ShellTool parameters, branded as an OpenAI
* provider tool. Pass `environment` to attach a container + skills.
*/
function shellTool$1(config = {}) {
	return shellTool(config);
}
//#endregion
export { convertShellToolToAdapterFormat, shellTool$1 as shellTool };

//# sourceMappingURL=shell-tool.js.map