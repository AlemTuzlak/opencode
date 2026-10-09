import { AnyChatMiddleware } from '@tanstack/ai';
import { SkillsOptions } from './middleware.js';
export interface SkillsPluginOptions extends SkillsOptions {
    /**
     * The skill folders. Each folder holds skill folders with a `SKILL.md`.
     * When two folders have a skill with the same name, the first folder wins.
     * A folder that does not exist yet is used once it exists.
     */
    dirs: ReadonlyArray<string>;
    /**
     * Names that a UI handles itself, for example its own `/help`. A skill
     * with one of these names gets the command `/skill:<name>`.
     */
    reserved?: ReadonlyArray<string>;
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
export declare function skills(options: SkillsPluginOptions): import('@tanstack/ai-harness').HarnessPlugin<{
    readonly name: "tanstack/skills";
    readonly setup: (ctx: import('@tanstack/ai-harness').PluginSetupContext) => Promise<{
        middleware: AnyChatMiddleware[];
        commands: {
            skills: import('@tanstack/ai-harness').CommandDefinition<any>;
        };
    }>;
}>;
