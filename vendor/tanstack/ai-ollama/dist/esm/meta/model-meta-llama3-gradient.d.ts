import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const LLAMA3_GRADIENT_LATEST: {
    readonly name: "llama3-gradient:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.7gb";
    readonly context: 1000000;
};
declare const LLAMA3_GRADIENT_8b: {
    readonly name: "llama3-gradient:8b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.7gb";
    readonly context: 1000000;
};
declare const LLAMA3_GRADIENT_70b: {
    readonly name: "llama3-gradient:70b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "40gb";
    readonly context: 1000000;
};
export declare const LLAMA3_GRADIENT_MODELS: readonly ["llama3-gradient:latest", "llama3-gradient:8b", "llama3-gradient:70b"];
export type Llama3GradientChatModelProviderOptionsByName = {
    [LLAMA3_GRADIENT_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [LLAMA3_GRADIENT_8b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [LLAMA3_GRADIENT_70b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type Llama3GradientModelInputModalitiesByName = {
    [LLAMA3_GRADIENT_LATEST.name]: typeof LLAMA3_GRADIENT_LATEST.supports.input;
    [LLAMA3_GRADIENT_8b.name]: typeof LLAMA3_GRADIENT_8b.supports.input;
    [LLAMA3_GRADIENT_70b.name]: typeof LLAMA3_GRADIENT_70b.supports.input;
};
export {};
