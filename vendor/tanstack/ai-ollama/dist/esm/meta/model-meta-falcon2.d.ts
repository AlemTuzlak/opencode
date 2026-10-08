import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const FALCON2_LATEST: {
    readonly name: "falcon2:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "6.4gb";
    readonly context: 2000;
};
declare const FALCON2_11b: {
    readonly name: "falcon2:11b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "6.4gb";
    readonly context: 2000;
};
export declare const FALCON2_MODELS: readonly ["falcon2:latest", "falcon2:11b"];
export type Falcon2ChatModelProviderOptionsByName = {
    [FALCON2_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [FALCON2_11b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type Falcon2ModelInputModalitiesByName = {
    [FALCON2_LATEST.name]: typeof FALCON2_LATEST.supports.input;
    [FALCON2_11b.name]: typeof FALCON2_11b.supports.input;
};
export {};
