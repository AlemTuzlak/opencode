import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const FIREFUNCTION_V2_LATEST: {
    readonly name: "firefunction-v2:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "40gb";
    readonly context: 8000;
};
declare const FIREFUNCTION_V2_70b: {
    readonly name: "firefunction-v2:70b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "40gb";
    readonly context: 8000;
};
export declare const FIREFUNCTION_V2_MODELS: readonly ["firefunction-v2:latest", "firefunction-v2:70b"];
export type Firefunction_V2ChatModelProviderOptionsByName = {
    [FIREFUNCTION_V2_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [FIREFUNCTION_V2_70b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type Firefunction_V2ModelInputModalitiesByName = {
    [FIREFUNCTION_V2_LATEST.name]: typeof FIREFUNCTION_V2_LATEST.supports.input;
    [FIREFUNCTION_V2_70b.name]: typeof FIREFUNCTION_V2_70b.supports.input;
};
export {};
