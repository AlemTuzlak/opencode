import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const MARCO_O1_LATEST: {
    readonly name: "marco-o1:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.7gb";
    readonly context: 32000;
};
declare const MARCO_O1_7b: {
    readonly name: "marco-o1:7b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.7gb";
    readonly context: 32000;
};
export declare const MARCO_O1_MODELS: readonly ["marco-o1:latest", "marco-o1:7b"];
export type MarcoO1ChatModelProviderOptionsByName = {
    [MARCO_O1_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [MARCO_O1_7b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type MarcoO1ModelInputModalitiesByName = {
    [MARCO_O1_LATEST.name]: typeof MARCO_O1_LATEST.supports.input;
    [MARCO_O1_7b.name]: typeof MARCO_O1_7b.supports.input;
};
export {};
