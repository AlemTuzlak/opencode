import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const LLAMA_GUARD3_LATEST: {
    readonly name: "llama-guard3:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.9gb";
    readonly context: 128000;
};
declare const LLAMA_GUARD3_1b: {
    readonly name: "llama-guard3:1b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "1.6gb";
    readonly context: 128000;
};
declare const LLAMA_GUARD3_8b: {
    readonly name: "llama-guard3:8b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.9gb";
    readonly context: 128000;
};
export declare const LLAMA_GUARD3_MODELS: readonly ["llama-guard3:latest", "llama-guard3:1b", "llama-guard3:8b"];
export type LlamaGuard3ChatModelProviderOptionsByName = {
    [LLAMA_GUARD3_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [LLAMA_GUARD3_1b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [LLAMA_GUARD3_8b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type LlamaGuard3ModelInputModalitiesByName = {
    [LLAMA_GUARD3_LATEST.name]: typeof LLAMA_GUARD3_LATEST.supports.input;
    [LLAMA_GUARD3_1b.name]: typeof LLAMA_GUARD3_1b.supports.input;
    [LLAMA_GUARD3_8b.name]: typeof LLAMA_GUARD3_8b.supports.input;
};
export {};
