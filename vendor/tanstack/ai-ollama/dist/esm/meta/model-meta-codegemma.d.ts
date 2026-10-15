import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const CODEGEMMA_LATEST: {
    readonly name: "codegemma:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "5gb";
    readonly context: 8000;
};
declare const CODEGEMMA_2b: {
    readonly name: "codegemma:2b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "1.65gb";
    readonly context: 8000;
};
declare const CODEGEMMA_7b: {
    readonly name: "codegemma:7b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "5gb";
    readonly context: 8000;
};
export declare const CODEGEMMA_MODELS: readonly ["codegemma:latest", "codegemma:2b", "codegemma:7b"];
export type CodegemmaChatModelProviderOptionsByName = {
    [CODEGEMMA_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [CODEGEMMA_2b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [CODEGEMMA_7b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type CodegemmaModelInputModalitiesByName = {
    [CODEGEMMA_LATEST.name]: typeof CODEGEMMA_LATEST.supports.input;
    [CODEGEMMA_2b.name]: typeof CODEGEMMA_2b.supports.input;
    [CODEGEMMA_7b.name]: typeof CODEGEMMA_7b.supports.input;
};
export {};
