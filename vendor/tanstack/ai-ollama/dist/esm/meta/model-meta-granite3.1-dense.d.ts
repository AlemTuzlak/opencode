import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageTools } from './models-meta.js';
declare const GRANITE3_1_DENSE_LATEST: {
    readonly name: "granite3.1-dense:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "5gb";
    readonly context: 128000;
};
declare const GRANITE3_1_DENSE_2b: {
    readonly name: "granite3.1-dense:2b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "1.6gb";
    readonly context: 128000;
};
declare const GRANITE3_1_DENSE_8b: {
    readonly name: "granite3.1-dense:8b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "5gb";
    readonly context: 128000;
};
export declare const GRANITE3_1_DENSE_MODELS: readonly ["granite3.1-dense:latest", "granite3.1-dense:2b", "granite3.1-dense:8b"];
export type Granite3_1DenseChatModelProviderOptionsByName = {
    [GRANITE3_1_DENSE_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [GRANITE3_1_DENSE_2b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [GRANITE3_1_DENSE_8b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
};
export type Granite3_1DenseModelInputModalitiesByName = {
    [GRANITE3_1_DENSE_LATEST.name]: typeof GRANITE3_1_DENSE_LATEST.supports.input;
    [GRANITE3_1_DENSE_2b.name]: typeof GRANITE3_1_DENSE_2b.supports.input;
    [GRANITE3_1_DENSE_8b.name]: typeof GRANITE3_1_DENSE_8b.supports.input;
};
export {};
