import { StreamChunk } from '@tanstack/ai';
import { AnyHarness } from './define.js';
import { HarnessSession, SessionSnapshot } from './session.js';
import { Cursor, HarnessInput, Principal, Receipt } from './types.js';
/** The session-tier protocol version. Sent in `subscribe` and `hello`. */
export declare const HARNESS_PROTOCOL_VERSION = 1;
/** Client to host. */
export type ControlFrame = {
    type: 'harness.subscribe';
    threadId: string;
    from?: Cursor;
    v?: number;
} | {
    type: 'harness.input';
    requestId: string;
    input: HarnessInput;
} | {
    type: 'harness.snapshot';
};
/** Host to client. */
export type HostFrame = {
    type: 'harness.hello';
    v: number;
    threadId: string;
} | {
    type: 'harness.receipt';
    requestId: string;
    status: Receipt['status'];
    inputId?: string;
    operationId?: string;
    reason?: string;
} | {
    type: 'harness.event';
    cursor: Cursor;
    operationId: string;
    event: StreamChunk;
} | {
    type: 'harness.snapshot';
    snapshot: SessionSnapshot;
} | {
    type: 'harness.error';
    message: string;
};
/** Check the shape of a client input. Throws with a short reason. */
export declare function parseHarnessInput(value: unknown): HarnessInput;
/** Parse one text frame from a client. Throws with a short reason. */
export declare function parseControlFrame(data: string): ControlFrame;
/**
 * Apply a client input to a session. A client can run, or send messages to,
 * only the agents in `expose.agents`. It can run only the commands in
 * `expose.commands`, and change only the settings in `expose.settings` and the
 * config keys in `expose.config`. Resolves to the receipt. `principal` is who
 * sent the input, from your `authorize`, never from the input itself. A chat
 * input runs with its credentials.
 */
export declare function applyInput(harness: AnyHarness, session: HarnessSession, input: HarnessInput, principal?: Principal): Promise<Receipt>;
/**
 * What `describe` sends a client: only the commands in `expose.commands` and
 * the config keys in `expose.config`, so a UI shows only what `applyInput`
 * lets through. Server code reads the full `session.describe()`.
 */
export declare function describeForClient(harness: AnyHarness, session: HarnessSession): {
    commands: {
        name: string;
        description: string;
        owner: string;
        input?: unknown;
    }[];
    config: {
        option: import('./config.js').ConfigOption;
        value: unknown;
        owner: string;
        key: string;
    }[];
    tools: {
        name: string;
        owner: string;
    }[];
    settings: import('./types.js').ThreadSettings;
    models: string[];
};
/** The AG-UI capabilities document of a harness. */
export declare function capabilitiesOf(harness: AnyHarness): {
    identity: {
        name: string;
        type: string;
    };
    transport: {
        streaming: boolean;
        websocket: boolean;
    };
    tools: {
        supported: boolean;
        items: {
            name: any;
            description: string;
        }[];
    };
    multiAgent: {
        supported: boolean;
        subagents: {
            name: any;
            description: string;
        }[];
    };
    humanInTheLoop: {
        supported: boolean;
        interrupts: boolean;
    };
    custom: {
        tanstack: {
            protocol: number;
            agents: {
                inputSchema?: import('@tanstack/ai').JSONSchema | undefined;
                produces?: any;
                name: any;
                description: string;
            }[];
        };
    };
};
