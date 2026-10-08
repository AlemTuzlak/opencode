import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageTools } from './models-meta.js';
declare const MISTRAL_LARGE_LATEST: {
    readonly name: "mistral-large:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "73gb";
    readonly context: 128000;
};
declare const MISTRAL_LARGE_123b: {
    readonly name: "mistral-large:123b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "73gb";
    readonly context: 128000;
};
export declare const MISTRAL_LARGE_MODELS: readonly ["mistral-large:latest", "mistral-large:123b"];
export type MistralLargeChatModelProviderOptionsByName = {
    [MISTRAL_LARGE_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [MISTRAL_LARGE_123b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
};
export type MistralLargeModelInputModalitiesByName = {
    [MISTRAL_LARGE_LATEST.name]: typeof MISTRAL_LARGE_LATEST.supports.input;
    [MISTRAL_LARGE_123b.name]: typeof MISTRAL_LARGE_123b.supports.input;
};
export {};
