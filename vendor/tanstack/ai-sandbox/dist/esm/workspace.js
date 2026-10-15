//#region src/workspace.ts
/** Clone a git repo into the workspace. `githubRepo` is a convenience wrapper. */
function gitSource(input) {
	return {
		type: "git",
		...input
	};
}
function githubRepo(input) {
	return {
		type: "git",
		url: input.repo.startsWith("http") ? input.repo : `https://github.com/${input.repo}.git`,
		ref: input.ref,
		auth: input.auth,
		depth: input.depth
	};
}
function localSource(path) {
	return {
		type: "local",
		path
	};
}
/** Write a file (e.g. CLAUDE.md) into the workspace / harness config. */
function fileSkill(input) {
	return {
		kind: "file",
		...input
	};
}
/** Reference a named agent skill the harness should load. */
function agentSkill(name) {
	return {
		kind: "agent-skill",
		name
	};
}
/** Project an MCP server into the harness. Header values may be SecretRefs. */
function mcpSkill(name, config) {
	return {
		kind: "mcp",
		name,
		config
	};
}
/**
* Clone a git repository as a workspace skill (e.g. a private skill repo).
* The clone is performed during bootstrap; `secret` is resolved from the
* workspace `secrets` registry at that time.
*/
function gitSkill(input) {
	return {
		kind: "git",
		...input
	};
}
function defineWorkspace(definition) {
	return definition;
}
//#endregion
export { agentSkill, defineWorkspace, fileSkill, gitSkill, gitSource, githubRepo, localSource, mcpSkill };

//# sourceMappingURL=workspace.js.map