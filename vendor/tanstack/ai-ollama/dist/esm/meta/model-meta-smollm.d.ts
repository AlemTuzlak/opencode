import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const SMOLLM_LATEST: {
    readonly name: "smollm:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "991mb";
    readonly context: 2000;
};
declare const SMOLLM_135m: {
    readonly name: "smollm:135m";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "92mb";
    readonly context: 2000;
};
declare const SMOLLM_360m: {
    readonly name: "smollm:360m";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "229mb";
    readonly context: 2000;
};
declare const SMOLLM_1_7b: {
    readonly name: "smollm:1.7b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "991mb";
    readonly context: 2000;
};
export declare const SMOLLM_MODELS: readonly ["smollm:latest", "smollm:135m", "smollm:360m", "smollm:1.7b"];
export type SmollmChatModelProviderOptionsByName = {
    [SMOLLM_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [SMOLLM_135m.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [SMOLLM_360m.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [SMOLLM_1_7b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type SmollmModelInputModalitiesByName = {
    [SMOLLM_LATEST.name]: typeof SMOLLM_LATEST.supports.input;
    [SMOLLM_135m.name]: typeof SMOLLM_135m.supports.input;
    [SMOLLM_360m.name]: typeof SMOLLM_360m.supports.input;
    [SMOLLM_1_7b.name]: typeof SMOLLM_1_7b.supports.input;
};
export {};
