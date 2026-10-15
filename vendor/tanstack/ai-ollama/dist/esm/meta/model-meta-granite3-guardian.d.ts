import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const GRANITE3_GUARDIAN_LATEST: {
    readonly name: "granite3-guardian:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "2.7gb";
    readonly context: 8000;
};
declare const GRANITE3_GUARDIAN_2b: {
    readonly name: "granite3-guardian:2b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "2.7gb";
    readonly context: 8000;
};
declare const GRANITE3_GUARDIAN_8b: {
    readonly name: "granite3-guardian:8b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "5.8gb";
    readonly context: 8000;
};
export declare const GRANITE3_GUARDIAN_MODELS: readonly ["granite3-guardian:latest", "granite3-guardian:2b", "granite3-guardian:8b"];
export type Granite3GuardianChatModelProviderOptionsByName = {
    [GRANITE3_GUARDIAN_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [GRANITE3_GUARDIAN_2b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [GRANITE3_GUARDIAN_8b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type Granite3GuardianModelInputModalitiesByName = {
    [GRANITE3_GUARDIAN_LATEST.name]: typeof GRANITE3_GUARDIAN_LATEST.supports.input;
    [GRANITE3_GUARDIAN_2b.name]: typeof GRANITE3_GUARDIAN_2b.supports.input;
    [GRANITE3_GUARDIAN_8b.name]: typeof GRANITE3_GUARDIAN_8b.supports.input;
};
export {};
