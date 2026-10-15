import { WorkspaceHooks } from '../workspace-hooks.js';
import { AnyTool } from '@tanstack/ai';
import { PermissionDecision, ToolResources } from '../permissions.js';
import { WorkspaceBackend } from './backend.js';
import { WebToolsOptions } from './web.js';
export interface WorkspaceToolsOptions {
    root: string;
    bashTimeoutMs?: number;
    /**
     * A path outside `root`. `'deny'` (default) refuses it. `'ask'` asks the
     * user first, and a yes allows that folder, and the folders in it, for the
     * rest of the session. The `bypass` mode of `permissions()` allows it
     * without a question.
     */
    outside?: 'deny' | 'ask';
    /** Where the files are and commands run. Default: {@link hostBackend}. */
    backend?: WorkspaceBackend;
    /**
     * The tools that change files. `'auto'` (default): GPT models (an id that
     * starts with `gpt-`, or `o` and a digit, like `o3`) get `patch` and no
     * `edit_file`. Other models get `edit_file` and `write_file`, and no
     * `patch`. `'edit'` or `'patch'` gives that style to every model.
     */
    editStyle?: 'auto' | 'edit' | 'patch';
    /**
     * The web tools. Default: on, with `webfetch`. Pass `search` to add
     * `websearch`. `false` adds no web tools.
     */
    web?: false | WebToolsOptions;
    /**
     * When `bash` gives the model only the end of the output, it saves the
     * full output in this folder. Relative to `root`, or absolute.
     */
    spillDir?: string;
}
/** What the tools need from the session for a path outside the workspace. */
export interface OutsideAccess {
    /** Ask the user a question, and resolve with the answer. */
    ask: (message: string) => Promise<unknown>;
    /** The permission mode of the session, for example `'bypass'`. */
    mode: () => unknown;
    /**
     * The working folder of the thread, from `root` (the `cwd` setting of
     * `session.configure`). Relative paths start there. Read at each call.
     */
    cwd?: () => string | undefined;
    /**
     * What `permissions()` decides in the current mode for a call of a tool
     * that touches `paths`, or `undefined` without `permissions()`. Read at
     * each call.
     */
    rules?: () => ((tool: string, paths: ReadonlyArray<string>) => PermissionDecision) | undefined;
}
/**
 * The tools of {@link workspaceTools} for one session, and what each call
 * touches for `PermissionResources`. `access` asks the user about a path
 * outside the workspace when `options.outside` is `'ask'`. `hooks` are the
 * hooks that plugins added. `note` tells the model that a background `bash`
 * job ended, and `signal` kills the jobs that still run.
 */
export declare function createWorkspaceTools(options: WorkspaceToolsOptions, session?: {
    access?: OutsideAccess;
    hooks?: () => ReadonlyArray<WorkspaceHooks>;
    note?: (text: string) => Promise<void>;
    signal?: AbortSignal;
    jobs?: {
        started: (jobId: string) => void;
        ended: (jobId: string) => void;
    };
}): {
    tools: ((import('@tanstack/ai').ServerTool<{
        type: string;
        properties: {
            command: {
                type: string;
            };
            timeoutMs: {
                type: string;
                description: string;
            };
            background: {
                type: string;
                description: string;
            };
        };
        required: string[];
    }, undefined, "bash", unknown, false, undefined> & {
        inputSchema: {
            type: string;
            properties: {
                command: {
                    type: string;
                };
                timeoutMs: {
                    type: string;
                    description: string;
                };
                background: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
        outputSchema: undefined;
        approvalSchema: undefined;
    }) | (import('@tanstack/ai').ServerTool<{
        type: string;
        properties: {
            path: {
                type: string;
            };
            content: {
                type: string;
            };
        };
        required: string[];
    }, undefined, "write_file", unknown, false, undefined> & {
        inputSchema: {
            type: string;
            properties: {
                path: {
                    type: string;
                };
                content: {
                    type: string;
                };
            };
            required: string[];
        };
        outputSchema: undefined;
        approvalSchema: undefined;
    }) | (import('@tanstack/ai').ServerTool<{
        type: string;
        properties: {
            path: {
                type: string;
            };
            old: {
                type: string;
            };
            new: {
                type: string;
            };
            replaceAll: {
                type: string;
            };
        };
        required: string[];
    }, undefined, "edit_file", unknown, false, undefined> & {
        inputSchema: {
            type: string;
            properties: {
                path: {
                    type: string;
                };
                old: {
                    type: string;
                };
                new: {
                    type: string;
                };
                replaceAll: {
                    type: string;
                };
            };
            required: string[];
        };
        outputSchema: undefined;
        approvalSchema: undefined;
    }) | (import('@tanstack/ai').ServerTool<{
        type: string;
        properties: {
            patch: {
                type: string;
            };
        };
        required: string[];
    }, undefined, "patch", unknown, false, undefined> & {
        inputSchema: {
            type: string;
            properties: {
                patch: {
                    type: string;
                };
            };
            required: string[];
        };
        outputSchema: undefined;
        approvalSchema: undefined;
    }) | (import('@tanstack/ai').ServerTool<{
        type: string;
        properties: {
            path: {
                type: string;
            };
            offset: {
                type: string;
                description: string;
            };
            limit: {
                type: string;
                description: string;
            };
        };
        required: string[];
    }, undefined, "read_file", unknown, false, undefined> & {
        inputSchema: {
            type: string;
            properties: {
                path: {
                    type: string;
                };
                offset: {
                    type: string;
                    description: string;
                };
                limit: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
        outputSchema: undefined;
        approvalSchema: undefined;
    }) | (import('@tanstack/ai').ServerTool<{
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
    }) | (import('@tanstack/ai').ServerTool<{
        type: string;
        properties: {
            url: {
                type: string;
            };
            format: {
                type: string;
                enum: string[];
            };
            timeoutMs: {
                type: string;
                description: string;
            };
        };
        required: string[];
    }, undefined, "webfetch", unknown, false, undefined> & {
        inputSchema: {
            type: string;
            properties: {
                url: {
                    type: string;
                };
                format: {
                    type: string;
                    enum: string[];
                };
                timeoutMs: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
        outputSchema: undefined;
        approvalSchema: undefined;
    }) | (import('@tanstack/ai').ServerTool<{
        type: string;
        properties: {
            query: {
                type: string;
            };
            limit: {
                type: string;
                description: string;
            };
        };
        required: string[];
    }, undefined, "websearch", unknown, false, undefined> & {
        inputSchema: {
            type: string;
            properties: {
                query: {
                    type: string;
                };
                limit: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        };
        outputSchema: undefined;
        approvalSchema: undefined;
    }))[];
    prompt: string;
    resources: Record<string, ToolResources>;
};
/**
 * File, shell, and web tools for a coding agent, in `root`: `read_file`,
 * `write_file`, `edit_file` or `patch` (see `editStyle`), `list_files`,
 * `grep`, `bash`, `webfetch`, and `websearch` with a search provider. Edits,
 * `bash`, and `webfetch` ask for approval through `permissions()`, and each
 * call tells the permission rules which paths or commands it touches. A
 * path outside `root` is refused, or with `outside: 'ask'` the user is
 * asked first. A link that leads out of `root` counts as outside. Other
 * plugins add {@link WorkspaceHooks} to run code after a read or a write.
 *
 * The tools use `backend` for files and commands. The default,
 * `hostBackend`, runs on this machine with the host's authority. Use a
 * sandbox backend for code you do not trust.
 *
 * @example
 * ```ts
 * workspaceTools({ root: process.cwd(), outside: 'ask' })
 * ```
 */
export declare function workspaceTools(options: WorkspaceToolsOptions): import('../..').HarnessPlugin<{
    readonly name: "tanstack/workspace-tools";
    readonly optionalRequires: readonly [import('@tanstack/ai').Capability<(tool: string, mode: import('..').PermissionMode, resources?: import('..').CallResources) => PermissionDecision, "tanstack/permission-decision">];
    readonly setup: (ctx: import('../..').PluginSetupContext) => {
        tools: ((import('@tanstack/ai').ServerTool<{
            type: string;
            properties: {
                command: {
                    type: string;
                };
                timeoutMs: {
                    type: string;
                    description: string;
                };
                background: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        }, undefined, "bash", unknown, false, undefined> & {
            inputSchema: {
                type: string;
                properties: {
                    command: {
                        type: string;
                    };
                    timeoutMs: {
                        type: string;
                        description: string;
                    };
                    background: {
                        type: string;
                        description: string;
                    };
                };
                required: string[];
            };
            outputSchema: undefined;
            approvalSchema: undefined;
        }) | (import('@tanstack/ai').ServerTool<{
            type: string;
            properties: {
                path: {
                    type: string;
                };
                content: {
                    type: string;
                };
            };
            required: string[];
        }, undefined, "write_file", unknown, false, undefined> & {
            inputSchema: {
                type: string;
                properties: {
                    path: {
                        type: string;
                    };
                    content: {
                        type: string;
                    };
                };
                required: string[];
            };
            outputSchema: undefined;
            approvalSchema: undefined;
        }) | (import('@tanstack/ai').ServerTool<{
            type: string;
            properties: {
                path: {
                    type: string;
                };
                old: {
                    type: string;
                };
                new: {
                    type: string;
                };
                replaceAll: {
                    type: string;
                };
            };
            required: string[];
        }, undefined, "edit_file", unknown, false, undefined> & {
            inputSchema: {
                type: string;
                properties: {
                    path: {
                        type: string;
                    };
                    old: {
                        type: string;
                    };
                    new: {
                        type: string;
                    };
                    replaceAll: {
                        type: string;
                    };
                };
                required: string[];
            };
            outputSchema: undefined;
            approvalSchema: undefined;
        }) | (import('@tanstack/ai').ServerTool<{
            type: string;
            properties: {
                patch: {
                    type: string;
                };
            };
            required: string[];
        }, undefined, "patch", unknown, false, undefined> & {
            inputSchema: {
                type: string;
                properties: {
                    patch: {
                        type: string;
                    };
                };
                required: string[];
            };
            outputSchema: undefined;
            approvalSchema: undefined;
        }) | (import('@tanstack/ai').ServerTool<{
            type: string;
            properties: {
                path: {
                    type: string;
                };
                offset: {
                    type: string;
                    description: string;
                };
                limit: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        }, undefined, "read_file", unknown, false, undefined> & {
            inputSchema: {
                type: string;
                properties: {
                    path: {
                        type: string;
                    };
                    offset: {
                        type: string;
                        description: string;
                    };
                    limit: {
                        type: string;
                        description: string;
                    };
                };
                required: string[];
            };
            outputSchema: undefined;
            approvalSchema: undefined;
        }) | (import('@tanstack/ai').ServerTool<{
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
        }) | (import('@tanstack/ai').ServerTool<{
            type: string;
            properties: {
                url: {
                    type: string;
                };
                format: {
                    type: string;
                    enum: string[];
                };
                timeoutMs: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        }, undefined, "webfetch", unknown, false, undefined> & {
            inputSchema: {
                type: string;
                properties: {
                    url: {
                        type: string;
                    };
                    format: {
                        type: string;
                        enum: string[];
                    };
                    timeoutMs: {
                        type: string;
                        description: string;
                    };
                };
                required: string[];
            };
            outputSchema: undefined;
            approvalSchema: undefined;
        }) | (import('@tanstack/ai').ServerTool<{
            type: string;
            properties: {
                query: {
                    type: string;
                };
                limit: {
                    type: string;
                    description: string;
                };
            };
            required: string[];
        }, undefined, "websearch", unknown, false, undefined> & {
            inputSchema: {
                type: string;
                properties: {
                    query: {
                        type: string;
                    };
                    limit: {
                        type: string;
                        description: string;
                    };
                };
                required: string[];
            };
            outputSchema: undefined;
            approvalSchema: undefined;
        }))[];
        prompts: (() => string)[];
        prepareTools: (turn: {
            tools: ReadonlyArray<AnyTool>;
            model: string;
        }) => AnyTool[];
        contribute: (import('../..').ExtensionItem<import('..').PermissionRule> | import('../..').ExtensionItem<Readonly<Record<string, ToolResources>>>)[];
    };
}>;
