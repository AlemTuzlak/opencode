import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageTools } from './models-meta.js';
declare const MISTRAL_SMALL_LATEST: {
    readonly name: "mistral-small:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "14gb";
    readonly context: 32000;
};
declare const MISTRAL_SMALL_22b: {
    readonly name: "mistral-small:22b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "13gb";
    readonly context: 128000;
};
declare const MISTRAL_SMALL_24b: {
    readonly name: "mistral-small:24b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "14gb";
    readonly context: 32000;
};
export declare const MISTRAL_SMALL_MODELS: readonly ["mistral-small:latest", "mistral-small:22b", "mistral-small:24b"];
export type MistralSmallChatModelProviderOptionsByName = {
    [MISTRAL_SMALL_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [MISTRAL_SMALL_22b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [MISTRAL_SMALL_24b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
};
export type MistralSmallModelInputModalitiesByName = {
    [MISTRAL_SMALL_LATEST.name]: typeof MISTRAL_SMALL_LATEST.supports.input;
    [MISTRAL_SMALL_22b.name]: typeof MISTRAL_SMALL_22b.supports.input;
    [MISTRAL_SMALL_24b.name]: typeof MISTRAL_SMALL_24b.supports.input;
};
export {};
