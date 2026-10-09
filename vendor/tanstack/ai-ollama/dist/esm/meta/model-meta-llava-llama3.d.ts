import { OllamaChatRequest, OllamaChatRequestMessages, OllamaMessageImages } from './models-meta.js';
declare const LLAVA_LLAMA3_LATEST: {
    readonly name: "llava-llama3:latest";
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: ["vision"];
    };
    readonly size: "5.5gb";
    readonly context: 8000;
};
declare const LLAVA_LLAMA3_8b: {
    readonly name: "llava-llama3:8b";
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: ["vision"];
    };
    readonly size: "5.5gb";
    readonly context: 8000;
};
export declare const LLAVA_LLAMA3_MODELS: readonly ["llava-llama3:latest", "llava-llama3:8b"];
export type LlavaLlamaChatModelProviderOptionsByName = {
    [LLAVA_LLAMA3_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageImages>;
    [LLAVA_LLAMA3_8b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageImages>;
};
export type LlavaLlamaModelInputModalitiesByName = {
    [LLAVA_LLAMA3_LATEST.name]: typeof LLAVA_LLAMA3_LATEST.supports.input;
    [LLAVA_LLAMA3_8b.name]: typeof LLAVA_LLAMA3_8b.supports.input;
};
export {};
