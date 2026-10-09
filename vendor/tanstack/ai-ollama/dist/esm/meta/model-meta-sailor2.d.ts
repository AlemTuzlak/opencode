import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const SAILOR2_LATEST: {
    readonly name: "sailor2:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "5.2gb";
    readonly context: 32000;
};
declare const SAILOR2_1b: {
    readonly name: "sailor2:1b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "1.1gb";
    readonly context: 32000;
};
declare const SAILOR2_8b: {
    readonly name: "sailor2:8b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "5.2gb";
    readonly context: 32000;
};
declare const SAILOR2_20b: {
    readonly name: "sailor2:20b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "12gb";
    readonly context: 32000;
};
export declare const SAILOR2_MODELS: readonly ["sailor2:latest", "sailor2:8b", "sailor2:20b"];
export type Sailor2ChatModelProviderOptionsByName = {
    [SAILOR2_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [SAILOR2_1b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [SAILOR2_8b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [SAILOR2_20b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type Sailor2ModelInputModalitiesByName = {
    [SAILOR2_LATEST.name]: typeof SAILOR2_LATEST.supports.input;
    [SAILOR2_1b.name]: typeof SAILOR2_1b.supports.input;
    [SAILOR2_8b.name]: typeof SAILOR2_8b.supports.input;
    [SAILOR2_20b.name]: typeof SAILOR2_20b.supports.input;
};
export {};
