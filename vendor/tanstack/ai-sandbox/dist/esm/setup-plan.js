//#region src/setup-plan.ts
function buildSetupPlan(input) {
	if (input === void 0) return [];
	if (Array.isArray(input)) return input.map((command) => ({
		kind: "serial",
		command
	}));
	const groups = [];
	input({
		serial: (command) => groups.push({
			kind: "serial",
			command
		}),
		parallel: (commands) => groups.push({
			kind: "parallel",
			commands
		})
	});
	return groups;
}
//#endregion
export { buildSetupPlan };

//# sourceMappingURL=setup-plan.js.map