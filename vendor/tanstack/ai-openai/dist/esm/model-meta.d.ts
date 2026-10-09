import { MidConversationChannels, Modality } from '@tanstack/ai';
import { OpenAIBaseOptions, OpenAIMetadataOptions, OpenAIStreamingOptions, OpenAIStructuredOutputOptions, OpenAIToolsOptions } from './text/text-provider-options.js';
import { OpenAIEmbeddingProviderOptions } from './embedding/embedding-provider-options.js';
declare const GPT5_2: {
    readonly name: "gpt-5.2";
    readonly context_window: 400000;
    readonly max_output_tokens: 128000;
    readonly knowledge_cutoff: "2025-08-31";
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs", "distillation"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 1.75;
            readonly cached: 0.175;
        };
        readonly output: {
            readonly normal: 14;
        };
    };
};
declare const GPT5_2_PRO: {
    readonly name: "gpt-5.2-pro";
    readonly context_window: 400000;
    readonly max_output_tokens: 128000;
    readonly knowledge_cutoff: "2025-08-31";
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 21;
        };
        readonly output: {
            readonly normal: 168;
        };
    };
};
declare const GPT5_2_CHAT: {
    readonly name: "gpt-5.2-chat-latest";
    readonly context_window: 128000;
    readonly max_output_tokens: 16384;
    readonly knowledge_cutoff: "2025-08-31";
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 1.75;
            readonly cached: 0.175;
        };
        readonly output: {
            readonly normal: 14;
        };
    };
};
declare const GPT5_1: {
    readonly name: "gpt-5.1";
    readonly context_window: 400000;
    readonly max_output_tokens: 128000;
    readonly knowledge_cutoff: "2024-09-30";
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text", "image"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs", "distillation"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 1.25;
            readonly cached: 0.125;
        };
        readonly output: {
            readonly normal: 10;
        };
    };
};
declare const GPT5_1_CODEX: {
    readonly name: "gpt-5.1-codex";
    readonly context_window: 400000;
    readonly max_output_tokens: 128000;
    readonly knowledge_cutoff: "2024-09-30";
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text", "image"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "function_calling", "structured_outputs"];
        readonly tools: ["file_search", "code_interpreter", "mcp", "local_shell", "shell", "apply_patch"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 1.25;
            readonly cached: 0.125;
        };
        readonly output: {
            readonly normal: 10;
        };
    };
};
declare const GPT5: {
    readonly name: "gpt-5";
    readonly context_window: 400000;
    readonly max_output_tokens: 128000;
    readonly knowledge_cutoff: "2024-09-30";
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions", "batch"];
        readonly features: ["streaming", "function_calling", "structured_outputs", "distillation"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 1.25;
            readonly cached: 0.125;
        };
        readonly output: {
            readonly normal: 10;
        };
    };
};
declare const GPT5_MINI: {
    readonly name: "gpt-5-mini";
    readonly context_window: 400000;
    readonly max_output_tokens: 128000;
    readonly knowledge_cutoff: "2024-05-31";
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions", "batch"];
        readonly features: ["streaming", "structured_outputs", "function_calling"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 0.25;
            readonly cached: 0.025;
        };
        readonly output: {
            readonly normal: 2;
        };
    };
};
declare const GPT5_NANO: {
    readonly name: "gpt-5-nano";
    readonly context_window: 400000;
    readonly max_output_tokens: 128000;
    readonly knowledge_cutoff: "2024-05-31";
    readonly pricing: {
        readonly input: {
            readonly normal: 0.05;
            readonly cached: 0.005;
        };
        readonly output: {
            readonly normal: 0.4;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions", "batch"];
        readonly features: ["streaming", "structured_outputs", "function_calling"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
};
declare const GPT5_PRO: {
    readonly name: "gpt-5-pro";
    readonly context_window: 400000;
    readonly max_output_tokens: 272000;
    readonly knowledge_cutoff: "2024-09-30";
    readonly pricing: {
        readonly input: {
            readonly normal: 15;
        };
        readonly output: {
            readonly normal: 120;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "batch"];
        readonly features: ["streaming", "structured_outputs", "function_calling"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
};
declare const GPT5_CODEX: {
    readonly name: "gpt-5-codex";
    readonly context_window: 400000;
    readonly max_output_tokens: 128000;
    readonly knowledge_cutoff: "2024-09-30";
    readonly pricing: {
        readonly input: {
            readonly normal: 1.25;
            readonly cached: 0.125;
        };
        readonly output: {
            readonly normal: 10;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text", "image"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "structured_outputs", "function_calling"];
        readonly tools: ["file_search", "code_interpreter", "mcp", "local_shell", "shell", "apply_patch"];
    };
};
declare const O3_DEEP_RESEARCH: {
    readonly name: "o3-deep-research";
    readonly context_window: 200000;
    readonly max_output_tokens: 100000;
    readonly knowledge_cutoff: "2024-01-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 10;
            readonly cached: 2.5;
        };
        readonly output: {
            readonly normal: 40;
        };
    };
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "batch"];
        readonly features: ["streaming"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
};
declare const O4_MINI_DEEP_RESEARCH: {
    readonly name: "o4-mini-deep-research";
    readonly context_window: 200000;
    readonly max_output_tokens: 100000;
    readonly knowledge_cutoff: "2024-01-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 2;
            readonly cached: 0.5;
        };
        readonly output: {
            readonly normal: 8;
        };
    };
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "batch"];
        readonly features: ["streaming"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
};
declare const O3_PRO: {
    readonly name: "o3-pro";
    readonly context_window: 200000;
    readonly max_output_tokens: 100000;
    readonly knowledge_cutoff: "2024-01-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 20;
        };
        readonly output: {
            readonly normal: 80;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "batch"];
        readonly features: ["function_calling", "structured_outputs"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
};
declare const GPT_AUDIO: {
    readonly name: "gpt-audio";
    readonly context_window: 128000;
    readonly max_output_tokens: 16384;
    readonly knowledge_cutoff: "2023-10-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 2.5;
        };
        readonly output: {
            readonly normal: 10;
        };
    };
    readonly supports: {
        readonly input: ["text", "audio"];
        readonly output: ["text", "audio"];
        readonly endpoints: ["chat-completions"];
        readonly features: ["function_calling"];
        readonly tools: [];
    };
};
declare const GPT_AUDIO_MINI: {
    readonly name: "gpt-audio-mini";
    readonly context_window: 128000;
    readonly max_output_tokens: 16384;
    readonly knowledge_cutoff: "2023-10-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 0.6;
        };
        readonly output: {
            readonly normal: 2.4;
        };
    };
    readonly supports: {
        readonly input: ["text", "audio"];
        readonly output: ["text", "audio"];
        readonly endpoints: ["chat-completions"];
        readonly features: ["function_calling"];
        readonly tools: [];
    };
};
declare const O3: {
    readonly name: "o3";
    readonly context_window: 200000;
    readonly max_output_tokens: 100000;
    readonly knowledge_cutoff: "2024-01-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 2;
            readonly cached: 0.5;
        };
        readonly output: {
            readonly normal: 8;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "batch", "chat-completions"];
        readonly features: ["function_calling", "structured_outputs", "streaming"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
};
declare const O4_MINI: {
    readonly name: "o4-mini";
    readonly context_window: 200000;
    readonly max_output_tokens: 100000;
    readonly knowledge_cutoff: "2024-01-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 1.1;
            readonly cached: 0.275;
        };
        readonly output: {
            readonly normal: 4.4;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "batch", "chat-completions", "fine-tuning"];
        readonly features: ["function_calling", "structured_outputs", "streaming", "fine_tuning"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
};
declare const GPT4_1: {
    readonly name: "gpt-4.1";
    readonly context_window: 1047576;
    readonly max_output_tokens: 32768;
    readonly knowledge_cutoff: "2024-01-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 2;
            readonly cached: 0.5;
        };
        readonly output: {
            readonly normal: 8;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions", "assistants", "fine-tuning", "batch"];
        readonly features: ["streaming", "function_calling", "structured_outputs", "distillation", "fine_tuning"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
};
declare const GPT4_1_MINI: {
    readonly name: "gpt-4.1-mini";
    readonly context_window: 1047576;
    readonly max_output_tokens: 32768;
    readonly knowledge_cutoff: "2024-01-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 0.4;
            readonly cached: 0.1;
        };
        readonly output: {
            readonly normal: 1.6;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions", "assistants", "fine-tuning", "batch"];
        readonly features: ["streaming", "function_calling", "structured_outputs", "fine_tuning"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
};
declare const GPT4_1_NANO: {
    readonly name: "gpt-4.1-nano";
    readonly context_window: 1047576;
    readonly max_output_tokens: 32768;
    readonly knowledge_cutoff: "2024-01-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 0.1;
            readonly cached: 0.025;
        };
        readonly output: {
            readonly normal: 0.4;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions", "assistants", "fine-tuning", "batch"];
        readonly features: ["streaming", "function_calling", "structured_outputs", "fine_tuning", "predicted_outcomes"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
};
declare const O1_PRO: {
    readonly name: "o1-pro";
    readonly context_window: 200000;
    readonly max_output_tokens: 100000;
    readonly knowledge_cutoff: "2023-10-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 150;
        };
        readonly output: {
            readonly normal: 600;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "batch"];
        readonly features: ["function_calling", "structured_outputs"];
        readonly tools: ["file_search", "code_interpreter", "mcp"];
    };
};
declare const COMPUTER_USE_PREVIEW: {
    readonly name: "computer-use-preview";
    readonly context_window: 8192;
    readonly max_output_tokens: 1024;
    readonly knowledge_cutoff: "2023-10-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 3;
        };
        readonly output: {
            readonly normal: 12;
        };
    };
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "batch"];
        readonly features: ["function_calling"];
        readonly tools: ["computer_use"];
    };
};
declare const GPT_4O_MINI_SEARCH_PREVIEW: {
    readonly name: "gpt-4o-mini-search-preview";
    readonly context_window: 128000;
    readonly max_output_tokens: 16384;
    readonly knowledge_cutoff: "2023-10-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 0.15;
        };
        readonly output: {
            readonly normal: 0.6;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat-completions"];
        readonly features: ["streaming", "structured_outputs"];
        readonly tools: ["web_search_preview"];
    };
};
declare const GPT_4O_SEARCH_PREVIEW: {
    readonly name: "gpt-4o-search-preview";
    readonly context_window: 128000;
    readonly max_output_tokens: 16384;
    readonly knowledge_cutoff: "2023-10-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 2.5;
        };
        readonly output: {
            readonly normal: 10;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat-completions"];
        readonly features: ["streaming", "structured_outputs"];
        readonly tools: ["web_search_preview"];
    };
};
declare const O3_MINI: {
    readonly name: "o3-mini";
    readonly context_window: 200000;
    readonly max_output_tokens: 100000;
    readonly knowledge_cutoff: "2023-10-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 1.1;
            readonly cached: 0.55;
        };
        readonly output: {
            readonly normal: 4.4;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "batch", "chat-completions", "assistants"];
        readonly features: ["function_calling", "structured_outputs", "streaming"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
};
declare const GPT_4O_MINI_AUDIO: {
    readonly name: "gpt-4o-mini-audio";
    readonly context_window: 128000;
    readonly max_output_tokens: 16384;
    readonly knowledge_cutoff: "2023-10-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 0.15;
        };
        readonly output: {
            readonly normal: 0.6;
        };
    };
    readonly supports: {
        readonly input: ["text", "audio"];
        readonly output: ["text", "audio"];
        readonly endpoints: ["chat-completions"];
        readonly features: ["function_calling", "streaming"];
        readonly tools: [];
    };
};
declare const O1: {
    readonly name: "o1";
    readonly context_window: 200000;
    readonly max_output_tokens: 100000;
    readonly knowledge_cutoff: "2023-10-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 15;
            readonly cached: 7.5;
        };
        readonly output: {
            readonly normal: 60;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "batch", "chat-completions", "assistants"];
        readonly features: ["function_calling", "structured_outputs", "streaming"];
        readonly tools: ["file_search", "code_interpreter", "mcp"];
    };
};
declare const GPT_4O: {
    readonly name: "gpt-4o";
    readonly context_window: 128000;
    readonly max_output_tokens: 16384;
    readonly knowledge_cutoff: "2023-10-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 2.5;
            readonly cached: 1.25;
        };
        readonly output: {
            readonly normal: 10;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions", "assistants", "fine-tuning", "batch"];
        readonly features: ["streaming", "function_calling", "structured_outputs", "distillation", "fine_tuning", "predicted_outcomes"];
        readonly tools: ["web_search", "file_search", "image_generation", "code_interpreter", "mcp"];
    };
};
declare const GPT_4O_AUDIO: {
    readonly name: "gpt-4o-audio";
    readonly context_window: 128000;
    readonly max_output_tokens: 16384;
    readonly knowledge_cutoff: "2023-10-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 2.5;
        };
        readonly output: {
            readonly normal: 10;
        };
    };
    readonly supports: {
        readonly input: ["text", "audio"];
        readonly output: ["text", "audio"];
        readonly endpoints: ["chat-completions"];
        readonly features: ["streaming", "function_calling"];
        readonly tools: [];
    };
};
declare const GPT_4O_MINI: {
    readonly name: "gpt-4o-mini";
    readonly context_window: 128000;
    readonly max_output_tokens: 16384;
    readonly knowledge_cutoff: "2023-10-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 0.15;
            readonly cached: 0.075;
        };
        readonly output: {
            readonly normal: 0.6;
        };
    };
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions", "assistants", "fine-tuning", "batch"];
        readonly features: ["streaming", "function_calling", "structured_outputs", "fine_tuning", "predicted_outcomes"];
        readonly tools: ["web_search", "file_search", "image_generation", "code_interpreter", "mcp"];
    };
};
declare const GPT_4_TURBO: {
    readonly name: "gpt-4-turbo";
    readonly context_window: 128000;
    readonly max_output_tokens: 4096;
    readonly knowledge_cutoff: "2023-12-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 10;
        };
        readonly output: {
            readonly normal: 30;
        };
    };
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions", "assistants", "batch"];
        readonly features: ["function_calling", "streaming"];
        readonly tools: [];
    };
};
declare const CHATGPT_40: {
    readonly name: "chatgpt-4o-latest";
    readonly context_window: 128000;
    readonly max_output_tokens: 4096;
    readonly knowledge_cutoff: "2023-10-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 5;
        };
        readonly output: {
            readonly normal: 15;
        };
    };
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["predicted_outcomes", "streaming"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp"];
    };
};
declare const GPT_5_1_CODEX_MINI: {
    readonly name: "gpt-5.1-codex-mini";
    readonly context_window: 400000;
    readonly max_output_tokens: 128000;
    readonly knowledge_cutoff: "2024-09-30";
    readonly pricing: {
        readonly input: {
            readonly normal: 0.25;
            readonly cached: 0.025;
        };
        readonly output: {
            readonly normal: 2;
        };
    };
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text", "image"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "function_calling", "structured_outputs"];
        readonly tools: ["file_search", "code_interpreter", "mcp", "local_shell", "shell", "apply_patch"];
    };
};
declare const CODEX_MINI_LATEST: {
    readonly name: "codex-mini-latest";
    readonly context_window: 200000;
    readonly max_output_tokens: 100000;
    readonly knowledge_cutoff: "2024-06-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 1.5;
            readonly cached: 0.375;
        };
        readonly output: {
            readonly normal: 6;
        };
    };
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly endpoints: ["chat"];
        readonly features: ["streaming", "function_calling", "structured_outputs"];
        readonly tools: ["file_search", "code_interpreter", "mcp", "local_shell", "shell", "apply_patch"];
    };
};
declare const GPT_3_5_TURBO: {
    readonly name: "gpt-3.5-turbo";
    readonly context_window: 16385;
    readonly max_output_tokens: 4096;
    readonly knowledge_cutoff: "2021-09-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 0.5;
        };
        readonly output: {
            readonly normal: 1.5;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions", "batch", "fine-tuning"];
        readonly features: ["fine_tuning"];
        readonly tools: [];
    };
};
declare const GPT_4: {
    readonly name: "gpt-4";
    readonly context_window: 8192;
    readonly max_output_tokens: 8192;
    readonly knowledge_cutoff: "2023-12-01";
    readonly pricing: {
        readonly input: {
            readonly normal: 30;
        };
        readonly output: {
            readonly normal: 60;
        };
    };
    readonly supports: {
        readonly input: ["text"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions", "batch", "fine-tuning", "assistants"];
        readonly features: ["fine_tuning", "streaming"];
        readonly tools: [];
    };
};
declare const GPT_5_1_CHAT: {
    readonly name: "gpt-5.1-chat-latest";
    readonly context_window: 128000;
    readonly max_output_tokens: 16384;
    readonly knowledge_cutoff: "2024-09-30";
    readonly pricing: {
        readonly input: {
            readonly normal: 1.25;
            readonly cached: 0.125;
        };
        readonly output: {
            readonly normal: 10;
        };
    };
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp"];
    };
};
declare const GPT_5_CHAT: {
    readonly name: "gpt-5-chat-latest";
    readonly context_window: 128000;
    readonly max_output_tokens: 16384;
    readonly knowledge_cutoff: "2024-09-30";
    readonly pricing: {
        readonly input: {
            readonly normal: 1.25;
            readonly cached: 0.125;
        };
        readonly output: {
            readonly normal: 10;
        };
    };
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp"];
    };
};
declare const GPT_5_4_MINI: {
    readonly name: "gpt-5.4-mini";
    readonly context_window: 400000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["image", "text"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs", "distillation"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 0.75;
            readonly cached: 0.075;
        };
        readonly output: {
            readonly normal: 4.5;
        };
    };
};
declare const GPT_5_4_NANO: {
    readonly name: "gpt-5.4-nano";
    readonly context_window: 400000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["image", "text"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs", "distillation"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 0.2;
            readonly cached: 0.02;
        };
        readonly output: {
            readonly normal: 1.25;
        };
    };
};
declare const GPT_5_4_IMAGE_2: {
    readonly name: "gpt-5.4-image-2";
    readonly context_window: 272000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["image", "text"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs", "distillation"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 8;
            readonly cached: 2;
        };
        readonly output: {
            readonly normal: 15;
        };
    };
};
declare const GPT_5_6: {
    readonly name: "gpt-5.6";
    readonly context_window: 1050000;
    readonly max_output_tokens: 128000;
    readonly knowledge_cutoff: "2026-02-16";
    readonly supports: {
        readonly input: ["image", "text"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs", "distillation"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 5;
            readonly cached: 0.5;
        };
        readonly output: {
            readonly normal: 30;
        };
    };
};
declare const GPT_5_6_SOL: {
    readonly name: "gpt-5.6-sol";
    readonly context_window: 1050000;
    readonly max_output_tokens: 128000;
    readonly knowledge_cutoff: "2026-02-16";
    readonly supports: {
        readonly input: ["image", "text"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs", "distillation"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 5;
            readonly cached: 0.5;
        };
        readonly output: {
            readonly normal: 30;
        };
    };
};
declare const GPT_5_6_TERRA: {
    readonly name: "gpt-5.6-terra";
    readonly context_window: 1050000;
    readonly max_output_tokens: 128000;
    readonly knowledge_cutoff: "2026-02-16";
    readonly supports: {
        readonly input: ["image", "text"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs", "distillation"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 2;
            readonly cached: 0.2;
        };
        readonly output: {
            readonly normal: 12;
        };
    };
};
declare const GPT_5_6_LUNA: {
    readonly name: "gpt-5.6-luna";
    readonly context_window: 1050000;
    readonly max_output_tokens: 128000;
    readonly knowledge_cutoff: "2026-02-16";
    readonly supports: {
        readonly input: ["image", "text"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs", "distillation"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 0.2;
            readonly cached: 0.02;
        };
        readonly output: {
            readonly normal: 1.2;
        };
    };
};
declare const GPT_5_5: {
    readonly name: "gpt-5.5";
    readonly context_window: 1050000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs", "distillation"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 5;
            readonly cached: 0.5;
        };
        readonly output: {
            readonly normal: 30;
        };
    };
};
declare const GPT_5_5_PRO: {
    readonly name: "gpt-5.5-pro";
    readonly context_window: 1050000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["text", "image", "document"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs", "distillation"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 30;
        };
        readonly output: {
            readonly normal: 180;
        };
    };
};
declare const GPT_CHAT_LATEST: {
    readonly name: "gpt-chat-latest";
    readonly context_window: 400000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["text", "image"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs", "distillation"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 5;
            readonly cached: 0.5;
        };
        readonly output: {
            readonly normal: 30;
        };
    };
};
declare const GPT_5_6_LUNA_PRO: {
    readonly name: "gpt-5.6-luna-pro";
    readonly context_window: 1050000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["image", "text"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs"];
        readonly tools: [];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 0.2;
            readonly cached: 0.02;
        };
        readonly output: {
            readonly normal: 1.2;
        };
    };
};
declare const GPT_5_6_SOL_PRO: {
    readonly name: "gpt-5.6-sol-pro";
    readonly context_window: 1050000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["image", "text"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs"];
        readonly tools: [];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 2.5;
            readonly cached: 0.25;
        };
        readonly output: {
            readonly normal: 15;
        };
    };
};
declare const GPT_5_6_TERRA_PRO: {
    readonly name: "gpt-5.6-terra-pro";
    readonly context_window: 1050000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["image", "text"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs"];
        readonly tools: [];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 2;
            readonly cached: 0.2;
        };
        readonly output: {
            readonly normal: 12;
        };
    };
};
declare const GPT_6_ASTRA: {
    readonly name: "gpt-6-astra";
    readonly context_window: 1050000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["image", "text"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs"];
        readonly tools: ["web_search", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "shell", "apply_patch"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 10;
            readonly cached: 1;
        };
        readonly output: {
            readonly normal: 50;
        };
    };
};
declare const GPT_6_ASTRA_PRO: {
    readonly name: "gpt-6-astra-pro";
    readonly context_window: 1050000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["image", "text"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs"];
        readonly tools: [];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 10;
            readonly cached: 1;
        };
        readonly output: {
            readonly normal: 50;
        };
    };
};
declare const GPT_6_LUNA: {
    readonly name: "gpt-6-luna";
    readonly context_window: 1050000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["image", "text"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs"];
        readonly tools: ["web_search", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "shell", "apply_patch"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 0.1;
            readonly cached: 0.01;
        };
        readonly output: {
            readonly normal: 0.5;
        };
    };
};
declare const GPT_6_LUNA_PRO: {
    readonly name: "gpt-6-luna-pro";
    readonly context_window: 1050000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["image", "text"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs"];
        readonly tools: [];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 0.1;
            readonly cached: 0.01;
        };
        readonly output: {
            readonly normal: 0.5;
        };
    };
};
declare const GPT_6_SOL: {
    readonly name: "gpt-6-sol";
    readonly context_window: 1050000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["image", "text"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs"];
        readonly tools: ["web_search", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "shell", "apply_patch"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 2;
            readonly cached: 0.2;
        };
        readonly output: {
            readonly normal: 10;
        };
    };
};
declare const GPT_6_SOL_PRO: {
    readonly name: "gpt-6-sol-pro";
    readonly context_window: 1050000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["image", "text"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs"];
        readonly tools: [];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 2;
            readonly cached: 0.2;
        };
        readonly output: {
            readonly normal: 10;
        };
    };
};
declare const GPT_6_1_SOL: {
    readonly name: "gpt-6.1-sol";
    readonly context_window: 1050000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["image", "text"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 2;
            readonly cached: 0.1;
        };
        readonly output: {
            readonly normal: 10;
        };
    };
};
declare const GPT_6_1_SOL_PRO: {
    readonly name: "gpt-6.1-sol-pro";
    readonly context_window: 1050000;
    readonly max_output_tokens: 128000;
    readonly supports: {
        readonly input: ["image", "text"];
        readonly output: ["text"];
        readonly endpoints: ["chat", "chat-completions"];
        readonly features: ["streaming", "function_calling", "structured_outputs"];
        readonly tools: ["web_search", "web_search_preview", "file_search", "image_generation", "code_interpreter", "mcp", "computer_use", "local_shell", "shell", "apply_patch"];
    };
    readonly pricing: {
        readonly input: {
            readonly normal: 2;
            readonly cached: 0.1;
        };
        readonly output: {
            readonly normal: 10;
        };
    };
};
export declare const OPENAI_CHAT_MODELS: readonly ["gpt-6.1-sol", "gpt-6.1-sol-pro", "gpt-6-luna", "gpt-6-luna-pro", "gpt-6-sol", "gpt-6-sol-pro", "gpt-6-astra", "gpt-6-astra-pro", "gpt-5.6-luna-pro", "gpt-5.6-sol-pro", "gpt-5.6-terra-pro", "gpt-5.2", "gpt-5.2-pro", "gpt-5.2-chat-latest", "gpt-5.1", "gpt-5.1-codex", "gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-5-pro", "gpt-5-codex", "o3", "o3-pro", "o3-mini", "o4-mini", "o3-deep-research", "o4-mini-deep-research", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-4", "gpt-4-turbo", "gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo", "gpt-audio", "gpt-audio-mini", "gpt-4o-audio", "gpt-4o-mini-audio", "gpt-5.1-chat-latest", "gpt-5-chat-latest", "chatgpt-4o-latest", "gpt-5.1-codex-mini", "codex-mini-latest", "gpt-4o-search-preview", "gpt-4o-mini-search-preview", "computer-use-preview", "o1", "o1-pro", "gpt-5.6", "gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.5", "gpt-5.5-pro", "gpt-5.4-mini", "gpt-5.4-nano", "gpt-5.4-image-2", "gpt-chat-latest"];
export type OpenAIChatModel = (typeof OPENAI_CHAT_MODELS)[number];
/**
 * Whether a model rejects the `temperature` / `top_p` sampling knobs.
 *
 * OpenAI's reasoning models — the o-series (`o1`, `o3`, `o4`, …) and the GPT-5
 * reasoning family — return `400 Unsupported parameter: 'temperature'` if either
 * is sent. Their `*-chat-latest` counterparts are ordinary chat models that
 * still accept them, so those are excluded. Matching by name (rather than a
 * per-model flag) keeps future `gpt-5.x` reasoning models covered automatically.
 * See the note in `text/text-provider-options.ts`.
 */
export declare function openAIModelRejectsSamplingParams(model: string): boolean;
/**
 * Whether a model takes OpenAI's explicit prompt cache controls
 * (`prompt_cache_options`) in place of `prompt_cache_retention`.
 * This is true for gpt-5.6 and later, and for gpt-6 and later.
 */
export declare function openAIModelUsesExplicitPromptCache(model: string): boolean;
export declare const OPENAI_IMAGE_MODELS: readonly ["gpt-image-2.5-flare", "gpt-image-2.5-sunburst", "gpt-image-2", "gpt-image-1", "gpt-image-1-mini", "dall-e-3", "dall-e-2"];
export type OpenAIImageModel = (typeof OPENAI_IMAGE_MODELS)[number];
export declare const OPENAI_VIDEO_MODELS: readonly ["sora-2", "sora-2-pro"];
export type OpenAIVideoModel = (typeof OPENAI_VIDEO_MODELS)[number];
/**
 * Text-to-speech models (based on endpoints: "speech_generation")
 */
export declare const OPENAI_TTS_MODELS: readonly ["tts-1", "tts-1-hd", "gpt-4o-audio-preview"];
export type OpenAITTSModel = (typeof OPENAI_TTS_MODELS)[number];
/**
 * Transcription models (based on endpoints: "transcription")
 */
export declare const OPENAI_TRANSCRIPTION_MODELS: readonly ["whisper-1", "gpt-4o-transcribe", "gpt-4o-mini-transcribe", "gpt-4o-transcribe-diarize"];
export type OpenAITranscriptionModel = (typeof OPENAI_TRANSCRIPTION_MODELS)[number];
/**
 * Embedding models (based on endpoints: "embeddings")
 */
export declare const OPENAI_EMBEDDING_MODELS: readonly ["text-embedding-3-small", "text-embedding-3-large"];
export type OpenAIEmbeddingModel = (typeof OPENAI_EMBEDDING_MODELS)[number];
/**
 * Type-only map from embedding model name to its provider options type.
 */
export type OpenAIEmbeddingModelProviderOptionsByName = {
    'text-embedding-3-small': OpenAIEmbeddingProviderOptions;
    'text-embedding-3-large': OpenAIEmbeddingProviderOptions;
};
/**
 * Per-model input modalities for embedding models. OpenAI embedding models
 * are text-only, so image inputs fail at compile time.
 */
export type OpenAIEmbeddingModelInputModalitiesByName = {
    'text-embedding-3-small': readonly ['text'];
    'text-embedding-3-large': readonly ['text'];
};
/**
 * Type-only map from chat model name to its provider options type.
 * Used by the core AI types (via the adapter) to narrow
 * `providerOptions` based on the selected model.
 *
 * Manually defined to ensure accurate type narrowing per model.
 */
export type OpenAIChatModelProviderOptionsByName = {
    [GPT5_2.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT5_2_CHAT.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT5_2_PRO.name]: OpenAIBaseOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT5_1.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT5_1_CODEX.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT5.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT5_MINI.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT5_NANO.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT5_PRO.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT5_CODEX.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT4_1.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT4_1_MINI.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT4_1_NANO.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_4O.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_4O_MINI.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_4.name]: OpenAIBaseOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_4_TURBO.name]: OpenAIBaseOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_3_5_TURBO.name]: OpenAIBaseOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [CHATGPT_40.name]: OpenAIBaseOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [O3.name]: OpenAIBaseOptions & OpenAIMetadataOptions;
    [O3_PRO.name]: OpenAIBaseOptions & OpenAIMetadataOptions;
    [O3_MINI.name]: OpenAIBaseOptions & OpenAIMetadataOptions;
    [O4_MINI.name]: OpenAIBaseOptions & OpenAIMetadataOptions;
    [O3_DEEP_RESEARCH.name]: OpenAIBaseOptions & OpenAIMetadataOptions;
    [O4_MINI_DEEP_RESEARCH.name]: OpenAIBaseOptions & OpenAIMetadataOptions;
    [O1.name]: OpenAIBaseOptions & OpenAIMetadataOptions;
    [O1_PRO.name]: OpenAIBaseOptions & OpenAIMetadataOptions;
    [GPT_AUDIO.name]: OpenAIBaseOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_AUDIO_MINI.name]: OpenAIBaseOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_4O_AUDIO.name]: OpenAIBaseOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_4O_MINI_AUDIO.name]: OpenAIBaseOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_5_1_CHAT.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIMetadataOptions;
    [GPT_5_CHAT.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIMetadataOptions;
    [GPT_5_1_CODEX_MINI.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [CODEX_MINI_LATEST.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_4O_SEARCH_PREVIEW.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_4O_MINI_SEARCH_PREVIEW.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [COMPUTER_USE_PREVIEW.name]: OpenAIBaseOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_5_4_MINI.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_5_4_NANO.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_5_4_IMAGE_2.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_5_6.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_5_6_SOL.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_5_6_TERRA.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_5_6_LUNA.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_5_5.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_5_5_PRO.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_CHAT_LATEST.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_5_6_LUNA_PRO.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_5_6_SOL_PRO.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_5_6_TERRA_PRO.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_6_ASTRA.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_6_ASTRA_PRO.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_6_LUNA.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_6_LUNA_PRO.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_6_SOL.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_6_SOL_PRO.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_6_1_SOL.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
    [GPT_6_1_SOL_PRO.name]: OpenAIBaseOptions & OpenAIStructuredOutputOptions & OpenAIToolsOptions & OpenAIStreamingOptions & OpenAIMetadataOptions;
};
/**
 * Type-only map from chat model name to its supported provider tools.
 * Keyed on each model's `.name` field. Value is the `typeof supports.tools`
 * tuple from each model constant.
 */
export type OpenAIChatModelToolCapabilitiesByName = {
    [GPT5_2.name]: typeof GPT5_2.supports.tools;
    [GPT5_2_PRO.name]: typeof GPT5_2_PRO.supports.tools;
    [GPT5_2_CHAT.name]: typeof GPT5_2_CHAT.supports.tools;
    [GPT5_1.name]: typeof GPT5_1.supports.tools;
    [GPT5_1_CODEX.name]: typeof GPT5_1_CODEX.supports.tools;
    [GPT5.name]: typeof GPT5.supports.tools;
    [GPT5_MINI.name]: typeof GPT5_MINI.supports.tools;
    [GPT5_NANO.name]: typeof GPT5_NANO.supports.tools;
    [GPT5_PRO.name]: typeof GPT5_PRO.supports.tools;
    [GPT5_CODEX.name]: typeof GPT5_CODEX.supports.tools;
    [O3.name]: typeof O3.supports.tools;
    [O3_PRO.name]: typeof O3_PRO.supports.tools;
    [O3_MINI.name]: typeof O3_MINI.supports.tools;
    [O4_MINI.name]: typeof O4_MINI.supports.tools;
    [O3_DEEP_RESEARCH.name]: typeof O3_DEEP_RESEARCH.supports.tools;
    [O4_MINI_DEEP_RESEARCH.name]: typeof O4_MINI_DEEP_RESEARCH.supports.tools;
    [GPT4_1.name]: typeof GPT4_1.supports.tools;
    [GPT4_1_MINI.name]: typeof GPT4_1_MINI.supports.tools;
    [GPT4_1_NANO.name]: typeof GPT4_1_NANO.supports.tools;
    [GPT_4.name]: typeof GPT_4.supports.tools;
    [GPT_4_TURBO.name]: typeof GPT_4_TURBO.supports.tools;
    [GPT_4O.name]: typeof GPT_4O.supports.tools;
    [GPT_4O_MINI.name]: typeof GPT_4O_MINI.supports.tools;
    [GPT_3_5_TURBO.name]: typeof GPT_3_5_TURBO.supports.tools;
    [GPT_AUDIO.name]: typeof GPT_AUDIO.supports.tools;
    [GPT_AUDIO_MINI.name]: typeof GPT_AUDIO_MINI.supports.tools;
    [GPT_4O_AUDIO.name]: typeof GPT_4O_AUDIO.supports.tools;
    [GPT_4O_MINI_AUDIO.name]: typeof GPT_4O_MINI_AUDIO.supports.tools;
    [GPT_5_1_CHAT.name]: typeof GPT_5_1_CHAT.supports.tools;
    [GPT_5_CHAT.name]: typeof GPT_5_CHAT.supports.tools;
    [CHATGPT_40.name]: typeof CHATGPT_40.supports.tools;
    [GPT_5_1_CODEX_MINI.name]: typeof GPT_5_1_CODEX_MINI.supports.tools;
    [CODEX_MINI_LATEST.name]: typeof CODEX_MINI_LATEST.supports.tools;
    [GPT_4O_SEARCH_PREVIEW.name]: typeof GPT_4O_SEARCH_PREVIEW.supports.tools;
    [GPT_4O_MINI_SEARCH_PREVIEW.name]: typeof GPT_4O_MINI_SEARCH_PREVIEW.supports.tools;
    [COMPUTER_USE_PREVIEW.name]: typeof COMPUTER_USE_PREVIEW.supports.tools;
    [O1.name]: typeof O1.supports.tools;
    [O1_PRO.name]: typeof O1_PRO.supports.tools;
    [GPT_5_4_MINI.name]: typeof GPT_5_4_MINI.supports.tools;
    [GPT_5_4_NANO.name]: typeof GPT_5_4_NANO.supports.tools;
    [GPT_5_4_IMAGE_2.name]: typeof GPT_5_4_IMAGE_2.supports.tools;
    [GPT_5_6.name]: typeof GPT_5_6.supports.tools;
    [GPT_5_6_SOL.name]: typeof GPT_5_6_SOL.supports.tools;
    [GPT_5_6_TERRA.name]: typeof GPT_5_6_TERRA.supports.tools;
    [GPT_5_6_LUNA.name]: typeof GPT_5_6_LUNA.supports.tools;
    [GPT_5_5.name]: typeof GPT_5_5.supports.tools;
    [GPT_5_5_PRO.name]: typeof GPT_5_5_PRO.supports.tools;
    [GPT_CHAT_LATEST.name]: typeof GPT_CHAT_LATEST.supports.tools;
    [GPT_6_ASTRA.name]: typeof GPT_6_ASTRA.supports.tools;
    [GPT_6_ASTRA_PRO.name]: typeof GPT_6_ASTRA_PRO.supports.tools;
    [GPT_6_LUNA.name]: typeof GPT_6_LUNA.supports.tools;
    [GPT_6_LUNA_PRO.name]: typeof GPT_6_LUNA_PRO.supports.tools;
    [GPT_6_SOL.name]: typeof GPT_6_SOL.supports.tools;
    [GPT_6_SOL_PRO.name]: typeof GPT_6_SOL_PRO.supports.tools;
    [GPT_6_1_SOL.name]: typeof GPT_6_1_SOL.supports.tools;
    [GPT_6_1_SOL_PRO.name]: typeof GPT_6_1_SOL_PRO.supports.tools;
};
/**
 * Type-only map from chat model name to its supported input modalities.
 * Based on the 'supports.input' arrays defined for each model.
 * Used by the core AI types to constrain ContentPart types based on the selected model.
 * Note: These must be inlined as readonly arrays (not typeof) because the model
 * constants are not exported and typeof references don't work in .d.ts files
 * when consumed by external packages.
 */
export type OpenAIModelInputModalitiesByName = {
    [GPT5_2.name]: typeof GPT5_2.supports.input;
    [GPT5_2_PRO.name]: typeof GPT5_2_PRO.supports.input;
    [GPT5_2_CHAT.name]: typeof GPT5_2_CHAT.supports.input;
    [GPT5_1.name]: typeof GPT5_1.supports.input;
    [GPT5_1_CODEX.name]: typeof GPT5_1_CODEX.supports.input;
    [GPT5.name]: typeof GPT5.supports.input;
    [GPT5_MINI.name]: typeof GPT5_MINI.supports.input;
    [GPT5_NANO.name]: typeof GPT5_NANO.supports.input;
    [GPT5_PRO.name]: typeof GPT5_PRO.supports.input;
    [GPT5_CODEX.name]: typeof GPT5_CODEX.supports.input;
    [GPT4_1.name]: typeof GPT4_1.supports.input;
    [GPT4_1_MINI.name]: typeof GPT4_1_MINI.supports.input;
    [GPT4_1_NANO.name]: typeof GPT4_1_NANO.supports.input;
    [GPT_4O.name]: typeof GPT_4O.supports.input;
    [GPT_4O_MINI.name]: typeof GPT_4O_MINI.supports.input;
    [GPT_4_TURBO.name]: typeof GPT_4_TURBO.supports.input;
    [CHATGPT_40.name]: typeof CHATGPT_40.supports.input;
    [GPT_5_1_CHAT.name]: typeof GPT_5_1_CHAT.supports.input;
    [GPT_5_CHAT.name]: typeof GPT_5_CHAT.supports.input;
    [GPT_5_1_CODEX_MINI.name]: typeof GPT_5_1_CODEX_MINI.supports.input;
    [CODEX_MINI_LATEST.name]: typeof CODEX_MINI_LATEST.supports.input;
    [COMPUTER_USE_PREVIEW.name]: typeof COMPUTER_USE_PREVIEW.supports.input;
    [O3.name]: typeof O3.supports.input;
    [O3_PRO.name]: typeof O3_PRO.supports.input;
    [O3_DEEP_RESEARCH.name]: typeof O3_DEEP_RESEARCH.supports.input;
    [O4_MINI_DEEP_RESEARCH.name]: typeof O4_MINI_DEEP_RESEARCH.supports.input;
    [O4_MINI.name]: typeof O4_MINI.supports.input;
    [O1.name]: typeof O1.supports.input;
    [O1_PRO.name]: typeof O1_PRO.supports.input;
    [GPT_AUDIO.name]: typeof GPT_AUDIO.supports.input;
    [GPT_AUDIO_MINI.name]: typeof GPT_AUDIO_MINI.supports.input;
    [GPT_4O_AUDIO.name]: typeof GPT_4O_AUDIO.supports.input;
    [GPT_4O_MINI_AUDIO.name]: typeof GPT_4O_MINI_AUDIO.supports.input;
    [GPT_4.name]: typeof GPT_4.supports.input;
    [GPT_3_5_TURBO.name]: typeof GPT_3_5_TURBO.supports.input;
    [O3_MINI.name]: typeof O3_MINI.supports.input;
    [GPT_4O_SEARCH_PREVIEW.name]: typeof GPT_4O_SEARCH_PREVIEW.supports.input;
    [GPT_4O_MINI_SEARCH_PREVIEW.name]: typeof GPT_4O_MINI_SEARCH_PREVIEW.supports.input;
    [GPT_5_4_MINI.name]: typeof GPT_5_4_MINI.supports.input;
    [GPT_5_4_NANO.name]: typeof GPT_5_4_NANO.supports.input;
    [GPT_5_4_IMAGE_2.name]: typeof GPT_5_4_IMAGE_2.supports.input;
    [GPT_5_6.name]: typeof GPT_5_6.supports.input;
    [GPT_5_6_SOL.name]: typeof GPT_5_6_SOL.supports.input;
    [GPT_5_6_TERRA.name]: typeof GPT_5_6_TERRA.supports.input;
    [GPT_5_6_LUNA.name]: typeof GPT_5_6_LUNA.supports.input;
    [GPT_5_5.name]: typeof GPT_5_5.supports.input;
    [GPT_5_5_PRO.name]: typeof GPT_5_5_PRO.supports.input;
    [GPT_CHAT_LATEST.name]: typeof GPT_CHAT_LATEST.supports.input;
    [GPT_5_6_LUNA_PRO.name]: typeof GPT_5_6_LUNA_PRO.supports.input;
    [GPT_5_6_SOL_PRO.name]: typeof GPT_5_6_SOL_PRO.supports.input;
    [GPT_5_6_TERRA_PRO.name]: typeof GPT_5_6_TERRA_PRO.supports.input;
    [GPT_6_ASTRA.name]: typeof GPT_6_ASTRA.supports.input;
    [GPT_6_ASTRA_PRO.name]: typeof GPT_6_ASTRA_PRO.supports.input;
    [GPT_6_LUNA.name]: typeof GPT_6_LUNA.supports.input;
    [GPT_6_LUNA_PRO.name]: typeof GPT_6_LUNA_PRO.supports.input;
    [GPT_6_SOL.name]: typeof GPT_6_SOL.supports.input;
    [GPT_6_SOL_PRO.name]: typeof GPT_6_SOL_PRO.supports.input;
    [GPT_6_1_SOL.name]: typeof GPT_6_1_SOL.supports.input;
    [GPT_6_1_SOL_PRO.name]: typeof GPT_6_1_SOL_PRO.supports.input;
};
/**
 * Runtime map from chat model name to its supported input modalities, for the
 * text adapters' `inputModalities`. `satisfies` keeps it equal to
 * {@link OpenAIModelInputModalitiesByName}. An unknown name gives `undefined`.
 */
export declare const OPENAI_MODEL_INPUT_MODALITIES: Readonly<Record<string, ReadonlyArray<Modality>>>;
/**
 * The mid-conversation channels of each Responses model (from pi 0.87.1):
 * added tools go out as an `additional_tools` item, and added prompts as a
 * mid-conversation `developer` message. An unknown name gives `undefined`,
 * so the adapter has no channels. `gpt-5.4` and `gpt-5.4-pro` are on pi's
 * list but not in {@link OPENAI_CHAT_MODELS} yet, so the keys are strings.
 */
export declare const OPENAI_MODEL_MID_CONVERSATION_CHANNELS: Readonly<Record<string, MidConversationChannels>>;
export {};
