import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageTools } from './models-meta.js';
declare const MIXTRAL_LATEST: {
    readonly name: "mixtral:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "26gb";
    readonly context: 32000;
};
declare const MIXTRAL_8X7b: {
    readonly name: "mixtral:8x7b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "26gb";
    readonly context: 32000;
};
declare const MIXTRAL_8X22b: {
    readonly name: "mixtral:8x22b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "80gb";
    readonly context: 64000;
};
export declare const MIXTRAL_MODELS: readonly ["mixtral:latest", "mixtral:8x7b", "mixtral:8x22b"];
export type MixtralChatModelProviderOptionsByName = {
    [MIXTRAL_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [MIXTRAL_8X7b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [MIXTRAL_8X22b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
};
export type MixtralModelInputModalitiesByName = {
    [MIXTRAL_LATEST.name]: typeof MIXTRAL_LATEST.supports.input;
    [MIXTRAL_8X7b.name]: typeof MIXTRAL_8X7b.supports.input;
    [MIXTRAL_8X22b.name]: typeof MIXTRAL_8X22b.supports.input;
};
export {};
