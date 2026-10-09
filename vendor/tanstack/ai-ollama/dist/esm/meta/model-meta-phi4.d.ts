import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const PHI4_LATEST: {
    readonly name: "phi4:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "9.1gb";
    readonly context: 16000;
};
declare const PHI4_14b: {
    readonly name: "phi4:14b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "9.1gb";
    readonly context: 16000;
};
export declare const PHI4_MODELS: readonly ["phi4:latest", "phi4:14b"];
export type Phi4ChatModelProviderOptionsByName = {
    [PHI4_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [PHI4_14b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type Phi4ModelInputModalitiesByName = {
    [PHI4_LATEST.name]: typeof PHI4_LATEST.supports.input;
    [PHI4_14b.name]: typeof PHI4_14b.supports.input;
};
export {};
