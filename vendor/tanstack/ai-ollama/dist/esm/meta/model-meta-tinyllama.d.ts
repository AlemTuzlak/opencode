import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const TINYLLAMA_LATEST: {
    readonly name: "tinyllama:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "638mb";
    readonly context: 2000;
};
declare const TINYLLAMA_1_1b: {
    readonly name: "tinyllama:1.1b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "638mb";
    readonly context: 2000;
};
export declare const TINYLLAMA_MODELS: readonly ["tinyllama:latest", "tinyllama:1.1b"];
export type TinyllamaChatModelProviderOptionsByName = {
    [TINYLLAMA_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [TINYLLAMA_1_1b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type TinyllamaModelInputModalitiesByName = {
    [TINYLLAMA_LATEST.name]: typeof TINYLLAMA_LATEST.supports.input;
    [TINYLLAMA_1_1b.name]: typeof TINYLLAMA_1_1b.supports.input;
};
export {};
