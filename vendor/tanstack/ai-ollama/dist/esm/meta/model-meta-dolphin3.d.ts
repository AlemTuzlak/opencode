import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const DOLPHIN3_LATEST: {
    readonly name: "dolphin3:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.9gb";
    readonly context: 128000;
};
declare const DOLPHIN3_8b: {
    readonly name: "dolphin3:8b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.9gb";
    readonly context: 128000;
};
export declare const DOLPHIN3_MODELS: readonly ["dolphin3:latest", "dolphin3:8b"];
export type Dolphin3ChatModelProviderOptionsByName = {
    [DOLPHIN3_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [DOLPHIN3_8b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type Dolphin3ModelInputModalitiesByName = {
    [DOLPHIN3_LATEST.name]: typeof DOLPHIN3_LATEST.supports.input;
    [DOLPHIN3_8b.name]: typeof DOLPHIN3_8b.supports.input;
};
export {};
