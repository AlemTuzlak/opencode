import { ToolEnv, WorkspaceBackend } from './backend.js';
/**
 * `value` as one argument of a shell command. The shell gives the value to
 * the program as it is. `platform` is the platform of the shell.
 *
 * - POSIX `sh`: the value goes in single quotes. No character is special
 *   in them. A single quote in the value becomes `'\''`.
 * - Windows `cmd.exe`: first the value is quoted for the program: a `"`
 *   gets a backslash, and the backslashes before a `"` are doubled. Then a
 *   `^` goes before each character that `cmd.exe` reads as special, the
 *   quotes too. So `cmd.exe` expands no `%VAR%` and runs no `&` or `|`.
 *   This needs delayed expansion off, which is the default. A line break
 *   cannot be passed safely, so it throws.
 *
 * @example
 * ```ts
 * quoteArg(`it's`, 'linux') // 'it'\''s'
 * quoteArg('a & b', 'win32') // ^"a^ ^&^ b^"
 * ```
 */
export declare function quoteArg(value: string, platform: NodeJS.Platform): string;
/**
 * The platform of the shell that `backend.exec` uses, for {@link quoteArg}.
 * A backend without `shell` has a POSIX `sh`, like a Linux sandbox.
 */
export declare function shellPlatform(backend: WorkspaceBackend): "linux" | "win32";
/**
 * `list_files` and `grep`. Both use the first engine that works:
 *
 * 1. The rg binary of `@vscode/ripgrep`, only with `hostBackend`.
 * 2. `rg` on the PATH of the backend.
 * 3. `git ls-files`, when the folder is in a git work tree.
 * 4. A walk through `backend.readdir`.
 *
 * rg and git skip the files that `.gitignore` names. No engine looks in
 * `.git` or `node_modules`, or gives links: rg does not follow them, and
 * the git list and the walk leave them out. The results have the same
 * shape whichever engine ran.
 *
 * With `permissions()`, grep skips the files that the rules protect (see
 * `ToolEnv.protectedIn`), and a note says how many. `list_files` shows
 * them: a name is not the contents.
 */
export declare function searchTools(env: ToolEnv): ((import('@tanstack/ai').ServerTool<{
    type: string;
    properties: {
        pattern: {
            type: string;
        };
        path: {
            type: string;
            description: string;
        };
    };
}, undefined, "list_files", unknown, false, undefined> & {
    inputSchema: {
        type: string;
        properties: {
            pattern: {
                type: string;
            };
            path: {
                type: string;
                description: string;
            };
        };
    };
    outputSchema: undefined;
    approvalSchema: undefined;
}) | (import('@tanstack/ai').ServerTool<{
    type: string;
    properties: {
        pattern: {
            type: string;
        };
        glob: {
            type: string;
        };
        path: {
            type: string;
            description: string;
        };
    };
    required: string[];
}, undefined, "grep", unknown, false, undefined> & {
    inputSchema: {
        type: string;
        properties: {
            pattern: {
                type: string;
            };
            glob: {
                type: string;
            };
            path: {
                type: string;
                description: string;
            };
        };
        required: string[];
    };
    outputSchema: undefined;
    approvalSchema: undefined;
}))[];
