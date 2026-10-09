import { OllamaChatRequest, OllamaChatRequestMessages } from './models-meta.js';
declare const QWEN_LATEST: {
    readonly name: "qwen:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "2.3gb";
    readonly context: 32000;
};
declare const QWEN_0_5b: {
    readonly name: "qwen:0.5b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "395mb";
    readonly context: 32000;
};
declare const QWEN_1_8b: {
    readonly name: "qwen:1.8b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "1.1gb";
    readonly context: 32000;
};
declare const QWEN_4b: {
    readonly name: "qwen:4b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "2.3gb";
    readonly context: 32000;
};
declare const QWEN_7b: {
    readonly name: "qwen:7b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "4.5gb";
    readonly context: 32000;
};
declare const QWEN_14b: {
    readonly name: "qwen:14b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "8.2gb";
    readonly context: 32000;
};
declare const QWEN_32b: {
    readonly name: "qwen:32b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "18gb";
    readonly context: 32000;
};
declare const QWEN_72b: {
    readonly name: "qwen:72b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "41gb";
    readonly context: 32000;
};
declare const QWEN_110b: {
    readonly name: "qwen:110b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: [];
    };
    readonly size: "63gb";
    readonly context: 32000;
};
export declare const QWEN_MODELS: readonly ["qwen:latest", "qwen:0.5b", "qwen:1.8b", "qwen:4b", "qwen:7b", "qwen:14b", "qwen:32b", "qwen:72b", "qwen:110b"];
export type QwenChatModelProviderOptionsByName = {
    [QWEN_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [QWEN_0_5b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [QWEN_1_8b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [QWEN_4b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [QWEN_7b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [QWEN_14b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [QWEN_32b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [QWEN_72b.name]: OllamaChatRequest & OllamaChatRequestMessages;
    [QWEN_110b.name]: OllamaChatRequest & OllamaChatRequestMessages;
};
export type QwenModelInputModalitiesByName = {
    [QWEN_LATEST.name]: typeof QWEN_LATEST.supports.input;
    [QWEN_0_5b.name]: typeof QWEN_0_5b.supports.input;
    [QWEN_1_8b.name]: typeof QWEN_1_8b.supports.input;
    [QWEN_4b.name]: typeof QWEN_4b.supports.input;
    [QWEN_7b.name]: typeof QWEN_7b.supports.input;
    [QWEN_14b.name]: typeof QWEN_14b.supports.input;
    [QWEN_32b.name]: typeof QWEN_32b.supports.input;
    [QWEN_72b.name]: typeof QWEN_72b.supports.input;
    [QWEN_110b.name]: typeof QWEN_110b.supports.input;
};
export {};
