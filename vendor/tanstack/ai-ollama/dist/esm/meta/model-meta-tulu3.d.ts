import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const TULU3_LATEST: {
    readonly name: "tulu3:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.9gb";
    readonly context: 128000;
};
declare const TULU3_8b: {
    readonly name: "tulu3:8b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.9gb";
    readonly context: 128000;
};
declare const TULU3_70b: {
    readonly name: "tulu3:70b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "43gb";
    readonly context: 128000;
};
export declare const TULU3_MODELS: readonly ["tulu3:latest", "tulu3:8b", "tulu3:70b"];
export type Tulu3ChatModelProviderOptionsByName = {
    [TULU3_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [TULU3_8b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [TULU3_70b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type Tulu3ModelInputModalitiesByName = {
    [TULU3_LATEST.name]: typeof TULU3_LATEST.supports.input;
    [TULU3_8b.name]: typeof TULU3_8b.supports.input;
    [TULU3_70b.name]: typeof TULU3_70b.supports.input;
};
export {};
