import { ToolEnv } from './backend.js';
/**
 * `read_file`: numbered lines of a text file, a page at a time. An image
 * (PNG, JPEG, GIF, WebP) or a PDF comes back as a content part. A binary
 * file gets a short note, not its bytes. The text that `afterRead` hooks
 * return is added after the lines of a text file.
 */
export declare function readTools(env: ToolEnv): (import('@tanstack/ai').ServerTool<{
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
})[];
