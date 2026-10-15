//#region src/model-meta.ts
var LLAMA_3_3_70B_VERSATILE = {
	name: "llama-3.3-70b-versatile",
	context_window: 131072,
	max_completion_tokens: 32768,
	pricing: {
		input: { normal: .59 },
		output: { normal: .79 }
	},
	supports: {
		input: ["text"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"json_object"
		],
		tools: []
	}
};
var LLAMA_4_MAVERICK_17B_128E_INSTRUCT = {
	name: "meta-llama/llama-4-maverick-17b-128e-instruct",
	context_window: 131072,
	max_completion_tokens: 8192,
	pricing: {
		input: { normal: .2 },
		output: { normal: .6 }
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
			"vision"
		],
		tools: []
	}
};
var LLAMA_4_SCOUT_17B_16E_INSTRUCT = {
	name: "meta-llama/llama-4-scout-17b-16e-instruct",
	context_window: 131072,
	max_completion_tokens: 8192,
	pricing: {
		input: { normal: .05 },
		output: { normal: .08 }
	},
	supports: {
		input: ["text", "image"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"json_object"
		],
		tools: []
	}
};
var LLAMA_GUARD_4_12B = {
	name: "meta-llama/llama-guard-4-12b",
	context_window: 131072,
	max_completion_tokens: 1024,
	pricing: {
		input: { normal: .2 },
		output: { normal: .2 }
	},
	supports: {
		input: ["text", "image"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"json_object",
			"content_moderation",
			"vision"
		],
		tools: []
	}
};
var LLAMA_PROMPT_GUARD_2_86M = {
	name: "meta-llama/llama-prompt-guard-2-86m",
	context_window: 512,
	max_completion_tokens: 512,
	pricing: {
		input: { normal: .04 },
		output: { normal: .04 }
	},
	supports: {
		input: ["text"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"content_moderation",
			"json_object"
		],
		tools: []
	}
};
var LLAMA_3_1_8B_INSTANT = {
	name: "llama-3.1-8b-instant",
	context_window: 131072,
	max_completion_tokens: 131072,
	pricing: {
		input: { normal: .05 },
		output: { normal: .08 }
	},
	supports: {
		input: ["text"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"json_object",
			"tools"
		],
		tools: []
	}
};
var LLAMA_PROMPT_GUARD_2_22M = {
	name: "meta-llama/llama-prompt-guard-2-22m",
	context_window: 512,
	max_completion_tokens: 512,
	pricing: {
		input: { normal: .03 },
		output: { normal: .03 }
	},
	supports: {
		input: ["text"],
		output: ["text"],
		endpoints: ["chat"],
		features: ["streaming", "content_moderation"],
		tools: []
	}
};
var GPT_OSS_120B = {
	name: "openai/gpt-oss-120b",
	context_window: 131072,
	max_completion_tokens: 65536,
	pricing: {
		input: {
			normal: .15,
			cached: .075
		},
		output: { normal: .6 }
	},
	supports: {
		input: ["text"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"json_object",
			"json_schema",
			"tools",
			"browser_search",
			"code_execution",
			"reasoning"
		],
		tools: []
	}
};
var GPT_OSS_SAFEGUARD_20B = {
	name: "openai/gpt-oss-safeguard-20b",
	context_window: 131072,
	max_completion_tokens: 65536,
	pricing: {
		input: {
			normal: .075,
			cached: .037
		},
		output: { normal: .3 }
	},
	supports: {
		input: ["text"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"browser_search",
			"code_execution",
			"json_object",
			"json_schema",
			"reasoning",
			"content_moderation"
		],
		tools: []
	}
};
var GPT_OSS_20B = {
	name: "openai/gpt-oss-20b",
	context_window: 131072,
	max_completion_tokens: 65536,
	pricing: {
		input: {
			normal: .075,
			cached: .037
		},
		output: { normal: .3 }
	},
	supports: {
		input: ["text"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"browser_search",
			"code_execution",
			"json_object",
			"json_schema",
			"reasoning",
			"tools"
		],
		tools: []
	}
};
var KIMI_K2_INSTRUCT_0905 = {
	name: "moonshotai/kimi-k2-instruct-0905",
	context_window: 262144,
	max_completion_tokens: 16384,
	pricing: {
		input: {
			normal: 1,
			cached: .5
		},
		output: { normal: 3 }
	},
	supports: {
		input: ["text"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"json_object",
			"json_schema"
		],
		tools: []
	}
};
var QWEN3_32B = {
	name: "qwen/qwen3-32b",
	context_window: 131072,
	max_completion_tokens: 40960,
	pricing: {
		input: { normal: .29 },
		output: { normal: .59 }
	},
	supports: {
		input: ["text"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"json_object",
			"tools",
			"reasoning"
		],
		tools: []
	}
};
/**
* All supported Groq chat model identifiers.
*/
var GROQ_CHAT_MODELS = [
	LLAMA_3_1_8B_INSTANT.name,
	LLAMA_3_3_70B_VERSATILE.name,
	LLAMA_4_MAVERICK_17B_128E_INSTRUCT.name,
	LLAMA_4_SCOUT_17B_16E_INSTRUCT.name,
	LLAMA_GUARD_4_12B.name,
	LLAMA_PROMPT_GUARD_2_86M.name,
	LLAMA_PROMPT_GUARD_2_22M.name,
	GPT_OSS_20B.name,
	GPT_OSS_120B.name,
	GPT_OSS_SAFEGUARD_20B.name,
	KIMI_K2_INSTRUCT_0905.name,
	QWEN3_32B.name
];
/**
* Runtime map from Groq chat model name to its supported input modalities,
* read by the text adapter's `inputModalities`. `satisfies` ties it to
* {@link GroqModelInputModalitiesByName}, so the two cannot drift.
*/
var GROQ_MODEL_INPUT_MODALITIES = {
	[LLAMA_3_1_8B_INSTANT.name]: LLAMA_3_1_8B_INSTANT.supports.input,
	[LLAMA_3_3_70B_VERSATILE.name]: LLAMA_3_3_70B_VERSATILE.supports.input,
	[LLAMA_4_MAVERICK_17B_128E_INSTRUCT.name]: LLAMA_4_MAVERICK_17B_128E_INSTRUCT.supports.input,
	[LLAMA_4_SCOUT_17B_16E_INSTRUCT.name]: LLAMA_4_SCOUT_17B_16E_INSTRUCT.supports.input,
	[LLAMA_GUARD_4_12B.name]: LLAMA_GUARD_4_12B.supports.input,
	[LLAMA_PROMPT_GUARD_2_86M.name]: LLAMA_PROMPT_GUARD_2_86M.supports.input,
	[LLAMA_PROMPT_GUARD_2_22M.name]: LLAMA_PROMPT_GUARD_2_22M.supports.input,
	[GPT_OSS_20B.name]: GPT_OSS_20B.supports.input,
	[GPT_OSS_120B.name]: GPT_OSS_120B.supports.input,
	[GPT_OSS_SAFEGUARD_20B.name]: GPT_OSS_SAFEGUARD_20B.supports.input,
	[KIMI_K2_INSTRUCT_0905.name]: KIMI_K2_INSTRUCT_0905.supports.input,
	[QWEN3_32B.name]: QWEN3_32B.supports.input
};
/**
* All supported Groq transcription model identifiers.
*/
var GROQ_TRANSCRIPTION_MODELS = ["whisper-large-v3-turbo", "whisper-large-v3"];
/**
* All supported Groq TTS model identifiers.
*/
var GROQ_TTS_MODELS = [{
	name: "canopylabs/orpheus-v1-english",
	pricing: { input: { normal: 22 } },
	supports: {
		input: ["text"],
		output: ["audio"],
		endpoints: ["tts"],
		features: []
	}
}.name, {
	name: "canopylabs/orpheus-arabic-saudi",
	pricing: { input: { normal: 40 } },
	supports: {
		input: ["text"],
		output: ["audio"],
		endpoints: ["tts"],
		features: []
	}
}.name];
//#endregion
export { GROQ_CHAT_MODELS, GROQ_MODEL_INPUT_MODALITIES, GROQ_TRANSCRIPTION_MODELS, GROQ_TTS_MODELS };

//# sourceMappingURL=model-meta.js.map