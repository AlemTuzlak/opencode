import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageTools } from './models-meta.js';
declare const MISTRAL_LATEST: {
    readonly name: "mistral:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "4.4gb";
    readonly context: 32000;
};
declare const MISTRAL_7b: {
    readonly name: "mistral:7b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "4.4gb";
    readonly context: 32000;
};
export declare const MISTRAL_MODELS: readonly ["mistral:latest", "mistral:7b"];
export type MistralChatModelProviderOptionsByName = {
    [MISTRAL_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [MISTRAL_7b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
};
export type MistralModelInputModalitiesByName = {
    [MISTRAL_LATEST.name]: typeof MISTRAL_LATEST.supports.input;
    [MISTRAL_7b.name]: typeof MISTRAL_7b.supports.input;
};
export {};
