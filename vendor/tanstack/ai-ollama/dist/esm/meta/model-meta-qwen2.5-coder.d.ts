import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageTools } from './models-meta.js';
declare const QWEN2_5_CODER_LATEST: {
    readonly name: "qwen2.5-coder:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "4.7gb";
    readonly context: 32000;
};
declare const QWEN2_5_CODER_0_5b: {
    readonly name: "qwen2.5-coder:0.5b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "398mb";
    readonly context: 32000;
};
declare const QWEN2_5_CODER_1_5b: {
    readonly name: "qwen2.5-coder:1.5b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "986mb";
    readonly context: 32000;
};
declare const QWEN2_5_CODER_3b: {
    readonly name: "qwen2.5-coder:3b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "1.9gb";
    readonly context: 32000;
};
declare const QWEN2_5_CODER_7b: {
    readonly name: "qwen2.5-coder:7b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "4.7gb";
    readonly context: 32000;
};
declare const QWEN2_5_CODER_14b: {
    readonly name: "qwen2.5-coder:14b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "9gb";
    readonly context: 32000;
};
declare const QWEN2_5_CODER_32b: {
    readonly name: "qwen2.5-coder:32b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "20gb";
    readonly context: 32000;
};
export declare const QWEN2_5_CODER_MODELS: readonly ["qwen2.5-coder:latest", "qwen2.5-coder:0.5b", "qwen2.5-coder:1.5b", "qwen2.5-coder:3b", "qwen2.5-coder:7b", "qwen2.5-coder:14b", "qwen2.5-coder:32b"];
export type Qwen2_5CoderChatModelProviderOptionsByName = {
    [QWEN2_5_CODER_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [QWEN2_5_CODER_0_5b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [QWEN2_5_CODER_1_5b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [QWEN2_5_CODER_3b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [QWEN2_5_CODER_7b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [QWEN2_5_CODER_14b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [QWEN2_5_CODER_32b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
};
export type Qwen2_5CoderModelInputModalitiesByName = {
    [QWEN2_5_CODER_LATEST.name]: typeof QWEN2_5_CODER_LATEST.supports.input;
    [QWEN2_5_CODER_0_5b.name]: typeof QWEN2_5_CODER_0_5b.supports.input;
    [QWEN2_5_CODER_1_5b.name]: typeof QWEN2_5_CODER_1_5b.supports.input;
    [QWEN2_5_CODER_3b.name]: typeof QWEN2_5_CODER_3b.supports.input;
    [QWEN2_5_CODER_7b.name]: typeof QWEN2_5_CODER_7b.supports.input;
    [QWEN2_5_CODER_14b.name]: typeof QWEN2_5_CODER_14b.supports.input;
    [QWEN2_5_CODER_32b.name]: typeof QWEN2_5_CODER_32b.supports.input;
};
export {};
