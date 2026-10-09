import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const SMALLTINKER_LATEST: {
    readonly name: "smalltinker:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "3.6gb";
    readonly context: 32000;
};
declare const SMALLTINKER_3b: {
    readonly name: "smalltinker:3b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "3.6gb";
    readonly context: 32000;
};
export declare const SMALLTINKER_MODELS: readonly ["smalltinker:latest", "smalltinker:3b"];
export type SmalltinkerChatModelProviderOptionsByName = {
    [SMALLTINKER_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [SMALLTINKER_3b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type SmalltinkerModelInputModalitiesByName = {
    [SMALLTINKER_LATEST.name]: typeof SMALLTINKER_LATEST.supports.input;
    [SMALLTINKER_3b.name]: typeof SMALLTINKER_3b.supports.input;
};
export {};
