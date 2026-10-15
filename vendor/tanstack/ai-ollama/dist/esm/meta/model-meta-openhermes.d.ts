import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const OPENHERMES_LATEST: {
    readonly name: "openhermes:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.1gb";
    readonly context: 32000;
};
declare const OPENHERMES_V2: {
    readonly name: "openhermes:v2";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.1gb";
    readonly context: 32000;
};
declare const OPENHERMES_V2_5: {
    readonly name: "openhermes:v2.5";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.1gb";
    readonly context: 32000;
};
export declare const OPENHERMES_MODELS: readonly ["openhermes:latest", "openhermes:v2", "openhermes:v2.5"];
export type OpenhermesChatModelProviderOptionsByName = {
    [OPENHERMES_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [OPENHERMES_V2.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [OPENHERMES_V2_5.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type OpenhermesModelInputModalitiesByName = {
    [OPENHERMES_LATEST.name]: typeof OPENHERMES_LATEST.supports.input;
    [OPENHERMES_V2.name]: typeof OPENHERMES_V2.supports.input;
    [OPENHERMES_V2_5.name]: typeof OPENHERMES_V2_5.supports.input;
};
export {};
