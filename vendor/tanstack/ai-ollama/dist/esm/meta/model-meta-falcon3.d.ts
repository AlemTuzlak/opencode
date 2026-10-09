import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const FALCON3_LATEST: {
    readonly name: "falcon3:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.6gb";
    readonly context: 32000;
};
declare const FALCON3_1b: {
    readonly name: "falcon3:1b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "1.8gb";
    readonly context: 8000;
};
declare const FALCON3_3b: {
    readonly name: "falcon3:3b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "2gb";
    readonly context: 32000;
};
declare const FALCON3_7b: {
    readonly name: "falcon3:7b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.6gb";
    readonly context: 32000;
};
declare const FALCON3_10b: {
    readonly name: "falcon3:10b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "6.3gb";
    readonly context: 32000;
};
export declare const FALCON3_MODELS: readonly ["falcon3:latest", "falcon3:1b", "falcon3:3b", "falcon3:7b", "falcon3:10b"];
export type Falcon3ChatModelProviderOptionsByName = {
    [FALCON3_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [FALCON3_1b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [FALCON3_3b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [FALCON3_7b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [FALCON3_10b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type Falcon3ModelInputModalitiesByName = {
    [FALCON3_LATEST.name]: typeof FALCON3_LATEST.supports.input;
    [FALCON3_1b.name]: typeof FALCON3_1b.supports.input;
    [FALCON3_3b.name]: typeof FALCON3_3b.supports.input;
    [FALCON3_7b.name]: typeof FALCON3_7b.supports.input;
    [FALCON3_10b.name]: typeof FALCON3_10b.supports.input;
};
export {};
