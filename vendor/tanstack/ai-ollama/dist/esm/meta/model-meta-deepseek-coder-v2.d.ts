import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const DEEPSEEK_CODER_V2_LATEST: {
    readonly name: "deepseek-coder-v2:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "8.9gb";
    readonly context: 160000;
};
declare const DEEPSEEK_CODER_V2_16b: {
    readonly name: "deepseek-coder-v2:16b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "8.9gb";
    readonly context: 160000;
};
declare const DEEPSEEK_CODER_V2_236b: {
    readonly name: "deepseek-coder-v2:236b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "133gb";
    readonly context: 4000;
};
export declare const DEEPSEEK_CODER_V2_MODELS: readonly ["deepseek-coder-v2:latest", "deepseek-coder-v2:16b", "deepseek-coder-v2:236b"];
export type DeepseekCoderV2ChatModelProviderOptionsByName = {
    [DEEPSEEK_CODER_V2_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [DEEPSEEK_CODER_V2_16b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [DEEPSEEK_CODER_V2_236b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type DeepseekCoderV2ModelInputModalitiesByName = {
    [DEEPSEEK_CODER_V2_LATEST.name]: typeof DEEPSEEK_CODER_V2_LATEST.supports.input;
    [DEEPSEEK_CODER_V2_16b.name]: typeof DEEPSEEK_CODER_V2_16b.supports.input;
    [DEEPSEEK_CODER_V2_236b.name]: typeof DEEPSEEK_CODER_V2_236b.supports.input;
};
export {};
