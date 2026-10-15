import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageThinking, OllamaMessageTools } from './models-meta.js';
declare const DEEPSEEK_R1_LATEST: {
    readonly name: "deepseek-r1:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["thinking", "tools"];
    };
    readonly size: "5.2gb";
    readonly context: 128000;
};
declare const DEEPSEEK_R1_1_5b: {
    readonly name: "deepseek-r1:1.5b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["thinking", "tools"];
    };
    readonly size: "1.1gb";
    readonly context: 128000;
};
declare const DEEPSEEK_R1_7b: {
    readonly name: "deepseek-r1:7b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["thinking", "tools"];
    };
    readonly size: "4.7gb";
    readonly context: 128000;
};
declare const DEEPSEEK_R1_8b: {
    readonly name: "deepseek-r1:8b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["thinking", "tools"];
    };
    readonly size: "5.2gb";
    readonly context: 128000;
};
declare const DEEPSEEK_R1_32b: {
    readonly name: "deepseek-r1:32b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["thinking", "tools"];
    };
    readonly size: "20gb";
    readonly context: 128000;
};
declare const DEEPSEEK_R1_70b: {
    readonly name: "deepseek-r1:70b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["thinking", "tools"];
    };
    readonly size: "43gb";
    readonly context: 128000;
};
declare const DEEPSEEK_R1_671b: {
    readonly name: "deepseek-r1:671b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["thinking", "tools"];
    };
    readonly size: "404gb";
    readonly context: 160000;
};
export declare const DEEPSEEK_R1_MODELS: readonly ["deepseek-r1:latest", "deepseek-r1:1.5b", "deepseek-r1:7b", "deepseek-r1:8b", "deepseek-r1:32b", "deepseek-r1:70b", "deepseek-r1:671b"];
export type DeepseekR1ChatModelProviderOptionsByName = {
    [DEEPSEEK_R1_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools & OllamaMessageThinking> & OllamaChatRequestTools;
    [DEEPSEEK_R1_1_5b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools & OllamaMessageThinking> & OllamaChatRequestTools;
    [DEEPSEEK_R1_7b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools & OllamaMessageThinking> & OllamaChatRequestTools;
    [DEEPSEEK_R1_8b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools & OllamaMessageThinking> & OllamaChatRequestTools;
    [DEEPSEEK_R1_32b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools & OllamaMessageThinking> & OllamaChatRequestTools;
    [DEEPSEEK_R1_70b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools & OllamaMessageThinking> & OllamaChatRequestTools;
    [DEEPSEEK_R1_671b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools & OllamaMessageThinking> & OllamaChatRequestTools;
};
export type DeepseekR1ModelInputModalitiesByName = {
    [DEEPSEEK_R1_LATEST.name]: typeof DEEPSEEK_R1_LATEST.supports.input;
    [DEEPSEEK_R1_1_5b.name]: typeof DEEPSEEK_R1_1_5b.supports.input;
    [DEEPSEEK_R1_7b.name]: typeof DEEPSEEK_R1_7b.supports.input;
    [DEEPSEEK_R1_8b.name]: typeof DEEPSEEK_R1_8b.supports.input;
    [DEEPSEEK_R1_32b.name]: typeof DEEPSEEK_R1_32b.supports.input;
    [DEEPSEEK_R1_70b.name]: typeof DEEPSEEK_R1_70b.supports.input;
    [DEEPSEEK_R1_671b.name]: typeof DEEPSEEK_R1_671b.supports.input;
};
export {};
