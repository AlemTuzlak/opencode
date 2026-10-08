import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const LLAMA3_LATEST: {
    readonly name: "llama3:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.7gb";
    readonly context: 8000;
};
declare const LLAMA3_8b: {
    readonly name: "llama3:8b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.7gb";
    readonly context: 8000;
};
declare const LLAMA3_70b: {
    readonly name: "llama3:70b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "40gb";
    readonly context: 8000;
};
export declare const LLAMA3_MODELS: readonly ["llama3:latest", "llama3:8b", "llama3:70b"];
export type Llama3ChatModelProviderOptionsByName = {
    [LLAMA3_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [LLAMA3_8b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [LLAMA3_70b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type Llama3ModelInputModalitiesByName = {
    [LLAMA3_LATEST.name]: typeof LLAMA3_LATEST.supports.input;
    [LLAMA3_8b.name]: typeof LLAMA3_8b.supports.input;
    [LLAMA3_70b.name]: typeof LLAMA3_70b.supports.input;
};
export {};
