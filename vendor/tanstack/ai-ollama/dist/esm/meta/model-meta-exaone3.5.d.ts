import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const EXAONE3_5_LATEST: {
    readonly name: "exaone3.5:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.8gb";
    readonly context: 32000;
};
declare const EXAONE3_5_2_4b: {
    readonly name: "exaone3.5:2.4b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "1.6gb";
    readonly context: 32000;
};
declare const EXAONE3_5_7_1b: {
    readonly name: "exaone3.5:7.8b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.8gb";
    readonly context: 32000;
};
declare const EXAONE3_5_32b: {
    readonly name: "exaone3.5:32b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "19gb";
    readonly context: 32000;
};
export declare const EXAONE3_5MODELS: readonly ["exaone3.5:latest", "exaone3.5:2.4b", "exaone3.5:7.8b", "exaone3.5:32b"];
export type Exaone3_5ChatModelProviderOptionsByName = {
    [EXAONE3_5_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [EXAONE3_5_2_4b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [EXAONE3_5_7_1b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [EXAONE3_5_32b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type Exaone3_5ModelInputModalitiesByName = {
    [EXAONE3_5_LATEST.name]: typeof EXAONE3_5_LATEST.supports.input;
    [EXAONE3_5_2_4b.name]: typeof EXAONE3_5_2_4b.supports.input;
    [EXAONE3_5_7_1b.name]: typeof EXAONE3_5_7_1b.supports.input;
    [EXAONE3_5_32b.name]: typeof EXAONE3_5_32b.supports.input;
};
export {};
