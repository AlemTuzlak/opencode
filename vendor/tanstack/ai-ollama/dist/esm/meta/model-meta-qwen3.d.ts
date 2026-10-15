import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageThinking, OllamaMessageTools } from './models-meta.js';
declare const QWEN3_LATEST: {
    readonly name: "qwen3:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["thinking", "tools"];
    };
    readonly size: "5.2gb";
    readonly context: 40000;
};
declare const QWEN3_0_6b: {
    readonly name: "qwen3:0.6b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["thinking", "tools"];
    };
    readonly size: "523mb";
    readonly context: 40000;
};
declare const QWEN3_1_7b: {
    readonly name: "qwen3:1.7b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["thinking", "tools"];
    };
    readonly size: "1.4gb";
    readonly context: 40000;
};
declare const QWEN3_4b: {
    readonly name: "qwen3:4b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["thinking", "tools"];
    };
    readonly size: "2.5gb";
    readonly context: 256000;
};
declare const QWEN3_8b: {
    readonly name: "qwen3:8b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["thinking", "tools"];
    };
    readonly size: "5.2gb";
    readonly context: 40000;
};
declare const QWEN3_14b: {
    readonly name: "qwen3:14b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["thinking", "tools"];
    };
    readonly size: "9.3gb";
    readonly context: 40000;
};
declare const QWEN3_30b: {
    readonly name: "qwen3:30b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["thinking", "tools"];
    };
    readonly size: "19gb";
    readonly context: 256000;
};
declare const QWEN3_32b: {
    readonly name: "qwen3:32b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["thinking", "tools"];
    };
    readonly size: "20gb";
    readonly context: 40000;
};
declare const QWEN3_235b: {
    readonly name: "qwen3:235b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["thinking", "tools"];
    };
    readonly size: "142gb";
    readonly context: 256000;
};
export declare const QWEN3_MODELS: readonly ["qwen3:latest", "qwen3:0.6b", "qwen3:1.7b", "qwen3:4b", "qwen3:8b", "qwen3:14b", "qwen3:30b", "qwen3:32b", "qwen3:235b"];
export type Qwen3ChatModelProviderOptionsByName = {
    [QWEN3_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools & OllamaMessageThinking> & OllamaChatRequestTools;
    [QWEN3_0_6b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools & OllamaMessageThinking> & OllamaChatRequestTools;
    [QWEN3_1_7b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools & OllamaMessageThinking> & OllamaChatRequestTools;
    [QWEN3_4b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools & OllamaMessageThinking> & OllamaChatRequestTools;
    [QWEN3_8b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools & OllamaMessageThinking> & OllamaChatRequestTools;
    [QWEN3_14b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools & OllamaMessageThinking> & OllamaChatRequestTools;
    [QWEN3_30b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools & OllamaMessageThinking> & OllamaChatRequestTools;
    [QWEN3_32b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools & OllamaMessageThinking> & OllamaChatRequestTools;
    [QWEN3_235b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools & OllamaMessageThinking> & OllamaChatRequestTools;
};
export type Qwen3ModelInputModalitiesByName = {
    [QWEN3_LATEST.name]: typeof QWEN3_LATEST.supports.input;
    [QWEN3_0_6b.name]: typeof QWEN3_0_6b.supports.input;
    [QWEN3_1_7b.name]: typeof QWEN3_1_7b.supports.input;
    [QWEN3_4b.name]: typeof QWEN3_4b.supports.input;
    [QWEN3_8b.name]: typeof QWEN3_8b.supports.input;
    [QWEN3_14b.name]: typeof QWEN3_14b.supports.input;
    [QWEN3_30b.name]: typeof QWEN3_30b.supports.input;
    [QWEN3_32b.name]: typeof QWEN3_32b.supports.input;
    [QWEN3_235b.name]: typeof QWEN3_235b.supports.input;
};
export {};
