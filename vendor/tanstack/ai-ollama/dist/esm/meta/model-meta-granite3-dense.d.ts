import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const GRANITE3_DENSE_LATEST: {
    readonly name: "granite3-dense:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "1.6gb";
    readonly context: 4000;
};
declare const GRANITE3_DENSE_2b: {
    readonly name: "granite3-dense:2b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "1.6gb";
    readonly context: 4000;
};
declare const GRANITE3_DENSE_8b: {
    readonly name: "granite3-dense:8b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.9gb";
    readonly context: 4000;
};
export declare const GRANITE3_DENSE_MODELS: readonly ["granite3-dense:latest", "granite3-dense:2b", "granite3-dense:8b"];
export type Granite3DenseChatModelProviderOptionsByName = {
    [GRANITE3_DENSE_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [GRANITE3_DENSE_2b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [GRANITE3_DENSE_8b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type Granite3DenseModelInputModalitiesByName = {
    [GRANITE3_DENSE_LATEST.name]: typeof GRANITE3_DENSE_LATEST.supports.input;
    [GRANITE3_DENSE_2b.name]: typeof GRANITE3_DENSE_2b.supports.input;
    [GRANITE3_DENSE_8b.name]: typeof GRANITE3_DENSE_8b.supports.input;
};
export {};
