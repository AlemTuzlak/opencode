import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageTools } from './models-meta.js';
declare const GRANITE3_MOE_LATEST: {
    readonly name: "granite3-moe:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "822mb";
    readonly context: 4000;
};
declare const GRANITE3_MOE_1b: {
    readonly name: "granite3-moe:1b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "822mb";
    readonly context: 4000;
};
declare const GRANITE3_MOE_3b: {
    readonly name: "granite3-moe:3b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "2.1gb";
    readonly context: 4000;
};
export declare const GRANITE3_MOE_MODELS: readonly ["granite3-moe:latest", "granite3-moe:1b", "granite3-moe:3b"];
export type Granite3MoeChatModelProviderOptionsByName = {
    [GRANITE3_MOE_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [GRANITE3_MOE_1b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [GRANITE3_MOE_3b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
};
export type Granite3MoeModelInputModalitiesByName = {
    [GRANITE3_MOE_LATEST.name]: typeof GRANITE3_MOE_LATEST.supports.input;
    [GRANITE3_MOE_1b.name]: typeof GRANITE3_MOE_1b.supports.input;
    [GRANITE3_MOE_3b.name]: typeof GRANITE3_MOE_3b.supports.input;
};
export {};
