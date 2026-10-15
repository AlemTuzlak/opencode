import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const PHI3_LATEST: {
    readonly name: "phi3:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "2.2gb";
    readonly context: 128000;
};
declare const PHI3_3_8b: {
    readonly name: "phi3:8b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "2.2gb";
    readonly context: 128000;
};
declare const PHI3_14b: {
    readonly name: "phi3:14b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "7.9gb";
    readonly context: 128000;
};
export declare const PHI3_MODELS: readonly ["phi3:latest", "phi3:8b", "phi3:14b"];
export type Phi3ChatModelProviderOptionsByName = {
    [PHI3_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [PHI3_3_8b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [PHI3_14b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type Phi3ModelInputModalitiesByName = {
    [PHI3_LATEST.name]: typeof PHI3_LATEST.supports.input;
    [PHI3_3_8b.name]: typeof PHI3_3_8b.supports.input;
    [PHI3_14b.name]: typeof PHI3_14b.supports.input;
};
export {};
