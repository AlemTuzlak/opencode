import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const OLMO2_LATEST: {
    readonly name: "olmo2:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.5gb";
    readonly context: 4000;
};
declare const OLMO2_7b: {
    readonly name: "olmo2:7b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.5gb";
    readonly context: 4000;
};
declare const OLMO2_13b: {
    readonly name: "olmo2:13b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "8.4gb";
    readonly context: 4000;
};
export declare const OLMO2_MODELS: readonly ["olmo2:latest", "olmo2:7b", "olmo2:13b"];
export type Olmo2ChatModelProviderOptionsByName = {
    [OLMO2_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [OLMO2_7b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [OLMO2_13b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type Olmo2ModelInputModalitiesByName = {
    [OLMO2_LATEST.name]: typeof OLMO2_LATEST.supports.input;
    [OLMO2_7b.name]: typeof OLMO2_7b.supports.input;
    [OLMO2_13b.name]: typeof OLMO2_13b.supports.input;
};
export {};
