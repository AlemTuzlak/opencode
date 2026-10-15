import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const LLAMA3_CHATQA_LATEST: {
    readonly name: "llama3-chatqa:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.7gb";
    readonly context: 8000;
};
declare const LLAMA3_CHATQA_8b: {
    readonly name: "llama3-chatqa:8b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.7gb";
    readonly context: 8000;
};
declare const LLAMA3_CHATQA_70b: {
    readonly name: "llama3-chatqa:70b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "40gb";
    readonly context: 8000;
};
export declare const LLAMA3_CHATQA_MODELS: readonly ["llama3-chatqa:latest", "llama3-chatqa:8b", "llama3-chatqa:70b"];
export type Llama3ChatQaChatModelProviderOptionsByName = {
    [LLAMA3_CHATQA_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [LLAMA3_CHATQA_8b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [LLAMA3_CHATQA_70b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type Llama3ChatQaModelInputModalitiesByName = {
    [LLAMA3_CHATQA_LATEST.name]: typeof LLAMA3_CHATQA_LATEST.supports.input;
    [LLAMA3_CHATQA_8b.name]: typeof LLAMA3_CHATQA_8b.supports.input;
    [LLAMA3_CHATQA_70b.name]: typeof LLAMA3_CHATQA_70b.supports.input;
};
export {};
