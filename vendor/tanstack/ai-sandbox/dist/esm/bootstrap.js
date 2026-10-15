import { resolveAllSecrets, resolveSecret } from "./secrets.js";
import { resolveHarnessCwd } from "./harness-cwd.js";
import { buildSetupPlan } from "./setup-plan.js";
import { createBootstrapShell } from "./shell.js";
import { mergeAgentsContent, resolveGitSkillDir, writeAgentsFile } from "./agents-file.js";
//#region src/bootstrap.ts
/**
* Workspace bootstrap engine — provider-agnostic because it only uses the
* {@link SandboxHandle} contract. Runs once when a sandbox is freshly created
* (or restored without its working tree): land the source, inject secrets,
* detect the package manager, and run setup commands.
*
* Harness-specific projection (CLAUDE.md, agent skills, MCP config) is NOT done
* here — that's each adapter's `projectWorkspace()` hook, since the format
* differs per harness.
*/
var LOCKFILES = {
	pnpm: "pnpm-lock.yaml",
	yarn: "yarn.lock",
	bun: "bun.lockb",
	npm: "package-lock.json"
};
var DEFAULT_WORKSPACE_ROOT = "/workspace";
/** Resolve the package manager, detecting from a lockfile when `'auto'`. */
async function detectPackageManager(handle, workspace, root) {
	const pm = workspace.packageManager ?? "auto";
	if (pm !== "auto") return pm;
	for (const [manager, lockfile] of Object.entries(LOCKFILES)) if (await handle.fs.exists(`${root}/${lockfile}`)) return manager;
}
/**
* Bootstrap a freshly created sandbox's workspace. Idempotent enough to be safe
* on restore: a git clone into a populated dir is skipped by checking for the
* target dir first.
*/
async function bootstrapWorkspace(handle, workspace, options = {}) {
	const root = workspace.root ?? "/workspace";
	if (workspace.secrets !== void 0) {
		const resolved = resolveAllSecrets(workspace.secrets);
		if (Object.keys(resolved).length > 0) await handle.env.set(resolved);
	}
	if (workspace.source.type === "git") {
		if (!await handle.fs.exists(`${root}/.git`)) await handle.git.clone({
			url: workspace.source.url,
			ref: workspace.source.ref,
			auth: workspace.source.auth,
			...workspace.source.depth !== void 0 ? { depth: workspace.source.depth } : {}
		});
	}
	const skills = workspace.skills ?? [];
	for (const skill of skills) if (skill.kind === "git") {
		const url = skill.repo.startsWith("http") ? skill.repo : `https://github.com/${skill.repo}.git`;
		const dir = resolveHarnessCwd(handle, skill.into ?? resolveGitSkillDir(root, skill));
		const auth = skill.secret !== void 0 && workspace.secrets !== void 0 ? { token: resolveSecret(workspace.secrets, skill.secret) } : void 0;
		await handle.git.clone({
			url,
			dir,
			...auth !== void 0 ? { auth } : {},
			depth: 1
		});
	}
	let agentsContent;
	if (workspace.instructions !== void 0 && workspace.instructions.length > 0) agentsContent = workspace.instructions;
	else {
		const agentsFileSkill = skills.find((s) => s.kind === "file" && s.path === "AGENTS.md");
		if (agentsFileSkill !== void 0) agentsContent = agentsFileSkill.content;
	}
	agentsContent = mergeAgentsContent(agentsContent, workspace.scripts);
	if (agentsContent !== void 0) await writeAgentsFile(handle, root, agentsContent);
	for (const skill of skills) if (skill.kind === "file" && skill.path !== "AGENTS.md") await handle.fs.write(`${root}/${skill.path}`, skill.content);
	const packageManager = await detectPackageManager(handle, workspace, root);
	const ranSetup = [];
	const plan = buildSetupPlan(workspace.setup);
	if (plan.length > 0) {
		const shell = await createBootstrapShell(handle, { cwd: root });
		try {
			for (const group of plan) if (group.kind === "serial") {
				const result = await shell.run(group.command);
				if (result.exitCode !== 0) {
					const tail = result.stdout.trim().slice(-1500);
					throw new Error(`setup step failed: ${group.command} (exit ${result.exitCode})${tail ? `\n${tail}` : ""}`);
				}
				ranSetup.push(group.command);
			} else {
				const { cwd, env } = await shell.forkState();
				const failed = (await Promise.all(group.commands.map((command) => handle.process.exec(command, {
					cwd,
					env,
					...options.signal ? { signal: options.signal } : {}
				}).then((res) => ({
					command,
					res
				}))))).find((entry) => entry.res.exitCode !== 0);
				if (failed !== void 0) {
					const tail = `${failed.res.stdout}\n${failed.res.stderr}`.trim().slice(-1500);
					throw new Error(`setup step failed: ${failed.command} (exit ${failed.res.exitCode})${tail ? `\n${tail}` : ""}`);
				}
				ranSetup.push(...group.commands);
			}
		} finally {
			await shell.dispose();
		}
	}
	return {
		packageManager,
		ranSetup
	};
}
//#endregion
export { DEFAULT_WORKSPACE_ROOT, bootstrapWorkspace, detectPackageManager };

//# sourceMappingURL=bootstrap.js.map