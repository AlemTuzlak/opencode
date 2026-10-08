import { WorkspaceHooks } from './workspace-hooks.js';
import { AnyCommand } from '../commands.js';
/**
 * Add instruction files (AGENTS.md, CLAUDE.md) and an environment block to
 * the system prompt.
 *
 * - `global`: files that come first, for example `~/.config/AGENTS.md`. `~`
 *   is the home folder.
 * - Then `files` from each folder between the repo root (the folder with
 *   `.git`) and `root`, outermost first. With no repo root, only `root`.
 * - `env` (default `true`): the date, platform, working folder, and git
 *   repository and branch, read when the session opens.
 *
 * At the start of each turn, the plugin checks the mtime of each file. A note
 * with the new text of a changed file goes after this plugin's other prompts.
 * Put this plugin last: when no prompt comes after its prompts, an adapter
 * with mid-conversation changes adds the note to the conversation, and the
 * prompt cache holds. Else the change is not additive, and the prompt cache
 * starts again.
 *
 * When `read_file` reads a file below `root`, the instruction files in the
 * folders between `root` and that file are added to the result, once per
 * file in the session.
 *
 * @example
 * ```ts
 * projectInstructions({ root: process.cwd(), global: ['~/.config/AGENTS.md'] })
 * ```
 */
export declare function projectInstructions(options: {
    root: string;
    files?: ReadonlyArray<string>;
    global?: ReadonlyArray<string>;
    env?: boolean;
}): import('..').HarnessPlugin<{
    readonly name: "tanstack/project-instructions";
    readonly setup: () => Promise<{
        prompts: (() => string)[];
        contribute: import('..').ExtensionItem<WorkspaceHooks>[];
    }>;
}>;
/** A frontmatter value: text, or a list from `[a, b]` or `- a` lines. */
export type FrontmatterValue = string | Array<string>;
/**
 * Split `---` frontmatter from a Markdown file. It reads `key: value`
 * lines and lists: `key: [a, b]`, or `key:` with `- a` lines under it.
 * Nested values are not read.
 */
export declare function splitFrontmatter(text: string): {
    fields: Record<string, FrontmatterValue>;
    body: string;
};
/**
 * The Markdown files in `dir`: the name without `.md`, the frontmatter
 * fields, and the body. A folder that cannot be read has no files.
 */
export declare function readMarkdownFiles(dir: string): Promise<{
    fields: Record<string, FrontmatterValue>;
    body: string;
    name: string;
}[]>;
/**
 * One command per Markdown file in `dir` (like `.claude/commands/*.md`).
 * Running `/name args` sends the file as a prompt, with `$ARGUMENTS`
 * replaced by the args.
 */
export declare function fileCommands(options: {
    dir: string;
}): import('..').HarnessPlugin<{
    readonly name: "tanstack/file-commands";
    readonly setup: (ctx: import('..').PluginSetupContext) => Promise<{
        commands: Record<string, AnyCommand>;
    }>;
}>;
