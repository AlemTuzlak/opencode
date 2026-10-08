import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const AYA_LATEST: {
    readonly name: "aya:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.8gb";
    readonly context: 8000;
};
declare const AYA_8b: {
    readonly name: "aya:8b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.8gb";
    readonly context: 8000;
};
declare const AYA_35b: {
    readonly name: "aya:35b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "20gb";
    readonly context: 8000;
};
export declare const AYA_MODELS: readonly ["aya:latest", "aya:8b", "aya:35b"];
export type AyaChatModelProviderOptionsByName = {
    [AYA_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [AYA_8b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [AYA_35b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type AyaModelInputModalitiesByName = {
    [AYA_LATEST.name]: typeof AYA_LATEST.supports.input;
    [AYA_8b.name]: typeof AYA_8b.supports.input;
    [AYA_35b.name]: typeof AYA_35b.supports.input;
};
export {};
