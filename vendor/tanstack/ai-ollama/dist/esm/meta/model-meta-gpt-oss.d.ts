import { OllamaChatRequest, OllamaChatRequestMessages, OllamaChatRequestTools, OllamaMessageThinking, OllamaMessageTools } from './models-meta.js';
declare const OPT_OSS_LATEST: {
    readonly name: "gpt-oss:latest";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools", "thinking"];
    };
    readonly size: "14gb";
    readonly context: 128000;
};
declare const OPT_OSS_20b: {
    readonly name: "gpt-oss:20b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools", "thinking"];
    };
    readonly size: "14gb";
    readonly context: 128000;
};
declare const OPT_OSS_120b: {
    readonly name: "gpt-oss:120b";
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly capabilities: ["tools", "thinking"];
    };
    readonly size: "65gb";
    readonly context: 128000;
};
export declare const GPT_OSS_MODELS: readonly ["gpt-oss:latest", "gpt-oss:20b", "gpt-oss:120b"];
export type GptOssChatModelProviderOptionsByName = {
    [OPT_OSS_LATEST.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools & OllamaMessageThinking> & OllamaChatRequestTools;
    [OPT_OSS_20b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools & OllamaMessageThinking> & OllamaChatRequestTools;
    [OPT_OSS_120b.name]: OllamaChatRequest & OllamaChatRequestMessages<OllamaMessageTools & OllamaMessageThinking> & OllamaChatRequestTools;
};
export type GptOssModelInputModalitiesByName = {
    [OPT_OSS_LATEST.name]: typeof OPT_OSS_LATEST.supports.input;
    [OPT_OSS_20b.name]: typeof OPT_OSS_20b.supports.input;
    [OPT_OSS_120b.name]: typeof OPT_OSS_120b.supports.input;
};
export {};
