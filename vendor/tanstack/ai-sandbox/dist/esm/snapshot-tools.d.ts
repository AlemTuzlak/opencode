import { SandboxSnapshots } from './snapshot-operations.js';
export interface CreateSnapshotToolsOptions {
    threadId: string;
    runId: string;
    createThreadId: () => string;
    tenant?: {
        userId?: string;
        orgId?: string;
    };
    onForked?: (input: {
        destinationThreadId: string;
        checkpointId: string;
    }) => void | Promise<void>;
}
export declare function createSnapshotTools(snapshots: SandboxSnapshots, options: CreateSnapshotToolsOptions): readonly [import('@tanstack/ai').ServerTool<{
    type: string;
    properties: {
        label: {
            type: string;
            description: string;
        };
    };
    required: string[];
    additionalProperties: false;
}, {
    type: string;
    properties: {
        checkpointId: {
            type: string;
        };
        label: {
            type: string;
        };
        threadId: {
            type: string;
        };
    };
    required: string[];
    additionalProperties: false;
}, "save_sandbox_snapshot", unknown, false, undefined> & {
    inputSchema: {
        type: string;
        properties: {
            label: {
                type: string;
                description: string;
            };
        };
        required: string[];
        additionalProperties: false;
    };
    outputSchema: {
        type: string;
        properties: {
            checkpointId: {
                type: string;
            };
            label: {
                type: string;
            };
            threadId: {
                type: string;
            };
        };
        required: string[];
        additionalProperties: false;
    };
    approvalSchema: undefined;
}, import('@tanstack/ai').ServerTool<{
    type: string;
    properties: {
        checkpointId: {
            type: string;
            description: string;
        };
    };
    additionalProperties: false;
}, {
    type: string;
    properties: {
        checkpointId: {
            type: string;
        };
        destinationThreadId: {
            type: string;
        };
    };
    required: string[];
    additionalProperties: false;
}, "fork_sandbox_snapshot", unknown, false, undefined> & {
    inputSchema: {
        type: string;
        properties: {
            checkpointId: {
                type: string;
                description: string;
            };
        };
        additionalProperties: false;
    };
    outputSchema: {
        type: string;
        properties: {
            checkpointId: {
                type: string;
            };
            destinationThreadId: {
                type: string;
            };
        };
        required: string[];
        additionalProperties: false;
    };
    approvalSchema: undefined;
}, import('@tanstack/ai').ServerTool<{
    type: string;
    properties: {
        checkpointId: {
            type: string;
        };
        artifactId: {
            type: string;
        };
    };
    required: string[];
    additionalProperties: false;
}, {
    type: string;
    properties: {
        artifactId: {
            type: string;
        };
        name: {
            type: string;
        };
        mimeType: {
            type: string;
        };
        size: {
            type: string;
        };
        createdAt: {
            type: string;
        };
    };
    required: string[];
    additionalProperties: false;
}, "read_sandbox_snapshot_artifact", unknown, false, undefined> & {
    inputSchema: {
        type: string;
        properties: {
            checkpointId: {
                type: string;
            };
            artifactId: {
                type: string;
            };
        };
        required: string[];
        additionalProperties: false;
    };
    outputSchema: {
        type: string;
        properties: {
            artifactId: {
                type: string;
            };
            name: {
                type: string;
            };
            mimeType: {
                type: string;
            };
            size: {
                type: string;
            };
            createdAt: {
                type: string;
            };
        };
        required: string[];
        additionalProperties: false;
    };
    approvalSchema: undefined;
}];
