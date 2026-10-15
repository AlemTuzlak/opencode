import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const GEMMA_LATEST: {
    readonly name: "gemma:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "5gb";
    readonly context: 8000;
};
declare const GEMMA_2b: {
    readonly name: "gemma:2b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "1.7gb";
    readonly context: 8000;
};
declare const GEMMA_7b: {
    readonly name: "gemma:7b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "5gb";
    readonly context: 8000;
};
export declare const GEMMA_MODELS: readonly ["gemma:latest", "gemma:2b", "gemma:7b"];
export type GemmaChatModelProviderOptionsByName = {
    [GEMMA_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [GEMMA_2b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [GEMMA_7b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type GemmaModelInputModalitiesByName = {
    [GEMMA_LATEST.name]: typeof GEMMA_LATEST.supports.input;
    [GEMMA_2b.name]: typeof GEMMA_2b.supports.input;
    [GEMMA_7b.name]: typeof GEMMA_7b.supports.input;
};
export {};
