import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageImages, OllamaMessageTools } from './models-meta.js';
declare const LLAMA4_LATEST: {
    readonly name: "llama4:latest";
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: ["tools", "vision"];
    };
    readonly size: "67gb";
    readonly context: 10000000;
};
declare const LLAMA4_16X17b: {
    readonly name: "llama4:16x17b";
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: ["tools", "vision"];
    };
    readonly size: "67gb";
    readonly context: 10000000;
};
declare const LLAMA4_128X17b: {
    readonly name: "llama4:128x17b";
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: ["tools", "vision"];
    };
    readonly size: "245gb";
    readonly context: 1000000;
};
export declare const LLAMA4_MODELS: readonly ["llama4:latest", "llama4:16x17b", "llama4:128x17b"];
export type Llama4ChatModelProviderOptionsByName = {
    [LLAMA4_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools & OllamaMessageImages> & OllamaChatRequestTools;
    [LLAMA4_16X17b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools & OllamaMessageImages> & OllamaChatRequestTools;
    [LLAMA4_128X17b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools & OllamaMessageImages> & OllamaChatRequestTools;
};
export type Llama4ModelInputModalitiesByName = {
    [LLAMA4_LATEST.name]: typeof LLAMA4_LATEST.supports.input;
    [LLAMA4_16X17b.name]: typeof LLAMA4_16X17b.supports.input;
    [LLAMA4_128X17b.name]: typeof LLAMA4_128X17b.supports.input;
};
export {};
