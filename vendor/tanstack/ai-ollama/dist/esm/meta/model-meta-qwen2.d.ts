import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageTools } from './models-meta.js';
declare const QWEN2_LATEST: {
    readonly name: "qwen2:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "4.4gb";
    readonly context: 32000;
};
declare const QWEN2_0_5b: {
    readonly name: "qwen2:0.5b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "352mb";
    readonly context: 32000;
};
declare const QWEN2_1_5b: {
    readonly name: "qwen2:1.5b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "935mb";
    readonly context: 32000;
};
declare const QWEN2_7b: {
    readonly name: "qwen2:7b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "4.4gb";
    readonly context: 32000;
};
declare const QWEN2_72b: {
    readonly name: "qwen2:72b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "41gb";
    readonly context: 32000;
};
export declare const QWEN2_MODELS: readonly ["qwen2:latest", "qwen2:0.5b", "qwen2:1.5b", "qwen2:7b", "qwen2:72b"];
export type Qwen2ChatModelProviderOptionsByName = {
    [QWEN2_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [QWEN2_0_5b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [QWEN2_1_5b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [QWEN2_7b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [QWEN2_72b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
};
export type Qwen2ModelInputModalitiesByName = {
    [QWEN2_LATEST.name]: typeof QWEN2_LATEST.supports.input;
    [QWEN2_0_5b.name]: typeof QWEN2_0_5b.supports.input;
    [QWEN2_1_5b.name]: typeof QWEN2_1_5b.supports.input;
    [QWEN2_7b.name]: typeof QWEN2_7b.supports.input;
    [QWEN2_72b.name]: typeof QWEN2_72b.supports.input;
};
export {};
