import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const SHIELDGEMMA_LATEST: {
    readonly name: "shieldgemma:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "5.8gb";
    readonly context: 8000;
};
declare const SHIELDGEMMA_2b: {
    readonly name: "shieldgemma:2b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "1.7gb";
    readonly context: 8000;
};
declare const SHIELDGEMMA_9b: {
    readonly name: "shieldgemma:9b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "5.8gb";
    readonly context: 8000;
};
declare const SHIELDGEMMA_27b: {
    readonly name: "shieldgemma:27b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "17gb";
    readonly context: 8000;
};
export declare const SHIELDGEMMA_MODELS: readonly ["shieldgemma:latest", "shieldgemma:2b", "shieldgemma:9b", "shieldgemma:27b"];
export type ShieldgemmaChatModelProviderOptionsByName = {
    [SHIELDGEMMA_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [SHIELDGEMMA_2b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [SHIELDGEMMA_9b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [SHIELDGEMMA_27b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type ShieldgemmaModelInputModalitiesByName = {
    [SHIELDGEMMA_LATEST.name]: typeof SHIELDGEMMA_LATEST.supports.input;
    [SHIELDGEMMA_2b.name]: typeof SHIELDGEMMA_2b.supports.input;
    [SHIELDGEMMA_9b.name]: typeof SHIELDGEMMA_9b.supports.input;
    [SHIELDGEMMA_27b.name]: typeof SHIELDGEMMA_27b.supports.input;
};
export {};
