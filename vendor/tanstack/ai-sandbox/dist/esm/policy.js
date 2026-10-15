//#region src/policy.ts
function defineSandboxPolicy(policy) {
	return policy;
}
/** Convert a glob/prefix pattern to a RegExp anchored to the full command. */
function patternToRegExp(pattern) {
	const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
	return new RegExp(`^${escaped}$`);
}
/**
* All equivalent forms of a command line when workspace scripts are defined:
* the literal command, its expanded script value, and any script name that
* expands to the same value.
*/
function commandAliases(command, scripts) {
	const trimmed = command.trim();
	const aliases = /* @__PURE__ */ new Set([trimmed]);
	if (scripts === void 0) return [...aliases];
	const expanded = scripts[trimmed];
	if (expanded !== void 0) aliases.add(expanded);
	for (const [name, value] of Object.entries(scripts)) if (value === trimmed) aliases.add(name);
	return [...aliases];
}
function patternMatchesCommand(pattern, command, scripts) {
	const commandForms = commandAliases(command, scripts);
	for (const patternForm of commandAliases(pattern, scripts)) {
		const re = patternToRegExp(patternForm);
		if (commandForms.some((form) => re.test(form))) return true;
	}
	return false;
}
/**
* Resolve a command line against the policy. Precedence: deny > ask > allow,
* then `default` (defaults to `'ask'`). Exported for adapter permission
* mappers and unit tests.
*
* When `scripts` is provided, policy patterns may match either a script name
* or its expanded command value (and vice versa for the command under test).
*/
function evaluateCommand(command, policy, scripts) {
	const fallback = policy?.default ?? "ask";
	const rules = policy?.commands;
	if (!rules) return fallback;
	const matches = (patterns) => (patterns ?? []).some((pattern) => patternMatchesCommand(pattern, command, scripts));
	if (matches(rules.deny)) return "deny";
	if (matches(rules.ask)) return "ask";
	if (matches(rules.allow)) return "allow";
	return fallback;
}
//#endregion
export { commandAliases, defineSandboxPolicy, evaluateCommand };

//# sourceMappingURL=policy.js.map