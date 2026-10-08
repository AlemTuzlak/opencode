import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageTools } from './models-meta.js';
declare const MISTRAL_NEMO_LATEST: {
    readonly name: "mistral-nemo:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "7.1gb";
    readonly context: 128000;
};
declare const MISTRAL_NEMO_12b: {
    readonly name: "mistral-nemo:12b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "7.1gb";
    readonly context: 128000;
};
export declare const MISTRAL_NEMO_MODELS: readonly ["mistral-nemo:latest", "mistral-nemo:12b"];
export type MistralNemoChatModelProviderOptionsByName = {
    [MISTRAL_NEMO_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [MISTRAL_NEMO_12b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
};
export type MistralNemoModelInputModalitiesByName = {
    [MISTRAL_NEMO_LATEST.name]: typeof MISTRAL_NEMO_LATEST.supports.input;
    [MISTRAL_NEMO_12b.name]: typeof MISTRAL_NEMO_12b.supports.input;
};
export {};
