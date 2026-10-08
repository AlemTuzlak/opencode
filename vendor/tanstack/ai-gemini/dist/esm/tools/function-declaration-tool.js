//#region src/tools/function-declaration-tool.ts
var validateFunctionDeclarationTool = (tool) => {
	if (tool.name === void 0 || !/^[a-zA-Z0-9_:.-]{1,64}$/.test(tool.name)) throw new Error(`Invalid function name: ${tool.name}. Must be 1-64 characters long and contain only a-z, A-Z, 0-9, underscores, colons, dots, and dashes.`);
	if (tool.parameters && tool.parametersJsonSchema) throw new Error(`FunctionDeclarationTool cannot have both 'parameters' and 'parametersJsonSchema' defined. Please use only one.`);
	if (tool.response && tool.responseJsonSchema) throw new Error(`FunctionDeclarationTool cannot have both 'response' and 'responseJsonSchema' defined. Please use only one.`);
};
function functionDeclarationTools(tools) {
	tools.forEach(validateFunctionDeclarationTool);
	return { functionDeclarations: tools };
}
//#endregion
export { functionDeclarationTools };

//# sourceMappingURL=function-declaration-tool.js.map