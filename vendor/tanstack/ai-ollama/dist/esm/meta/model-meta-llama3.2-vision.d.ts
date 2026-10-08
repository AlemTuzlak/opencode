import { OllamaChatRequest, OllamaChatRequestMessages, OllamaMessageImages } from './models-meta.js';
declare const LLAMA3_2_VISION_LATEST: {
    readonly name: "llama3.2:latest";
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: ["vision"];
    };
    readonly size: "7.8b";
    readonly context: 128000;
};
declare const LLAMA3_2_VISION_11b: {
    readonly name: "llama3.2:11b";
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: ["vision"];
    };
    readonly size: "1gb";
    readonly context: 128000;
};
declare const LLAMA3_2_VISION_90b: {
    readonly name: "llama3.2:90b";
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: ["vision"];
    };
    readonly size: "55gb";
    readonly context: 128000;
};
export declare const LLAMA3_2_VISION_MODELS: readonly ["llama3.2:latest", "llama3.2:11b", "llama3.2:90b"];
export type Llama3_2VisionChatModelProviderOptionsByName = {
    [LLAMA3_2_VISION_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageImages>;
    [LLAMA3_2_VISION_11b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageImages>;
    [LLAMA3_2_VISION_90b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageImages>;
};
export type Llama3_2VisionModelInputModalitiesByName = {
    [LLAMA3_2_VISION_LATEST.name]: typeof LLAMA3_2_VISION_LATEST.supports.input;
    [LLAMA3_2_VISION_11b.name]: typeof LLAMA3_2_VISION_11b.supports.input;
    [LLAMA3_2_VISION_90b.name]: typeof LLAMA3_2_VISION_90b.supports.input;
};
export {};
