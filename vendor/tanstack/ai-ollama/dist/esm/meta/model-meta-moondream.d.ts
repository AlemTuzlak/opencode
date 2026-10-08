import { OllamaChatRequest, OllamaChatRequestMessages, OllamaMessageImages } from './models-meta.js';
declare const MOONDREAM_LATEST: {
    readonly name: "moondream:latest";
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: ["vision"];
    };
    readonly size: "1.7gb";
    readonly context: 2000;
};
declare const MOONDREAM_1_8b: {
    readonly name: "moondream:1.8b";
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly capabilities: ["vision"];
    };
    readonly size: "1.7gb";
    readonly context: 2000;
};
export declare const MOONDREAM_MODELS: readonly ["moondream:latest", "moondream:1.8b"];
export type MoondreamChatModelProviderOptionsByName = {
    [MOONDREAM_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageImages>;
    [MOONDREAM_1_8b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageImages>;
};
export type MoondreamModelInputModalitiesByName = {
    [MOONDREAM_LATEST.name]: typeof MOONDREAM_LATEST.supports.input;
    [MOONDREAM_1_8b.name]: typeof MOONDREAM_1_8b.supports.input;
};
export {};
