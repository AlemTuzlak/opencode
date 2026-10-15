import { OllamaChatRequest, OllamaChatRequestMessages, OllamaMessageImages } from './models-meta.js';
declare const LLAVA_LATEST: {
    readonly name: "llava:latest";
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: ["vision"];
    };
    readonly size: "4.7gb";
    readonly context: 32000;
};
declare const LLAVA_7b: {
    readonly name: "llava:7b";
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: ["vision"];
    };
    readonly size: "4.7gb";
    readonly context: 32000;
};
declare const LLAVA_13b: {
    readonly name: "llava:13b";
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: ["vision"];
    };
    readonly size: "8gb";
    readonly context: 4000;
};
declare const LLAVA_34b: {
    readonly name: "llava:34b";
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: ["vision"];
    };
    readonly size: "20gb";
    readonly context: 4000;
};
export declare const LLAVA_MODELS: readonly ["llava:latest", "llava:7b", "llava:13b", "llava:34b"];
export type LlavaChatModelProviderOptionsByName = {
    [LLAVA_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageImages>;
    [LLAVA_7b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageImages>;
    [LLAVA_13b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageImages>;
    [LLAVA_34b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageImages>;
};
export type LlavaModelInputModalitiesByName = {
    [LLAVA_LATEST.name]: typeof LLAVA_LATEST.supports.input;
    [LLAVA_7b.name]: typeof LLAVA_7b.supports.input;
    [LLAVA_13b.name]: typeof LLAVA_13b.supports.input;
    [LLAVA_34b.name]: typeof LLAVA_34b.supports.input;
};
export {};
