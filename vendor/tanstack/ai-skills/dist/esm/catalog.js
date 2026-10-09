//#region src/catalog.ts
/** Sort skills into a stable, cache-friendly order. */
function sortSkills(skills) {
	return [...skills].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}
function escapeXml(s) {
	return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
/** Render the skill catalog for a model family. Skills are sorted by name. */
function renderCatalog(skills, family) {
	const sorted = sortSkills(skills);
	if (family === "anthropic") return `<available_skills>\n${sorted.map((s) => `  <skill name="${escapeXml(s.name)}">${escapeXml(s.description)}</skill>`).join("\n")}\n</available_skills>`;
	return `## Available skills\n\n${sorted.map((s) => `- **${s.name}**: ${s.description}`).join("\n")}`;
}
//#endregion
export { renderCatalog, sortSkills };

//# sourceMappingURL=catalog.js.map