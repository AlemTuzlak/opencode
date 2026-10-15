//#region src/parse.ts
var SkillParseError = class extends Error {
	name = "SkillParseError";
};
var NAME_RE = /^[a-z0-9-]+$/;
/** Split leading `---` frontmatter from the body. Returns null if absent. */
function splitFrontmatter(raw) {
	const text = raw.replace(/^﻿/, "");
	const match = /^\s*---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n([\s\S]*))?$/.exec(text);
	if (!match) return null;
	return {
		frontmatter: match[1] ?? "",
		body: match[2] ?? ""
	};
}
/** Parse the flat frontmatter block into raw string/list/map values. */
function parseBlock(frontmatter) {
	const lines = frontmatter.split(/\r?\n/);
	const out = {};
	let i = 0;
	const indentOf = (s) => s.length - s.trimStart().length;
	while (i < lines.length) {
		const line = lines[i];
		if (line === void 0) break;
		if (line.trim() === "" || line.trimStart().startsWith("#")) {
			i++;
			continue;
		}
		if (indentOf(line) > 0) {
			i++;
			continue;
		}
		const colon = line.indexOf(":");
		if (colon === -1) {
			i++;
			continue;
		}
		const key = line.slice(0, colon).trim();
		const value = line.slice(colon + 1).trim();
		if (value === ">" || value === "|" || /^[>|][+-]?\d*$/.test(value)) {
			const folded = value.startsWith(">");
			const collected = [];
			i++;
			while (i < lines.length) {
				const next = lines[i];
				if (next === void 0) break;
				if (next.trim() !== "" && indentOf(next) === 0) break;
				collected.push(next);
				i++;
			}
			const nonEmpty = collected.filter((l) => l.trim() !== "");
			const minIndent = nonEmpty.length ? Math.min(...nonEmpty.map(indentOf)) : 0;
			const stripped = collected.map((l) => l.slice(minIndent));
			out[key] = folded ? stripped.join(" ").replace(/\s+/g, " ").trim() : stripped.join("\n").trim();
			continue;
		}
		if (value === "") {
			const items = [];
			const map = {};
			let j = i + 1;
			while (j < lines.length) {
				const next = lines[j];
				if (next === void 0) break;
				if (next.trim() === "") {
					j++;
					continue;
				}
				if (indentOf(next) === 0) break;
				const t = next.trim();
				if (t.startsWith("- ")) items.push(unquote(t.slice(2).trim()));
				else {
					const c = t.indexOf(":");
					if (c === -1) break;
					map[t.slice(0, c).trim()] = unquote(t.slice(c + 1).trim());
				}
				j++;
			}
			if (items.length) out[key] = items;
			else if (Object.keys(map).length) out[key] = map;
			else out[key] = "";
			i = Math.max(j, i + 1);
			continue;
		}
		if (value.startsWith("[") && value.endsWith("]")) {
			out[key] = value.slice(1, -1).split(",").map((s) => unquote(s.trim())).filter((s) => s !== "");
			i++;
			continue;
		}
		out[key] = unquote(value);
		i++;
	}
	return out;
}
function unquote(s) {
	if (s.startsWith("\"") && s.endsWith("\"") || s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
	return s;
}
function asStringMap(value) {
	if (typeof value !== "object" || value === null) return void 0;
	const out = {};
	for (const [k, v] of Object.entries(value)) if (typeof v === "string") out[k] = v;
	return Object.keys(out).length ? out : void 0;
}
/**
* Parse a `SKILL.md`. Throws {@link SkillParseError} for cases the spec says to
* skip (no frontmatter, missing description). Non-fatal issues are returned as
* `warnings`; `strict` turns them into throws.
*/
function parseSkill(raw, opts = {}) {
	const split = splitFrontmatter(raw);
	if (!split) throw new SkillParseError("SKILL.md has no frontmatter block");
	const block = parseBlock(split.frontmatter);
	const name = typeof block.name === "string" ? block.name : void 0;
	const description = typeof block.description === "string" ? block.description : void 0;
	if (!description) throw new SkillParseError("SKILL.md is missing a `description`");
	const warnings = [];
	const effectiveName = name ?? opts.dirName ?? "";
	if (name && opts.dirName && name !== opts.dirName) warnings.push({
		code: "name-dir-mismatch",
		message: `skill name "${name}" does not match directory "${opts.dirName}"`
	});
	if (effectiveName.length > 64) warnings.push({
		code: "name-too-long",
		message: `skill name "${effectiveName}" exceeds 64 characters`
	});
	if (effectiveName && !NAME_RE.test(effectiveName)) warnings.push({
		code: "name-invalid-chars",
		message: `skill name "${effectiveName}" contains characters outside [a-z0-9-]`
	});
	if (opts.strict && warnings.length) throw new SkillParseError(warnings.map((w) => w.message).join("; "));
	return {
		metadata: {
			name: effectiveName,
			description,
			...typeof block.license === "string" && { license: block.license },
			...typeof block.compatibility === "string" && { compatibility: block.compatibility },
			...Array.isArray(block.allowedTools) && { allowedTools: block.allowedTools.filter((t) => typeof t === "string") },
			...(() => {
				const m = asStringMap(block.metadata);
				return m ? { metadata: m } : {};
			})()
		},
		body: split.body.trim(),
		warnings
	};
}
/** Strip the frontmatter block, returning just the body. */
function stripFrontmatter(raw) {
	const split = splitFrontmatter(raw);
	return split ? split.body.trim() : raw.trim();
}
//#endregion
export { SkillParseError, parseSkill, stripFrontmatter };

//# sourceMappingURL=parse.js.map