import { renderCatalog } from "./catalog.js";
import { estimateTokens, withSkills } from "./middleware.js";
import { skillDirectory } from "./node/index.js";
import { firstSentence } from "@tanstack/ai";
import { watch } from "node:fs";
import { dirname } from "node:path";
import { defineCommand, definePlugin } from "@tanstack/ai-harness";
//#region src/harness.ts
/**
* The skills of `dirs`, by name, in folder order. The first folder wins a
* name. A folder that is missing or cannot be read gives no skills, and a
* broken `SKILL.md` is left out.
*/
async function scan(dirs) {
	const found = /* @__PURE__ */ new Map();
	for (const dir of dirs) {
		const listed = await skillDirectory(dir, { strict: false }).list().catch(() => []);
		for (const skill of listed) if (!found.has(skill.name)) found.set(skill.name, {
			skill,
			dir
		});
	}
	return found;
}
/** The catalog with only the first sentence of each description. */
function shortCatalog(listed, family) {
	return renderCatalog(listed.map((skill) => ({
		...skill,
		description: firstSentence(skill.description)
	})), family);
}
/** The text of the turn that `/<name> [task]` starts. */
function skillPrompt(name, input) {
	const task = typeof input === "string" ? input.trim() : "";
	return task === "" ? `Use the ${name} skill.` : `Use the ${name} skill: ${task}`;
}
/**
* A harness plugin that gives the model the skills of `dirs`, and makes each
* skill a command: `/<name> [task]` starts a turn that tells the model to use
* the skill. A skill whose name another command has is `/skill:<name>`.
* `/skills` lists every skill, its folder, and its command.
*
* The plugin watches the folders, and it lists them again at the start of
* each turn. A skill that you add, change, or remove while the session runs
* changes the commands at once, with no restart.
*
* The model's skill list has one line for each skill: its name and the first
* sentence of its description. When the list is longer than
* `maxCatalogTokens`, the skills of the earlier folders stay in it, and a
* skill that you called with its command always stays.
*
* @param options.dirs - The skill folders, the first one wins on a name.
* @param options.reserved - Command names a UI handles itself.
*
* @example
* ```ts
* import { homedir } from 'node:os'
* import { join } from 'node:path'
* import { skills } from '@tanstack/ai-skills/harness'
*
* defineHarness({
*   name: 'acme/agent',
*   adapter,
*   plugins: () => [
*     skills({ dirs: ['./.agents/skills', join(homedir(), '.acme', 'skills')] }),
*   ],
* })
* ```
*/
function skills(options) {
	const { dirs, reserved = [], ...skillsOptions } = options;
	const taken = /* @__PURE__ */ new Set(["skills", ...reserved]);
	return definePlugin({
		name: "tanstack/skills",
		setup: async (ctx) => {
			const mine = /* @__PURE__ */ new Map();
			const called = /* @__PURE__ */ new Set();
			let found = /* @__PURE__ */ new Map();
			const watchers = await ctx.resources.acquire(() => /* @__PURE__ */ new Map(), (open) => {
				for (const watcher of open.values()) watcher.close();
				open.clear();
			});
			const closed = () => ctx.resources.signal.aborted;
			const skillCommand = (name, description) => defineCommand({
				description: `Skill: ${firstSentence(description)}`,
				input: {
					type: "string",
					description: "What the skill should do. Optional."
				},
				run: (input) => {
					called.add(name);
					ctx.session.prompt(skillPrompt(name, input));
				}
			});
			/** Watch `path` under `key`. `false` when `path` does not exist. */
			const tryWatch = (key, path, recursive) => {
				try {
					const watcher = watch(path, {
						recursive,
						persistent: false
					}, soon);
					watcher.on("error", () => {
						watcher.close();
						watchers.delete(key);
					});
					watchers.set(key, watcher);
					return true;
				} catch {
					return false;
				}
			};
			/**
			* Watch each skill folder. While a folder does not exist, watch its
			* parent folder, so the skills show as soon as you make the folder.
			*/
			const watchFolders = () => {
				for (const dir of dirs) {
					if (watchers.has(dir)) continue;
					const parentKey = `${dir} (parent)`;
					if (tryWatch(dir, dir, true)) {
						watchers.get(parentKey)?.close();
						watchers.delete(parentKey);
					} else if (!watchers.has(parentKey)) tryWatch(parentKey, dirname(dir), false);
				}
			};
			/** Make the commands match the skills in the folders now. */
			const update = async () => {
				if (closed()) return;
				found = await scan(dirs);
				if (closed()) return;
				watchFolders();
				const next = /* @__PURE__ */ new Map();
				for (const { skill } of found.values()) {
					const isFree = !taken.has(skill.name) && (mine.has(skill.name) || !ctx.commands.has(skill.name));
					next.set(isFree ? skill.name : `skill:${skill.name}`, {
						name: skill.name,
						description: skill.description
					});
				}
				for (const [command, entry] of mine) {
					if (next.get(command)?.name === entry.name) continue;
					ctx.commands.delete(command);
					mine.delete(command);
				}
				for (const [command, entry] of next) {
					if (mine.get(command)?.description === entry.description) continue;
					try {
						ctx.commands.set(command, skillCommand(entry.name, entry.description));
						mine.set(command, entry);
					} catch {}
				}
			};
			let updating = Promise.resolve();
			const sync = () => {
				updating = updating.then(update).catch(() => {});
				return updating;
			};
			let timer;
			function soon() {
				clearTimeout(timer);
				timer = setTimeout(() => void sync(), 200);
				timer.unref?.();
			}
			ctx.resources.signal.addEventListener("abort", () => clearTimeout(timer));
			ctx.commands.ready.then(sync);
			const source = {
				list: async () => [...(await scan(dirs)).values()].map((entry) => entry.skill),
				load: async (name) => (await folderOf(name)).load(name),
				listResources: async (name) => await (await folderOf(name)).listResources?.(name) ?? [],
				listScripts: async (name) => await (await folderOf(name)).listScripts?.(name) ?? [],
				readResource: async (name, path) => {
					const folder = await folderOf(name);
					if (!folder.readResource) throw new Error(`Skill "${name}" has no resource files.`);
					return folder.readResource(name, path);
				}
			};
			/** The source of the folder that has the skill `name` now. */
			async function folderOf(name) {
				const entry = (await scan(dirs)).get(name);
				if (!entry) throw new Error(`No skill named "${name}" in ${dirs.join(", ")}.`);
				return skillDirectory(entry.dir, { strict: false });
			}
			/**
			* Over the token cap: the called skills first, then the folder order,
			* until the list is full. The XML list of Anthropic models is the
			* longest form, so the count uses it.
			*/
			const keepEarlier = (listed, limit) => {
				const ordered = [...listed.filter((skill) => called.has(skill.name)), ...listed.filter((skill) => !called.has(skill.name))];
				const kept = [];
				for (const skill of ordered) {
					if (estimateTokens(shortCatalog([...kept, skill], "anthropic")) > limit) break;
					kept.push(skill);
				}
				return kept;
			};
			const hasOwnCatalog = skillsOptions.renderCatalog !== void 0 || skillsOptions.instructionTemplate !== void 0;
			return {
				middleware: [{
					name: "tanstack/skills:sync",
					setup: () => sync()
				}, withSkills(source, {
					...hasOwnCatalog ? {} : { renderCatalog: shortCatalog },
					onLimitExceeded: keepEarlier,
					...skillsOptions
				})],
				commands: { skills: defineCommand({
					description: "List the skills, their folders, and their commands",
					run: async () => {
						await sync();
						if (found.size === 0) return `No skills yet. Add a folder with a SKILL.md to one of: ${dirs.join(", ")}`;
						const commandOf = new Map([...mine].map(([command, entry]) => [entry.name, command]));
						return [...found.values()].map(({ skill, dir }) => {
							const command = commandOf.get(skill.name);
							return `${command ? `/${command}` : skill.name}  ${dir}${command && command !== skill.name ? ` (/${skill.name} is taken)` : ""}`;
						}).join("\n");
					}
				}) }
			};
		}
	});
}
//#endregion
export { skills };

//# sourceMappingURL=harness.js.map