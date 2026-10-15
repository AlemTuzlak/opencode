import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const OPENCODER_LATEST: {
    readonly name: "opencoder:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.7gb";
    readonly context: 8000;
};
declare const OPENCODER_1_5b: {
    readonly name: "opencoder:1.5b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "1.4gb";
    readonly context: 4000;
};
declare const OPENCODER_8b: {
    readonly name: "opencoder:8b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.7gb";
    readonly context: 8000;
};
export declare const OPENCODER_MODELS: readonly ["opencoder:latest", "opencoder:1.5b", "opencoder:8b"];
export type OpencoderChatModelProviderOptionsByName = {
    [OPENCODER_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [OPENCODER_1_5b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [OPENCODER_8b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type OpencoderModelInputModalitiesByName = {
    [OPENCODER_LATEST.name]: typeof OPENCODER_LATEST.supports.input;
    [OPENCODER_1_5b.name]: typeof OPENCODER_1_5b.supports.input;
    [OPENCODER_8b.name]: typeof OPENCODER_8b.supports.input;
};
export {};
