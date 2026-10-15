//#region src/model-meta.ts
var GPT5_2 = {
	name: "gpt-5.2",
	context_window: 4e5,
	max_output_tokens: 128e3,
	knowledge_cutoff: "2025-08-31",
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs",
			"distillation"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	},
	pricing: {
		input: {
			normal: 1.75,
			cached: .175
		},
		output: { normal: 14 }
	}
};
var GPT5_2_PRO = {
	name: "gpt-5.2-pro",
	context_window: 4e5,
	max_output_tokens: 128e3,
	knowledge_cutoff: "2025-08-31",
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: ["streaming", "function_calling"],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	},
	pricing: {
		input: { normal: 21 },
		output: { normal: 168 }
	}
};
var GPT5_2_CHAT = {
	name: "gpt-5.2-chat-latest",
	context_window: 128e3,
	max_output_tokens: 16384,
	knowledge_cutoff: "2025-08-31",
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp"
		]
	},
	pricing: {
		input: {
			normal: 1.75,
			cached: .175
		},
		output: { normal: 14 }
	}
};
var GPT5_1 = {
	name: "gpt-5.1",
	context_window: 4e5,
	max_output_tokens: 128e3,
	knowledge_cutoff: "2024-09-30",
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text", "image"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs",
			"distillation"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	},
	pricing: {
		input: {
			normal: 1.25,
			cached: .125
		},
		output: { normal: 10 }
	}
};
var GPT5_1_CODEX = {
	name: "gpt-5.1-codex",
	context_window: 4e5,
	max_output_tokens: 128e3,
	knowledge_cutoff: "2024-09-30",
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text", "image"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs"
		],
		tools: [
			"file_search",
			"code_interpreter",
			"mcp",
			"local_shell",
			"shell",
			"apply_patch"
		]
	},
	pricing: {
		input: {
			normal: 1.25,
			cached: .125
		},
		output: { normal: 10 }
	}
};
var GPT5 = {
	name: "gpt-5",
	context_window: 4e5,
	max_output_tokens: 128e3,
	knowledge_cutoff: "2024-09-30",
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: [
			"chat",
			"chat-completions",
			"batch"
		],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs",
			"distillation"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	},
	pricing: {
		input: {
			normal: 1.25,
			cached: .125
		},
		output: { normal: 10 }
	}
};
var GPT5_MINI = {
	name: "gpt-5-mini",
	context_window: 4e5,
	max_output_tokens: 128e3,
	knowledge_cutoff: "2024-05-31",
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: [
			"chat",
			"chat-completions",
			"batch"
		],
		features: [
			"streaming",
			"structured_outputs",
			"function_calling"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	},
	pricing: {
		input: {
			normal: .25,
			cached: .025
		},
		output: { normal: 2 }
	}
};
var GPT5_NANO = {
	name: "gpt-5-nano",
	context_window: 4e5,
	max_output_tokens: 128e3,
	knowledge_cutoff: "2024-05-31",
	pricing: {
		input: {
			normal: .05,
			cached: .005
		},
		output: { normal: .4 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: [
			"chat",
			"chat-completions",
			"batch"
		],
		features: [
			"streaming",
			"structured_outputs",
			"function_calling"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	}
};
var GPT5_PRO = {
	name: "gpt-5-pro",
	context_window: 4e5,
	max_output_tokens: 272e3,
	knowledge_cutoff: "2024-09-30",
	pricing: {
		input: { normal: 15 },
		output: { normal: 120 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: ["chat", "batch"],
		features: [
			"streaming",
			"structured_outputs",
			"function_calling"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	}
};
var GPT5_CODEX = {
	name: "gpt-5-codex",
	context_window: 4e5,
	max_output_tokens: 128e3,
	knowledge_cutoff: "2024-09-30",
	pricing: {
		input: {
			normal: 1.25,
			cached: .125
		},
		output: { normal: 10 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text", "image"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"structured_outputs",
			"function_calling"
		],
		tools: [
			"file_search",
			"code_interpreter",
			"mcp",
			"local_shell",
			"shell",
			"apply_patch"
		]
	}
};
/**
* Sora-2 video generation model.
* @experimental Video generation is an experimental feature and may change.
*/
var SORA2 = {
	name: "sora-2",
	pricing: {
		input: { normal: 0 },
		output: { normal: .1 }
	},
	supports: {
		input: ["text", "image"],
		output: ["video", "audio"],
		endpoints: ["video"],
		features: []
	}
};
/**
* Sora-2-Pro video generation model (higher quality).
* @experimental Video generation is an experimental feature and may change.
*/
var SORA2_PRO = {
	name: "sora-2-pro",
	pricing: {
		input: { normal: 0 },
		output: { normal: .5 }
	},
	supports: {
		input: ["text", "image"],
		output: ["video", "audio"],
		endpoints: ["video"],
		features: []
	}
};
var GPT_IMAGE_1 = {
	name: "gpt-image-1",
	pricing: {
		input: {
			normal: 5,
			cached: 1.25
		},
		output: { normal: .1 }
	},
	supports: {
		input: ["text", "image"],
		output: ["image"],
		endpoints: ["image-generation", "image-edit"],
		features: []
	}
};
var GPT_IMAGE_1_MINI = {
	name: "gpt-image-1-mini",
	pricing: {
		input: {
			normal: 2,
			cached: .2
		},
		output: { normal: .03 }
	},
	supports: {
		input: ["text", "image"],
		output: ["image"],
		endpoints: ["image-generation", "image-edit"],
		features: []
	}
};
var GPT_IMAGE_2_5_FLARE = {
	name: "gpt-image-2.5-flare",
	pricing: {
		input: {
			normal: 5,
			cached: 1.25
		},
		output: { normal: 30 }
	},
	supports: {
		input: ["text", "image"],
		output: ["image"],
		endpoints: ["image-generation", "image-edit"],
		features: []
	}
};
var GPT_IMAGE_2_5_SUNBURST = {
	name: "gpt-image-2.5-sunburst",
	pricing: {
		input: {
			normal: 5,
			cached: 1.25
		},
		output: { normal: 30 }
	},
	supports: {
		input: ["text", "image"],
		output: ["image"],
		endpoints: ["image-generation", "image-edit"],
		features: []
	}
};
var GPT_IMAGE_2 = {
	name: "gpt-image-2",
	knowledge_cutoff: "2026-04-21",
	pricing: {
		input: {
			normal: 5,
			cached: 1.25
		},
		output: { normal: 30 }
	},
	supports: {
		input: ["text", "image"],
		output: ["image"],
		endpoints: ["image-generation", "image-edit"],
		features: []
	}
};
var O3_DEEP_RESEARCH = {
	name: "o3-deep-research",
	context_window: 2e5,
	max_output_tokens: 1e5,
	knowledge_cutoff: "2024-01-01",
	pricing: {
		input: {
			normal: 10,
			cached: 2.5
		},
		output: { normal: 40 }
	},
	supports: {
		input: ["text", "image"],
		output: ["text"],
		endpoints: ["chat", "batch"],
		features: ["streaming"],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	}
};
var O4_MINI_DEEP_RESEARCH = {
	name: "o4-mini-deep-research",
	context_window: 2e5,
	max_output_tokens: 1e5,
	knowledge_cutoff: "2024-01-01",
	pricing: {
		input: {
			normal: 2,
			cached: .5
		},
		output: { normal: 8 }
	},
	supports: {
		input: ["text", "image"],
		output: ["text"],
		endpoints: ["chat", "batch"],
		features: ["streaming"],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	}
};
var O3_PRO = {
	name: "o3-pro",
	context_window: 2e5,
	max_output_tokens: 1e5,
	knowledge_cutoff: "2024-01-01",
	pricing: {
		input: { normal: 20 },
		output: { normal: 80 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: ["chat", "batch"],
		features: ["function_calling", "structured_outputs"],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	}
};
var GPT_AUDIO = {
	name: "gpt-audio",
	context_window: 128e3,
	max_output_tokens: 16384,
	knowledge_cutoff: "2023-10-01",
	pricing: {
		input: { normal: 2.5 },
		output: { normal: 10 }
	},
	supports: {
		input: ["text", "audio"],
		output: ["text", "audio"],
		endpoints: ["chat-completions"],
		features: ["function_calling"],
		tools: []
	}
};
var GPT_AUDIO_MINI = {
	name: "gpt-audio-mini",
	context_window: 128e3,
	max_output_tokens: 16384,
	knowledge_cutoff: "2023-10-01",
	pricing: {
		input: { normal: .6 },
		output: { normal: 2.4 }
	},
	supports: {
		input: ["text", "audio"],
		output: ["text", "audio"],
		endpoints: ["chat-completions"],
		features: ["function_calling"],
		tools: []
	}
};
var O3 = {
	name: "o3",
	context_window: 2e5,
	max_output_tokens: 1e5,
	knowledge_cutoff: "2024-01-01",
	pricing: {
		input: {
			normal: 2,
			cached: .5
		},
		output: { normal: 8 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: [
			"chat",
			"batch",
			"chat-completions"
		],
		features: [
			"function_calling",
			"structured_outputs",
			"streaming"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	}
};
var O4_MINI = {
	name: "o4-mini",
	context_window: 2e5,
	max_output_tokens: 1e5,
	knowledge_cutoff: "2024-01-01",
	pricing: {
		input: {
			normal: 1.1,
			cached: .275
		},
		output: { normal: 4.4 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: [
			"chat",
			"batch",
			"chat-completions",
			"fine-tuning"
		],
		features: [
			"function_calling",
			"structured_outputs",
			"streaming",
			"fine_tuning"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	}
};
var GPT4_1 = {
	name: "gpt-4.1",
	context_window: 1047576,
	max_output_tokens: 32768,
	knowledge_cutoff: "2024-01-01",
	pricing: {
		input: {
			normal: 2,
			cached: .5
		},
		output: { normal: 8 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: [
			"chat",
			"chat-completions",
			"assistants",
			"fine-tuning",
			"batch"
		],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs",
			"distillation",
			"fine_tuning"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	}
};
var GPT4_1_MINI = {
	name: "gpt-4.1-mini",
	context_window: 1047576,
	max_output_tokens: 32768,
	knowledge_cutoff: "2024-01-01",
	pricing: {
		input: {
			normal: .4,
			cached: .1
		},
		output: { normal: 1.6 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: [
			"chat",
			"chat-completions",
			"assistants",
			"fine-tuning",
			"batch"
		],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs",
			"fine_tuning"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	}
};
var GPT4_1_NANO = {
	name: "gpt-4.1-nano",
	context_window: 1047576,
	max_output_tokens: 32768,
	knowledge_cutoff: "2024-01-01",
	pricing: {
		input: {
			normal: .1,
			cached: .025
		},
		output: { normal: .4 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: [
			"chat",
			"chat-completions",
			"assistants",
			"fine-tuning",
			"batch"
		],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs",
			"fine_tuning",
			"predicted_outcomes"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	}
};
var O1_PRO = {
	name: "o1-pro",
	context_window: 2e5,
	max_output_tokens: 1e5,
	knowledge_cutoff: "2023-10-01",
	pricing: {
		input: { normal: 150 },
		output: { normal: 600 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: ["chat", "batch"],
		features: ["function_calling", "structured_outputs"],
		tools: [
			"file_search",
			"code_interpreter",
			"mcp"
		]
	}
};
var COMPUTER_USE_PREVIEW = {
	name: "computer-use-preview",
	context_window: 8192,
	max_output_tokens: 1024,
	knowledge_cutoff: "2023-10-01",
	pricing: {
		input: { normal: 3 },
		output: { normal: 12 }
	},
	supports: {
		input: ["text", "image"],
		output: ["text"],
		endpoints: ["chat", "batch"],
		features: ["function_calling"],
		tools: ["computer_use"]
	}
};
var GPT_4O_MINI_SEARCH_PREVIEW = {
	name: "gpt-4o-mini-search-preview",
	context_window: 128e3,
	max_output_tokens: 16384,
	knowledge_cutoff: "2023-10-01",
	pricing: {
		input: { normal: .15 },
		output: { normal: .6 }
	},
	supports: {
		input: ["text"],
		output: ["text"],
		endpoints: ["chat-completions"],
		features: ["streaming", "structured_outputs"],
		tools: ["web_search_preview"]
	}
};
var GPT_4O_SEARCH_PREVIEW = {
	name: "gpt-4o-search-preview",
	context_window: 128e3,
	max_output_tokens: 16384,
	knowledge_cutoff: "2023-10-01",
	pricing: {
		input: { normal: 2.5 },
		output: { normal: 10 }
	},
	supports: {
		input: ["text"],
		output: ["text"],
		endpoints: ["chat-completions"],
		features: ["streaming", "structured_outputs"],
		tools: ["web_search_preview"]
	}
};
var O3_MINI = {
	name: "o3-mini",
	context_window: 2e5,
	max_output_tokens: 1e5,
	knowledge_cutoff: "2023-10-01",
	pricing: {
		input: {
			normal: 1.1,
			cached: .55
		},
		output: { normal: 4.4 }
	},
	supports: {
		input: ["text"],
		output: ["text"],
		endpoints: [
			"chat",
			"batch",
			"chat-completions",
			"assistants"
		],
		features: [
			"function_calling",
			"structured_outputs",
			"streaming"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	}
};
var GPT_4O_MINI_AUDIO = {
	name: "gpt-4o-mini-audio",
	context_window: 128e3,
	max_output_tokens: 16384,
	knowledge_cutoff: "2023-10-01",
	pricing: {
		input: { normal: .15 },
		output: { normal: .6 }
	},
	supports: {
		input: ["text", "audio"],
		output: ["text", "audio"],
		endpoints: ["chat-completions"],
		features: ["function_calling", "streaming"],
		tools: []
	}
};
var O1 = {
	name: "o1",
	context_window: 2e5,
	max_output_tokens: 1e5,
	knowledge_cutoff: "2023-10-01",
	pricing: {
		input: {
			normal: 15,
			cached: 7.5
		},
		output: { normal: 60 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: [
			"chat",
			"batch",
			"chat-completions",
			"assistants"
		],
		features: [
			"function_calling",
			"structured_outputs",
			"streaming"
		],
		tools: [
			"file_search",
			"code_interpreter",
			"mcp"
		]
	}
};
var GPT_4O = {
	name: "gpt-4o",
	context_window: 128e3,
	max_output_tokens: 16384,
	knowledge_cutoff: "2023-10-01",
	pricing: {
		input: {
			normal: 2.5,
			cached: 1.25
		},
		output: { normal: 10 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: [
			"chat",
			"chat-completions",
			"assistants",
			"fine-tuning",
			"batch"
		],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs",
			"distillation",
			"fine_tuning",
			"predicted_outcomes"
		],
		tools: [
			"web_search",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp"
		]
	}
};
var GPT_4O_AUDIO = {
	name: "gpt-4o-audio",
	context_window: 128e3,
	max_output_tokens: 16384,
	knowledge_cutoff: "2023-10-01",
	pricing: {
		input: { normal: 2.5 },
		output: { normal: 10 }
	},
	supports: {
		input: ["text", "audio"],
		output: ["text", "audio"],
		endpoints: ["chat-completions"],
		features: ["streaming", "function_calling"],
		tools: []
	}
};
var GPT_4O_MINI = {
	name: "gpt-4o-mini",
	context_window: 128e3,
	max_output_tokens: 16384,
	knowledge_cutoff: "2023-10-01",
	pricing: {
		input: {
			normal: .15,
			cached: .075
		},
		output: { normal: .6 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: [
			"chat",
			"chat-completions",
			"assistants",
			"fine-tuning",
			"batch"
		],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs",
			"fine_tuning",
			"predicted_outcomes"
		],
		tools: [
			"web_search",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp"
		]
	}
};
var GPT_4_TURBO = {
	name: "gpt-4-turbo",
	context_window: 128e3,
	max_output_tokens: 4096,
	knowledge_cutoff: "2023-12-01",
	pricing: {
		input: { normal: 10 },
		output: { normal: 30 }
	},
	supports: {
		input: ["text", "image"],
		output: ["text"],
		endpoints: [
			"chat",
			"chat-completions",
			"assistants",
			"batch"
		],
		features: ["function_calling", "streaming"],
		tools: []
	}
};
var CHATGPT_40 = {
	name: "chatgpt-4o-latest",
	context_window: 128e3,
	max_output_tokens: 4096,
	knowledge_cutoff: "2023-10-01",
	pricing: {
		input: { normal: 5 },
		output: { normal: 15 }
	},
	supports: {
		input: ["text", "image"],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: ["predicted_outcomes", "streaming"],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp"
		]
	}
};
var GPT_5_1_CODEX_MINI = {
	name: "gpt-5.1-codex-mini",
	context_window: 4e5,
	max_output_tokens: 128e3,
	knowledge_cutoff: "2024-09-30",
	pricing: {
		input: {
			normal: .25,
			cached: .025
		},
		output: { normal: 2 }
	},
	supports: {
		input: ["text", "image"],
		output: ["text", "image"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs"
		],
		tools: [
			"file_search",
			"code_interpreter",
			"mcp",
			"local_shell",
			"shell",
			"apply_patch"
		]
	}
};
var CODEX_MINI_LATEST = {
	name: "codex-mini-latest",
	context_window: 2e5,
	max_output_tokens: 1e5,
	knowledge_cutoff: "2024-06-01",
	pricing: {
		input: {
			normal: 1.5,
			cached: .375
		},
		output: { normal: 6 }
	},
	supports: {
		input: ["text", "image"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs"
		],
		tools: [
			"file_search",
			"code_interpreter",
			"mcp",
			"local_shell",
			"shell",
			"apply_patch"
		]
	}
};
var DALL_E_2 = {
	name: "dall-e-2",
	pricing: {
		input: { normal: .016 },
		output: { normal: .02 }
	},
	supports: {
		input: ["text"],
		output: ["image"],
		endpoints: ["image-generation", "image-edit"],
		features: []
	}
};
var DALL_E_3 = {
	name: "dall-e-3",
	pricing: {
		input: { normal: .04 },
		output: { normal: .08 }
	},
	supports: {
		input: ["text"],
		output: ["image"],
		endpoints: ["image-generation", "image-edit"],
		features: []
	}
};
var GPT_3_5_TURBO = {
	name: "gpt-3.5-turbo",
	context_window: 16385,
	max_output_tokens: 4096,
	knowledge_cutoff: "2021-09-01",
	pricing: {
		input: { normal: .5 },
		output: { normal: 1.5 }
	},
	supports: {
		input: ["text"],
		output: ["text"],
		endpoints: [
			"chat",
			"chat-completions",
			"batch",
			"fine-tuning"
		],
		features: ["fine_tuning"],
		tools: []
	}
};
var GPT_4 = {
	name: "gpt-4",
	context_window: 8192,
	max_output_tokens: 8192,
	knowledge_cutoff: "2023-12-01",
	pricing: {
		input: { normal: 30 },
		output: { normal: 60 }
	},
	supports: {
		input: ["text"],
		output: ["text"],
		endpoints: [
			"chat",
			"chat-completions",
			"batch",
			"fine-tuning",
			"assistants"
		],
		features: ["fine_tuning", "streaming"],
		tools: []
	}
};
var GPT_5_1_CHAT = {
	name: "gpt-5.1-chat-latest",
	context_window: 128e3,
	max_output_tokens: 16384,
	knowledge_cutoff: "2024-09-30",
	pricing: {
		input: {
			normal: 1.25,
			cached: .125
		},
		output: { normal: 10 }
	},
	supports: {
		input: ["text", "image"],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp"
		]
	}
};
var GPT_5_CHAT = {
	name: "gpt-5-chat-latest",
	context_window: 128e3,
	max_output_tokens: 16384,
	knowledge_cutoff: "2024-09-30",
	pricing: {
		input: {
			normal: 1.25,
			cached: .125
		},
		output: { normal: 10 }
	},
	supports: {
		input: ["text", "image"],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp"
		]
	}
};
var GPT_5_4_MINI = {
	name: "gpt-5.4-mini",
	context_window: 4e5,
	max_output_tokens: 128e3,
	supports: {
		input: ["image", "text"],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs",
			"distillation"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	},
	pricing: {
		input: {
			normal: .75,
			cached: .075
		},
		output: { normal: 4.5 }
	}
};
var GPT_5_4_NANO = {
	name: "gpt-5.4-nano",
	context_window: 4e5,
	max_output_tokens: 128e3,
	supports: {
		input: ["image", "text"],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs",
			"distillation"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	},
	pricing: {
		input: {
			normal: .2,
			cached: .02
		},
		output: { normal: 1.25 }
	}
};
var GPT_5_4_IMAGE_2 = {
	name: "gpt-5.4-image-2",
	context_window: 272e3,
	max_output_tokens: 128e3,
	supports: {
		input: ["image", "text"],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs",
			"distillation"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	},
	pricing: {
		input: {
			normal: 8,
			cached: 2
		},
		output: { normal: 15 }
	}
};
var GPT_5_6 = {
	name: "gpt-5.6",
	context_window: 105e4,
	max_output_tokens: 128e3,
	knowledge_cutoff: "2026-02-16",
	supports: {
		input: ["image", "text"],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs",
			"distillation"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	},
	pricing: {
		input: {
			normal: 5,
			cached: .5
		},
		output: { normal: 30 }
	}
};
var GPT_5_6_SOL = {
	name: "gpt-5.6-sol",
	context_window: 105e4,
	max_output_tokens: 128e3,
	knowledge_cutoff: "2026-02-16",
	supports: {
		input: ["image", "text"],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs",
			"distillation"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	},
	pricing: {
		input: {
			normal: 5,
			cached: .5
		},
		output: { normal: 30 }
	}
};
var GPT_5_6_TERRA = {
	name: "gpt-5.6-terra",
	context_window: 105e4,
	max_output_tokens: 128e3,
	knowledge_cutoff: "2026-02-16",
	supports: {
		input: ["image", "text"],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs",
			"distillation"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	},
	pricing: {
		input: {
			normal: 2,
			cached: .2
		},
		output: { normal: 12 }
	}
};
var GPT_5_6_LUNA = {
	name: "gpt-5.6-luna",
	context_window: 105e4,
	max_output_tokens: 128e3,
	knowledge_cutoff: "2026-02-16",
	supports: {
		input: ["image", "text"],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs",
			"distillation"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	},
	pricing: {
		input: {
			normal: .2,
			cached: .02
		},
		output: { normal: 1.2 }
	}
};
var GPT_5_5 = {
	name: "gpt-5.5",
	context_window: 105e4,
	max_output_tokens: 128e3,
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs",
			"distillation"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	},
	pricing: {
		input: {
			normal: 5,
			cached: .5
		},
		output: { normal: 30 }
	}
};
var GPT_5_5_PRO = {
	name: "gpt-5.5-pro",
	context_window: 105e4,
	max_output_tokens: 128e3,
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs",
			"distillation"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	},
	pricing: {
		input: { normal: 30 },
		output: { normal: 180 }
	}
};
var GPT_CHAT_LATEST = {
	name: "gpt-chat-latest",
	context_window: 4e5,
	max_output_tokens: 128e3,
	supports: {
		input: ["text", "image"],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs",
			"distillation"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	},
	pricing: {
		input: {
			normal: 5,
			cached: .5
		},
		output: { normal: 30 }
	}
};
var GPT_5_6_LUNA_PRO = {
	name: "gpt-5.6-luna-pro",
	context_window: 105e4,
	max_output_tokens: 128e3,
	supports: {
		input: ["image", "text"],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs"
		],
		tools: []
	},
	pricing: {
		input: {
			normal: .2,
			cached: .02
		},
		output: { normal: 1.2 }
	}
};
var GPT_5_6_SOL_PRO = {
	name: "gpt-5.6-sol-pro",
	context_window: 105e4,
	max_output_tokens: 128e3,
	supports: {
		input: ["image", "text"],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs"
		],
		tools: []
	},
	pricing: {
		input: {
			normal: 2.5,
			cached: .25
		},
		output: { normal: 15 }
	}
};
var GPT_5_6_TERRA_PRO = {
	name: "gpt-5.6-terra-pro",
	context_window: 105e4,
	max_output_tokens: 128e3,
	supports: {
		input: ["image", "text"],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs"
		],
		tools: []
	},
	pricing: {
		input: {
			normal: 2,
			cached: .2
		},
		output: { normal: 12 }
	}
};
var GPT_6_ASTRA = {
	name: "gpt-6-astra",
	context_window: 105e4,
	max_output_tokens: 128e3,
	supports: {
		input: ["image", "text"],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs"
		],
		tools: [
			"web_search",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"shell",
			"apply_patch"
		]
	},
	pricing: {
		input: {
			normal: 10,
			cached: 1
		},
		output: { normal: 50 }
	}
};
var GPT_6_ASTRA_PRO = {
	name: "gpt-6-astra-pro",
	context_window: 105e4,
	max_output_tokens: 128e3,
	supports: {
		input: ["image", "text"],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs"
		],
		tools: []
	},
	pricing: {
		input: {
			normal: 10,
			cached: 1
		},
		output: { normal: 50 }
	}
};
var GPT_6_LUNA = {
	name: "gpt-6-luna",
	context_window: 105e4,
	max_output_tokens: 128e3,
	supports: {
		input: ["image", "text"],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs"
		],
		tools: [
			"web_search",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"shell",
			"apply_patch"
		]
	},
	pricing: {
		input: {
			normal: .1,
			cached: .01
		},
		output: { normal: .5 }
	}
};
var GPT_6_LUNA_PRO = {
	name: "gpt-6-luna-pro",
	context_window: 105e4,
	max_output_tokens: 128e3,
	supports: {
		input: ["image", "text"],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs"
		],
		tools: []
	},
	pricing: {
		input: {
			normal: .1,
			cached: .01
		},
		output: { normal: .5 }
	}
};
var GPT_6_SOL = {
	name: "gpt-6-sol",
	context_window: 105e4,
	max_output_tokens: 128e3,
	supports: {
		input: ["image", "text"],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs"
		],
		tools: [
			"web_search",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"shell",
			"apply_patch"
		]
	},
	pricing: {
		input: {
			normal: 2,
			cached: .2
		},
		output: { normal: 10 }
	}
};
var GPT_6_SOL_PRO = {
	name: "gpt-6-sol-pro",
	context_window: 105e4,
	max_output_tokens: 128e3,
	supports: {
		input: ["image", "text"],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs"
		],
		tools: []
	},
	pricing: {
		input: {
			normal: 2,
			cached: .2
		},
		output: { normal: 10 }
	}
};
var GPT_6_1_SOL = {
	name: "gpt-6.1-sol",
	context_window: 105e4,
	max_output_tokens: 128e3,
	supports: {
		input: ["image", "text"],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	},
	pricing: {
		input: {
			normal: 2,
			cached: .1
		},
		output: { normal: 10 }
	}
};
var GPT_6_1_SOL_PRO = {
	name: "gpt-6.1-sol-pro",
	context_window: 105e4,
	max_output_tokens: 128e3,
	supports: {
		input: ["image", "text"],
		output: ["text"],
		endpoints: ["chat", "chat-completions"],
		features: [
			"streaming",
			"function_calling",
			"structured_outputs"
		],
		tools: [
			"web_search",
			"web_search_preview",
			"file_search",
			"image_generation",
			"code_interpreter",
			"mcp",
			"computer_use",
			"local_shell",
			"shell",
			"apply_patch"
		]
	},
	pricing: {
		input: {
			normal: 2,
			cached: .1
		},
		output: { normal: 10 }
	}
};
var OPENAI_CHAT_MODELS = [
	GPT_6_1_SOL.name,
	GPT_6_1_SOL_PRO.name,
	GPT_6_LUNA.name,
	GPT_6_LUNA_PRO.name,
	GPT_6_SOL.name,
	GPT_6_SOL_PRO.name,
	GPT_6_ASTRA.name,
	GPT_6_ASTRA_PRO.name,
	GPT_5_6_LUNA_PRO.name,
	GPT_5_6_SOL_PRO.name,
	GPT_5_6_TERRA_PRO.name,
	GPT5_2.name,
	GPT5_2_PRO.name,
	GPT5_2_CHAT.name,
	GPT5_1.name,
	GPT5_1_CODEX.name,
	GPT5.name,
	GPT5_MINI.name,
	GPT5_NANO.name,
	GPT5_PRO.name,
	GPT5_CODEX.name,
	O3.name,
	O3_PRO.name,
	O3_MINI.name,
	O4_MINI.name,
	O3_DEEP_RESEARCH.name,
	O4_MINI_DEEP_RESEARCH.name,
	GPT4_1.name,
	GPT4_1_MINI.name,
	GPT4_1_NANO.name,
	GPT_4.name,
	GPT_4_TURBO.name,
	GPT_4O.name,
	GPT_4O_MINI.name,
	GPT_3_5_TURBO.name,
	GPT_AUDIO.name,
	GPT_AUDIO_MINI.name,
	GPT_4O_AUDIO.name,
	GPT_4O_MINI_AUDIO.name,
	GPT_5_1_CHAT.name,
	GPT_5_CHAT.name,
	CHATGPT_40.name,
	GPT_5_1_CODEX_MINI.name,
	CODEX_MINI_LATEST.name,
	GPT_4O_SEARCH_PREVIEW.name,
	GPT_4O_MINI_SEARCH_PREVIEW.name,
	COMPUTER_USE_PREVIEW.name,
	O1.name,
	O1_PRO.name,
	GPT_5_6.name,
	GPT_5_6_SOL.name,
	GPT_5_6_TERRA.name,
	GPT_5_6_LUNA.name,
	GPT_5_5.name,
	GPT_5_5_PRO.name,
	GPT_5_4_MINI.name,
	GPT_5_4_NANO.name,
	GPT_5_4_IMAGE_2.name,
	GPT_CHAT_LATEST.name
];
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
function openAIModelRejectsSamplingParams(model) {
	if (/^o\d/.test(model)) return true;
	if (model.startsWith("gpt-5") && !model.endsWith("-chat-latest")) return true;
	if (model === "codex-mini-latest") return true;
	return false;
}
/**
* Whether a model takes OpenAI's explicit prompt cache controls
* (`prompt_cache_options`) in place of `prompt_cache_retention`.
* This is true for gpt-5.6 and later, and for gpt-6 and later.
*/
function openAIModelUsesExplicitPromptCache(model) {
	const match = /^gpt-(\d+)(?:\.(\d+))?/.exec(model);
	if (!match) return false;
	const major = Number(match[1]);
	const minor = Number(match[2] ?? 0);
	return major > 5 || major === 5 && minor >= 6;
}
var OPENAI_IMAGE_MODELS = [
	GPT_IMAGE_2_5_FLARE.name,
	GPT_IMAGE_2_5_SUNBURST.name,
	GPT_IMAGE_2.name,
	GPT_IMAGE_1.name,
	GPT_IMAGE_1_MINI.name,
	DALL_E_3.name,
	DALL_E_2.name
];
var OPENAI_VIDEO_MODELS = [SORA2.name, SORA2_PRO.name];
/**
* Text-to-speech models (based on endpoints: "speech_generation")
*/
var OPENAI_TTS_MODELS = [
	"tts-1",
	"tts-1-hd",
	"gpt-4o-audio-preview"
];
/**
* Transcription models (based on endpoints: "transcription")
*/
var OPENAI_TRANSCRIPTION_MODELS = [
	"whisper-1",
	"gpt-4o-transcribe",
	"gpt-4o-mini-transcribe",
	"gpt-4o-transcribe-diarize"
];
/**
* Embedding models (based on endpoints: "embeddings")
*/
var OPENAI_EMBEDDING_MODELS = ["text-embedding-3-small", "text-embedding-3-large"];
/**
* Runtime map from chat model name to its supported input modalities, for the
* text adapters' `inputModalities`. `satisfies` keeps it equal to
* {@link OpenAIModelInputModalitiesByName}. An unknown name gives `undefined`.
*/
var OPENAI_MODEL_INPUT_MODALITIES = {
	[GPT5_2.name]: GPT5_2.supports.input,
	[GPT5_2_PRO.name]: GPT5_2_PRO.supports.input,
	[GPT5_2_CHAT.name]: GPT5_2_CHAT.supports.input,
	[GPT5_1.name]: GPT5_1.supports.input,
	[GPT5_1_CODEX.name]: GPT5_1_CODEX.supports.input,
	[GPT5.name]: GPT5.supports.input,
	[GPT5_MINI.name]: GPT5_MINI.supports.input,
	[GPT5_NANO.name]: GPT5_NANO.supports.input,
	[GPT5_PRO.name]: GPT5_PRO.supports.input,
	[GPT5_CODEX.name]: GPT5_CODEX.supports.input,
	[GPT4_1.name]: GPT4_1.supports.input,
	[GPT4_1_MINI.name]: GPT4_1_MINI.supports.input,
	[GPT4_1_NANO.name]: GPT4_1_NANO.supports.input,
	[GPT_4O.name]: GPT_4O.supports.input,
	[GPT_4O_MINI.name]: GPT_4O_MINI.supports.input,
	[GPT_4_TURBO.name]: GPT_4_TURBO.supports.input,
	[CHATGPT_40.name]: CHATGPT_40.supports.input,
	[GPT_5_1_CHAT.name]: GPT_5_1_CHAT.supports.input,
	[GPT_5_CHAT.name]: GPT_5_CHAT.supports.input,
	[GPT_5_1_CODEX_MINI.name]: GPT_5_1_CODEX_MINI.supports.input,
	[CODEX_MINI_LATEST.name]: CODEX_MINI_LATEST.supports.input,
	[COMPUTER_USE_PREVIEW.name]: COMPUTER_USE_PREVIEW.supports.input,
	[O3.name]: O3.supports.input,
	[O3_PRO.name]: O3_PRO.supports.input,
	[O3_DEEP_RESEARCH.name]: O3_DEEP_RESEARCH.supports.input,
	[O4_MINI_DEEP_RESEARCH.name]: O4_MINI_DEEP_RESEARCH.supports.input,
	[O4_MINI.name]: O4_MINI.supports.input,
	[O1.name]: O1.supports.input,
	[O1_PRO.name]: O1_PRO.supports.input,
	[GPT_AUDIO.name]: GPT_AUDIO.supports.input,
	[GPT_AUDIO_MINI.name]: GPT_AUDIO_MINI.supports.input,
	[GPT_4O_AUDIO.name]: GPT_4O_AUDIO.supports.input,
	[GPT_4O_MINI_AUDIO.name]: GPT_4O_MINI_AUDIO.supports.input,
	[GPT_4.name]: GPT_4.supports.input,
	[GPT_3_5_TURBO.name]: GPT_3_5_TURBO.supports.input,
	[O3_MINI.name]: O3_MINI.supports.input,
	[GPT_4O_SEARCH_PREVIEW.name]: GPT_4O_SEARCH_PREVIEW.supports.input,
	[GPT_4O_MINI_SEARCH_PREVIEW.name]: GPT_4O_MINI_SEARCH_PREVIEW.supports.input,
	[GPT_5_4_MINI.name]: GPT_5_4_MINI.supports.input,
	[GPT_5_4_NANO.name]: GPT_5_4_NANO.supports.input,
	[GPT_5_4_IMAGE_2.name]: GPT_5_4_IMAGE_2.supports.input,
	[GPT_5_6.name]: GPT_5_6.supports.input,
	[GPT_5_6_SOL.name]: GPT_5_6_SOL.supports.input,
	[GPT_5_6_TERRA.name]: GPT_5_6_TERRA.supports.input,
	[GPT_5_6_LUNA.name]: GPT_5_6_LUNA.supports.input,
	[GPT_5_5.name]: GPT_5_5.supports.input,
	[GPT_5_5_PRO.name]: GPT_5_5_PRO.supports.input,
	[GPT_CHAT_LATEST.name]: GPT_CHAT_LATEST.supports.input,
	[GPT_5_6_LUNA_PRO.name]: GPT_5_6_LUNA_PRO.supports.input,
	[GPT_5_6_SOL_PRO.name]: GPT_5_6_SOL_PRO.supports.input,
	[GPT_5_6_TERRA_PRO.name]: GPT_5_6_TERRA_PRO.supports.input,
	[GPT_6_ASTRA.name]: GPT_6_ASTRA.supports.input,
	[GPT_6_ASTRA_PRO.name]: GPT_6_ASTRA_PRO.supports.input,
	[GPT_6_LUNA.name]: GPT_6_LUNA.supports.input,
	[GPT_6_LUNA_PRO.name]: GPT_6_LUNA_PRO.supports.input,
	[GPT_6_SOL.name]: GPT_6_SOL.supports.input,
	[GPT_6_SOL_PRO.name]: GPT_6_SOL_PRO.supports.input,
	[GPT_6_1_SOL.name]: GPT_6_1_SOL.supports.input,
	[GPT_6_1_SOL_PRO.name]: GPT_6_1_SOL_PRO.supports.input
};
/**
* The mid-conversation channels of each Responses model (from pi 0.87.1):
* added tools go out as an `additional_tools` item, and added prompts as a
* mid-conversation `developer` message. An unknown name gives `undefined`,
* so the adapter has no channels. `gpt-5.4` and `gpt-5.4-pro` are on pi's
* list but not in {@link OPENAI_CHAT_MODELS} yet, so the keys are strings.
*/
var OPENAI_MODEL_MID_CONVERSATION_CHANNELS = {
	"gpt-5.4": {
		tools: true,
		systemPrompts: true
	},
	[GPT_5_4_MINI.name]: {
		tools: true,
		systemPrompts: true
	},
	"gpt-5.4-pro": {
		tools: true,
		systemPrompts: true
	},
	[GPT_5_5.name]: {
		tools: true,
		systemPrompts: true
	},
	[GPT_5_6_LUNA.name]: {
		tools: true,
		systemPrompts: true
	},
	[GPT_5_6_SOL.name]: {
		tools: true,
		systemPrompts: true
	},
	[GPT_5_6_TERRA.name]: {
		tools: true,
		systemPrompts: true
	},
	[GPT_6_ASTRA.name]: {
		tools: true,
		systemPrompts: true
	},
	[GPT_6_LUNA.name]: {
		tools: true,
		systemPrompts: true
	},
	[GPT_6_SOL.name]: {
		tools: true,
		systemPrompts: true
	}
};
//#endregion
export { OPENAI_CHAT_MODELS, OPENAI_EMBEDDING_MODELS, OPENAI_IMAGE_MODELS, OPENAI_MODEL_INPUT_MODALITIES, OPENAI_MODEL_MID_CONVERSATION_CHANNELS, OPENAI_TRANSCRIPTION_MODELS, OPENAI_TTS_MODELS, OPENAI_VIDEO_MODELS, openAIModelRejectsSamplingParams, openAIModelUsesExplicitPromptCache };

//# sourceMappingURL=model-meta.js.map