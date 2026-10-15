import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageTools } from './models-meta.js';
declare const DEVSTRAL_LATEST: {
    readonly name: "devstral:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "14gb";
    readonly context: 128000;
};
declare const DEVSTRAL_24b: {
    readonly name: "devstral:24b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "14gb";
    readonly context: 128000;
};
export declare const DEVSTRAL_MODELS: readonly ["devstral:latest", "devstral:24b"];
export type DevstralChatModelProviderOptionsByName = {
    [DEVSTRAL_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [DEVSTRAL_24b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
};
export type DevstralModelInputModalitiesByName = {
    [DEVSTRAL_LATEST.name]: typeof DEVSTRAL_LATEST.supports.input;
    [DEVSTRAL_24b.name]: typeof DEVSTRAL_24b.supports.input;
};
export {};
