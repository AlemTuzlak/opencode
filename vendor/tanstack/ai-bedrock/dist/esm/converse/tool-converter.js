//#region src/converse/tool-converter.ts
function toToolConfig(tools, choice) {
	if (!tools.length) return void 0;
	if (choice === "none") return void 0;
	const toolChoice = mapChoice(choice);
	return {
		tools: tools.flatMap((t) => [{ toolSpec: {
			name: t.name,
			...t.description ? { description: t.description } : {},
			inputSchema: { json: t.inputSchema }
		} }, ...t.cachePoint ? [{ cachePoint: t.cachePoint }] : []]),
		...toolChoice ? { toolChoice } : {}
	};
}
function mapChoice(choice) {
	if (!choice || choice === "auto") return { auto: {} };
	if (choice === "required") return { any: {} };
	if (choice === "none") return void 0;
	return { tool: { name: choice.name } };
}
//#endregion
export { toToolConfig };

//# sourceMappingURL=tool-converter.js.map