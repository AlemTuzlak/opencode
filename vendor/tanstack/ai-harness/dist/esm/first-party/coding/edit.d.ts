import { ToolEnv } from './backend.js';
/** `text` with the line endings of `content`: CRLF when it has one, else LF. */
export declare function toEndingsOf(text: string, content: string): string;
/**
 * Find `find` in `content`. Three levels are tried in order, and the first
 * level with a match wins:
 *
 * 1. The exact text.
 * 2. Both sides in Unicode NFC form.
 * 3. Spaces and tabs at the end of each line ignored. A match then also covers
 *    the trailing spaces of its last line.
 *
 * `find` first gets the line endings of `content`, so LF text matches a CRLF
 * file.
 *
 * Returns each match as `{ start, end }` offsets into the original `content`,
 * in order and without overlaps. An empty array means no match. More than one
 * match means the text is not unique.
 *
 * @example
 * ```ts
 * findMatches('a  \nb\n', 'a\nb') // [{ start: 0, end: 5 }]
 * ```
 */
export declare function findMatches(content: string, find: string): {
    start: number;
    end: number;
}[];
/**
 * `write_file` and `edit_file`. After each write, the `afterWrite` hooks run
 * for the file. `edit_file` finds the old text with {@link findMatches}. It
 * writes the new text with the line endings of the file, and keeps a byte
 * order mark.
 */
export declare function editTools(env: ToolEnv): ((import('@tanstack/ai').ServerTool<{
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
}))[];
