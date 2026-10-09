import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageTools } from './models-meta.js';
declare const DEEPSEEK_V3_1_LATEST: {
    readonly name: "deepseek-v3.1:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["thinking", "tools"];
    };
    readonly size: "404gb";
    readonly context: 160000;
};
declare const DEEPSEEK_V3_1_671b: {
    readonly name: "deepseek-v3.1:671b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["thinking", "tools"];
    };
    readonly size: "404gb";
    readonly context: 160000;
};
declare const DEEPSEEK_V3_1_671b_cloud: {
    readonly name: "deepseek-v3.1:671b-cloud";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["thinking", "tools"];
    };
    readonly size: "404gb";
    readonly context: 160000;
};
export declare const DEEPSEEK_V3_1_MODELS: readonly ["deepseek-v3.1:latest", "deepseek-v3.1:671b", "deepseek-v3.1:671b-cloud"];
export type Deepseekv3_1ChatModelProviderOptionsByName = {
    [DEEPSEEK_V3_1_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [DEEPSEEK_V3_1_671b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
    [DEEPSEEK_V3_1_671b_cloud.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools> & OllamaChatRequestTools;
};
export type Deepseekv3_1ModelInputModalitiesByName = {
    [DEEPSEEK_V3_1_LATEST.name]: typeof DEEPSEEK_V3_1_LATEST.supports.input;
    [DEEPSEEK_V3_1_671b.name]: typeof DEEPSEEK_V3_1_671b.supports.input;
    [DEEPSEEK_V3_1_671b_cloud.name]: typeof DEEPSEEK_V3_1_671b_cloud.supports.input;
};
export {};
