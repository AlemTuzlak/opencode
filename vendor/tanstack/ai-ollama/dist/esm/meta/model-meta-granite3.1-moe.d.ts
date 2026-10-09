import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageTools } from './models-meta.js';
declare const GRANITE3_1_MOE_LATEST: {
    readonly name: "granite3.1-moe:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "2gb";
    readonly context: 128000;
};
declare const GRANITE3_1_MOE_1b: {
    readonly name: "granite3.1-moe:1b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "1.4gb";
    readonly context: 128000;
};
declare const GRANITE3_1_MOE_3b: {
    readonly name: "granite3.1-moe:3b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "2gb";
    readonly context: 128000;
};
export declare const GRANITE3_1_MOE_MODELS: readonly ["granite3.1-moe:latest", "granite3.1-moe:1b", "granite3.1-moe:3b"];
export type Granite3_1MoeChatModelProviderOptionsByName = {
    [GRANITE3_1_MOE_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [GRANITE3_1_MOE_1b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [GRANITE3_1_MOE_3b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
};
export type Granite3_1MoeModelInputModalitiesByName = {
    [GRANITE3_1_MOE_LATEST.name]: typeof GRANITE3_1_MOE_LATEST.supports.input;
    [GRANITE3_1_MOE_1b.name]: typeof GRANITE3_1_MOE_1b.supports.input;
    [GRANITE3_1_MOE_3b.name]: typeof GRANITE3_1_MOE_3b.supports.input;
};
export {};
