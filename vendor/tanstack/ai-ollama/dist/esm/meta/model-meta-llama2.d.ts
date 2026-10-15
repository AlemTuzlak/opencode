import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const LLAMA2_LATEST: {
    readonly name: "llama2:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "3.8gb";
    readonly context: 4000;
};
declare const LLAMA2_7b: {
    readonly name: "llama2:7b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "3.8gb";
    readonly context: 4000;
};
declare const LLAMA2_13b: {
    readonly name: "llama2:13b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "7.4gb";
    readonly context: 4000;
};
declare const LLAMA2_70b: {
    readonly name: "llama2:70b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "39gb";
    readonly context: 4000;
};
export declare const LLAMA2_MODELS: readonly ["llama2:latest", "llama2:7b", "llama2:13b", "llama2:70b"];
export type Llama2ChatModelProviderOptionsByName = {
    [LLAMA2_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [LLAMA2_7b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [LLAMA2_13b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [LLAMA2_70b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type Llama2ModelInputModalitiesByName = {
    [LLAMA2_LATEST.name]: typeof LLAMA2_LATEST.supports.input;
    [LLAMA2_7b.name]: typeof LLAMA2_7b.supports.input;
    [LLAMA2_13b.name]: typeof LLAMA2_13b.supports.input;
    [LLAMA2_70b.name]: typeof LLAMA2_70b.supports.input;
};
export {};
