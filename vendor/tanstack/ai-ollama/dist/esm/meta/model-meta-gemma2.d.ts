import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const GEMMA2_LATEST: {
    readonly name: "gemma2:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "5.4gb";
    readonly context: 8000;
};
declare const GEMMA2_2b: {
    readonly name: "gemma2:2b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "1.6gb";
    readonly context: 8000;
};
declare const GEMMA2_9b: {
    readonly name: "gemma2:9b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "5.4gb";
    readonly context: 8000;
};
declare const GEMMA2_27b: {
    readonly name: "gemma2:27b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "16gb";
    readonly context: 8000;
};
export declare const GEMMA2_MODELS: readonly ["gemma2:latest", "gemma2:2b", "gemma2:9b", "gemma2:27b"];
export type Gemma2ChatModelProviderOptionsByName = {
    [GEMMA2_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [GEMMA2_2b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [GEMMA2_9b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [GEMMA2_27b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type Gemma2ModelInputModalitiesByName = {
    [GEMMA2_LATEST.name]: typeof GEMMA2_LATEST.supports.input;
    [GEMMA2_2b.name]: typeof GEMMA2_2b.supports.input;
    [GEMMA2_9b.name]: typeof GEMMA2_9b.supports.input;
    [GEMMA2_27b.name]: typeof GEMMA2_27b.supports.input;
};
export {};
