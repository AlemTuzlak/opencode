//#region src/validate.ts
var XML_TAG = /<[^>]+>/;
var RESERVED_ANTHROPIC = ["anthropic", "claude"];
/** Lint a skill against the given delivery targets (default `['portable']`). */
function validateSkill(skill, options = {}) {
	const targets = options.targets ?? ["portable"];
	const issues = [];
	const add = (target, message) => issues.push({
		target,
		message
	});
	if (targets.includes("portable")) {
		if (!/^[a-z0-9-]+$/.test(skill.name)) add("portable", "name must match [a-z0-9-]");
		if (skill.name.length > 64) add("portable", "name exceeds 64 characters");
		if (skill.description.length > 1024) add("portable", "description exceeds 1024 characters");
	}
	if (targets.includes("anthropic")) {
		const lower = skill.name.toLowerCase();
		if (RESERVED_ANTHROPIC.some((r) => lower.includes(r))) add("anthropic", "name may not contain \"anthropic\" or \"claude\"");
		if (XML_TAG.test(skill.name) || XML_TAG.test(skill.description)) add("anthropic", "name/description may not contain XML tags");
	}
	if (targets.includes("openai")) {
		if (skill.name.trim() === "") add("openai", "name must not be empty");
	}
	return {
		ok: issues.length === 0,
		issues
	};
}
//#endregion
export { validateSkill };

//# sourceMappingURL=validate.js.map