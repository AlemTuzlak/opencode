import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const CODELLAMA_LATEST: {
    readonly name: "codellama:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "3.8gb";
    readonly context: 16000;
};
declare const CODELLAMA_7b: {
    readonly name: "codellama:7b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "3.8gb";
    readonly context: 16000;
};
declare const CODELLAMA_13b: {
    readonly name: "codellama:13b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "7.4gb";
    readonly context: 16000;
};
declare const CODELLAMA_34b: {
    readonly name: "codellama:34b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "19gb";
    readonly context: 16000;
};
declare const CODELLAMA_70b: {
    readonly name: "codellama:70b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "39gb";
    readonly context: 2000;
};
export declare const CODELLAMA_MODELS: readonly ["codellama:latest", "codellama:7b", "codellama:13b", "codellama:34b", "codellama:70b"];
export type CodellamaChatModelProviderOptionsByName = {
    [CODELLAMA_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [CODELLAMA_7b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [CODELLAMA_13b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [CODELLAMA_34b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [CODELLAMA_70b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type CodellamaModelInputModalitiesByName = {
    [CODELLAMA_LATEST.name]: typeof CODELLAMA_LATEST.supports.input;
    [CODELLAMA_7b.name]: typeof CODELLAMA_7b.supports.input;
    [CODELLAMA_13b.name]: typeof CODELLAMA_13b.supports.input;
    [CODELLAMA_34b.name]: typeof CODELLAMA_34b.supports.input;
    [CODELLAMA_70b.name]: typeof CODELLAMA_70b.supports.input;
};
export {};
