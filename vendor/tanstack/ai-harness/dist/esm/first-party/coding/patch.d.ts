import { ToolEnv } from './backend.js';
/** One chunk of an `*** Update File:` section. */
export interface PatchChunk {
    /** The text after `@@`: a line above the change, to find the place. */
    context?: string;
    /** The lines that the chunk replaces: the context and `-` lines. */
    oldLines: Array<string>;
    /** The lines that replace them: the context and `+` lines. */
    newLines: Array<string>;
    /** True after `*** End of File`: the old lines end the file. */
    endOfFile: boolean;
}
/** One file change of a patch. The paths are as the patch gives them. */
export type PatchOperation = {
    type: 'add';
    path: string;
    content: string;
} | {
    type: 'delete';
    path: string;
} | {
    type: 'update';
    path: string;
    movePath?: string;
    chunks: Array<PatchChunk>;
};
/** The file changes of a patch, in order. */
export type ParsedPatch = Array<PatchOperation>;
/**
 * Read a patch in the `*** Begin Patch` format into its file changes. Throws
 * an error with the line number when the text does not follow the format.
 *
 * @example
 * ```ts
 * parsePatch('*** Begin Patch\n*** Delete File: old.txt\n*** End Patch')
 * // [{ type: 'delete', path: 'old.txt' }]
 * ```
 */
export declare function parsePatch(text: string): ParsedPatch;
/**
 * Every path that a patch changes, also the targets of `*** Move to:`, as
 * the patch gives them. The permission rules check them. Throws when the
 * patch does not parse.
 *
 * @example
 * ```ts
 * patchPaths(text) // ['src/a.ts', 'src/old.ts', 'src/new.ts']
 * ```
 */
export declare function patchPaths(text: string): string[];
/**
 * The `patch` tool: it changes files with a patch in the `*** Begin Patch`
 * format (see {@link parsePatch}). The old lines of a chunk are found with
 * {@link findMatches}. All files are checked before the first write, so a
 * patch that does not fit changes nothing. The `afterWrite` hooks run for
 * each written file. The result lists the changed files.
 *
 * - `*** Add File:` replaces a file that is there, like `write_file`.
 * - `*** Delete File:` needs a file there.
 * - `*** Move to:` writes the new path, then removes the old one. It refuses
 *   a target that is already there, unless the patch removes it first.
 * - A delete or a move needs `remove` on the backend. Without it, the tool
 *   refuses them, before it writes anything.
 * - A file that the patch removed or moved away cannot change again in the
 *   same patch. A file cannot be removed or moved after the patch changed it.
 */
export declare function patchTools(env: ToolEnv): (import('@tanstack/ai').ServerTool<{
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
})[];
