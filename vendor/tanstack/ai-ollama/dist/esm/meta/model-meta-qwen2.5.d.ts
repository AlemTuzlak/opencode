import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageTools } from './models-meta.js';
declare const QWEN2_5_LATEST: {
    readonly name: "qwen2.5:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "4.7gb";
    readonly context: 32000;
};
declare const QWEN2_5_0_5b: {
    readonly name: "qwen2.5:0.5b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "398mb";
    readonly context: 32000;
};
declare const QWEN2_5_1_5b: {
    readonly name: "qwen2.5:1.5b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "986mb";
    readonly context: 32000;
};
declare const QWEN2_5_3b: {
    readonly name: "qwen2.5:3b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "1.9gb";
    readonly context: 32000;
};
declare const QWEN2_5_7b: {
    readonly name: "qwen2.5:7b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "4.7gb";
    readonly context: 32000;
};
declare const QWEN2_5_14b: {
    readonly name: "qwen2.5:14b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "9gb";
    readonly context: 32000;
};
declare const QWEN2_5_32b: {
    readonly name: "qwen2.5:32b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "20gb";
    readonly context: 32000;
};
declare const QWEN2_5_72b: {
    readonly name: "qwen2.5:72b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools"];
    };
    readonly size: "47gb";
    readonly context: 32000;
};
export declare const QWEN2_5_MODELS: readonly ["qwen2.5:latest", "qwen2.5:0.5b", "qwen2.5:1.5b", "qwen2.5:3b", "qwen2.5:7b", "qwen2.5:32b", "qwen2.5:72b"];
export type Qwen2_5ChatModelProviderOptionsByName = {
    [QWEN2_5_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [QWEN2_5_0_5b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [QWEN2_5_1_5b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [QWEN2_5_3b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [QWEN2_5_7b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [QWEN2_5_14b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [QWEN2_5_32b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [QWEN2_5_72b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
};
export type Qwen2_5ModelInputModalitiesByName = {
    [QWEN2_5_LATEST.name]: typeof QWEN2_5_LATEST.supports.input;
    [QWEN2_5_0_5b.name]: typeof QWEN2_5_0_5b.supports.input;
    [QWEN2_5_1_5b.name]: typeof QWEN2_5_1_5b.supports.input;
    [QWEN2_5_3b.name]: typeof QWEN2_5_3b.supports.input;
    [QWEN2_5_7b.name]: typeof QWEN2_5_7b.supports.input;
    [QWEN2_5_14b.name]: typeof QWEN2_5_7b.supports.input;
    [QWEN2_5_32b.name]: typeof QWEN2_5_32b.supports.input;
    [QWEN2_5_72b.name]: typeof QWEN2_5_72b.supports.input;
};
export {};
