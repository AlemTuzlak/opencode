//#region src/model-meta.ts
var GPT_5_6_TERRA = {
	name: "gpt-5.6-terra",
	context_window: 105e4,
	max_completion_tokens: 128e3,
	pricing: {
		input: {
			normal: 2.5,
			cached: .25
		},
		output: { normal: 15 }
	},
	supports: {
		input: ["text", "image"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"json_object",
			"json_schema",
			"reasoning",
			"vision"
		],
		tools: []
	}
};
var GPT_5_5 = {
	name: "gpt-5.5",
	context_window: 105e4,
	max_completion_tokens: 128e3,
	pricing: {
		input: {
			normal: 5,
			cached: .5
		},
		output: { normal: 30 }
	},
	supports: {
		input: ["text", "image"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"json_object",
			"json_schema",
			"reasoning",
			"vision"
		],
		tools: []
	}
};
var GPT_5_4_MINI = {
	name: "gpt-5.4-mini",
	context_window: 4e5,
	max_completion_tokens: 128e3,
	pricing: {
		input: {
			normal: .75,
			cached: .075
		},
		output: { normal: 4.5 }
	},
	supports: {
		input: ["text", "image"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"json_object",
			"json_schema",
			"reasoning",
			"vision"
		],
		tools: []
	}
};
var CLAUDE_OPUS_5 = {
	name: "claude-opus-5",
	context_window: 1e6,
	max_completion_tokens: 128e3,
	pricing: {
		input: {
			normal: 5,
			cached: .5
		},
		output: { normal: 25 }
	},
	supports: {
		input: ["text", "image"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"reasoning",
			"vision"
		],
		tools: []
	}
};
var CLAUDE_SONNET_5 = {
	name: "claude-sonnet-5",
	context_window: 1e6,
	max_completion_tokens: 128e3,
	pricing: {
		input: {
			normal: 2,
			cached: .2
		},
		output: { normal: 10 }
	},
	supports: {
		input: ["text", "image"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"reasoning",
			"vision"
		],
		tools: []
	}
};
var CLAUDE_HAIKU_4_5 = {
	name: "claude-haiku-4-5",
	context_window: 2e5,
	max_completion_tokens: 64e3,
	pricing: {
		input: {
			normal: 1,
			cached: .1
		},
		output: { normal: 5 }
	},
	supports: {
		input: ["text", "image"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"json_object",
			"json_schema",
			"reasoning",
			"vision"
		],
		tools: []
	}
};
var GEMINI_PRO_LATEST = {
	name: "gemini-pro-latest",
	context_window: 1048576,
	max_completion_tokens: 65536,
	pricing: {
		input: {
			normal: 2,
			cached: .2
		},
		output: { normal: 12 }
	},
	supports: {
		input: ["text", "image"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"json_object",
			"json_schema",
			"reasoning",
			"vision"
		],
		tools: []
	}
};
var GEMINI_3_6_FLASH = {
	name: "gemini-3.6-flash",
	context_window: 1048576,
	max_completion_tokens: 65536,
	pricing: {
		input: {
			normal: 1.5,
			cached: .15
		},
		output: { normal: 7.5 }
	},
	supports: {
		input: ["text", "image"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"json_object",
			"json_schema",
			"reasoning",
			"vision"
		],
		tools: []
	}
};
var KIMI_K3 = {
	name: "kimi-k3",
	context_window: 1048576,
	max_completion_tokens: 1048576,
	pricing: {
		input: {
			normal: 3,
			cached: .3
		},
		output: { normal: 15 }
	},
	supports: {
		input: ["text", "image"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"json_object",
			"json_schema",
			"reasoning",
			"vision"
		],
		tools: []
	}
};
var GLM_5_2 = {
	name: "glm-5.2",
	context_window: 1e6,
	max_completion_tokens: 128e3,
	pricing: {
		input: {
			normal: 1.4,
			cached: .26
		},
		output: { normal: 4.4 }
	},
	supports: {
		input: ["text"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"json_object",
			"json_schema",
			"reasoning"
		],
		tools: []
	}
};
var DEEPSEEK_V4_PRO = {
	name: "deepseek-v4-pro",
	context_window: 105e4,
	max_completion_tokens: 393216,
	pricing: {
		input: { normal: .435 },
		output: { normal: .87 }
	},
	supports: {
		input: ["text"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"json_object",
			"json_schema",
			"reasoning"
		],
		tools: []
	}
};
var QWEN_3_7_MAX = {
	name: "qwen3.7-max",
	context_window: 1e6,
	max_completion_tokens: 65536,
	pricing: {
		input: {
			normal: 2.5,
			cached: .5
		},
		output: { normal: 7.5 }
	},
	supports: {
		input: ["text"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"json_object",
			"json_schema",
			"reasoning"
		],
		tools: []
	}
};
var MINIMAX_M2_5 = {
	name: "minimax-m2.5",
	context_window: 204800,
	max_completion_tokens: 131100,
	pricing: {
		input: {
			normal: .3,
			cached: .03
		},
		output: { normal: 1.2 }
	},
	supports: {
		input: ["text"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"reasoning"
		],
		tools: []
	}
};
var GROK_4_5 = {
	name: "grok-4-5",
	context_window: 5e5,
	pricing: {
		input: {
			normal: 2,
			cached: .5
		},
		output: { normal: 6 }
	},
	supports: {
		input: ["text", "image"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"json_object",
			"json_schema",
			"reasoning",
			"vision"
		],
		tools: []
	}
};
/**
* Curated LLM Gateway chat model identifiers.
*
* Any model on https://llmgateway.io/models works at runtime; these curated
* entries carry per-model type metadata (input modalities, provider
* options).
*/
var LLMGATEWAY_CHAT_MODELS = [
	GPT_5_6_TERRA.name,
	GPT_5_5.name,
	GPT_5_4_MINI.name,
	CLAUDE_OPUS_5.name,
	CLAUDE_SONNET_5.name,
	CLAUDE_HAIKU_4_5.name,
	GEMINI_PRO_LATEST.name,
	GEMINI_3_6_FLASH.name,
	KIMI_K3.name,
	GLM_5_2.name,
	DEEPSEEK_V4_PRO.name,
	QWEN_3_7_MAX.name,
	MINIMAX_M2_5.name,
	GROK_4_5.name
];
/**
* Runtime map from curated LLM Gateway chat model name to its supported
* input modalities, read by the text adapter's `inputModalities`. An
* uncurated id is not in it. `satisfies` ties it to
* {@link LLMGatewayModelInputModalitiesByName}, so the two cannot drift.
*/
var LLMGATEWAY_MODEL_INPUT_MODALITIES = {
	[GPT_5_6_TERRA.name]: GPT_5_6_TERRA.supports.input,
	[GPT_5_5.name]: GPT_5_5.supports.input,
	[GPT_5_4_MINI.name]: GPT_5_4_MINI.supports.input,
	[CLAUDE_OPUS_5.name]: CLAUDE_OPUS_5.supports.input,
	[CLAUDE_SONNET_5.name]: CLAUDE_SONNET_5.supports.input,
	[CLAUDE_HAIKU_4_5.name]: CLAUDE_HAIKU_4_5.supports.input,
	[GEMINI_PRO_LATEST.name]: GEMINI_PRO_LATEST.supports.input,
	[GEMINI_3_6_FLASH.name]: GEMINI_3_6_FLASH.supports.input,
	[KIMI_K3.name]: KIMI_K3.supports.input,
	[GLM_5_2.name]: GLM_5_2.supports.input,
	[DEEPSEEK_V4_PRO.name]: DEEPSEEK_V4_PRO.supports.input,
	[QWEN_3_7_MAX.name]: QWEN_3_7_MAX.supports.input,
	[MINIMAX_M2_5.name]: MINIMAX_M2_5.supports.input,
	[GROK_4_5.name]: GROK_4_5.supports.input
};
//#endregion
export { LLMGATEWAY_CHAT_MODELS, LLMGATEWAY_MODEL_INPUT_MODALITIES };

//# sourceMappingURL=model-meta.js.map