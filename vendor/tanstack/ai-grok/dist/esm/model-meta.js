//#region src/model-meta.ts
var GROK_4_5 = {
	name: "grok-4.5",
	context_window: 5e5,
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		capabilities: [
			"reasoning",
			"structured_outputs",
			"tool_calling"
		],
		tools: []
	},
	pricing: {
		input: {
			normal: 2,
			cached: .3
		},
		output: { normal: 6 }
	}
};
var GROK_4_6 = {
	name: "grok-4.6",
	context_window: 5e5,
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		capabilities: [
			"reasoning",
			"structured_outputs",
			"tool_calling"
		],
		tools: []
	},
	pricing: {
		input: {
			normal: 2,
			cached: .5
		},
		output: { normal: 6 }
	}
};
var GROK_4_7 = {
	name: "grok-4.7",
	context_window: 5e5,
	max_output_tokens: 45e4,
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		capabilities: [
			"reasoning",
			"structured_outputs",
			"tool_calling"
		],
		tools: []
	},
	pricing: {
		input: {
			normal: 1.6,
			cached: .4
		},
		output: { normal: 4.8 }
	}
};
var GROK_RESPONSES_TOOLS = [
	"web_search",
	"x_search",
	"file_search",
	"mcp"
];
var GROK_IMAGINE_IMAGE = {
	name: "grok-imagine-image",
	supports: {
		input: ["text", "image"],
		output: ["image"]
	},
	pricing: {
		input: { normal: 0 },
		output: { normal: .02 }
	}
};
var GROK_IMAGINE_IMAGE_QUALITY = {
	name: "grok-imagine-image-quality",
	supports: {
		input: ["text", "image"],
		output: ["image"]
	},
	pricing: {
		input: { normal: 0 },
		output: { normal: .05 }
	}
};
var GROK_IMAGINE_IMAGE_2_0 = {
	name: "grok-imagine-image-2.0",
	supports: {
		input: ["text", "image"],
		output: ["image"]
	},
	pricing: {
		input: { normal: 0 },
		output: { normal: .04 }
	}
};
var GROK_IMAGINE_VIDEO = {
	name: "grok-imagine-video",
	supports: {
		input: [
			"text",
			"image",
			"video"
		],
		output: ["video", "audio"]
	},
	pricing: {
		input: { normal: 0 },
		output: { normal: .05 }
	}
};
var GROK_IMAGINE_VIDEO_1_5 = {
	name: "grok-imagine-video-1.5",
	supports: {
		input: ["text", "image"],
		output: ["video", "audio"]
	},
	pricing: {
		input: { normal: 0 },
		output: { normal: .08 }
	}
};
var GROK_4_3 = {
	name: "grok-4.3",
	context_window: 1e6,
	supports: {
		input: ["text", "image"],
		output: ["text"],
		capabilities: [
			"reasoning",
			"structured_outputs",
			"tool_calling"
		],
		tools: GROK_RESPONSES_TOOLS
	},
	pricing: {
		input: {
			normal: 1.25,
			cached: .2
		},
		output: { normal: 2.5 }
	}
};
var GROK_BUILD_0_1 = {
	name: "grok-build-0.1",
	context_window: 256e3,
	supports: {
		input: ["text", "image"],
		output: ["text"],
		capabilities: [
			"reasoning",
			"structured_outputs",
			"tool_calling"
		],
		tools: GROK_RESPONSES_TOOLS
	},
	pricing: {
		input: {
			normal: 1,
			cached: .2
		},
		output: { normal: 2 }
	}
};
var GROK_4_20_REASONING = {
	name: "grok-4.20-reasoning",
	context_window: 1e6,
	supports: {
		input: ["text", "image"],
		output: ["text"],
		capabilities: [
			"reasoning",
			"structured_outputs",
			"tool_calling"
		],
		tools: []
	}
};
var GROK_4_20_NON_REASONING = {
	name: "grok-4.20-non-reasoning",
	context_window: 1e6,
	supports: {
		input: ["text", "image"],
		output: ["text"],
		capabilities: ["structured_outputs", "tool_calling"],
		tools: []
	}
};
var GROK_4_1_FAST_REASONING = {
	name: "grok-4.1-fast-reasoning",
	context_window: 2e6,
	supports: {
		input: ["text", "image"],
		output: ["text"],
		capabilities: [
			"reasoning",
			"structured_outputs",
			"tool_calling"
		],
		tools: []
	}
};
var GROK_4_1_FAST_NON_REASONING = {
	name: "grok-4.1-fast-non-reasoning",
	context_window: 2e6,
	supports: {
		input: ["text", "image"],
		output: ["text"],
		capabilities: ["structured_outputs", "tool_calling"],
		tools: []
	}
};
/**
* Grok chat models supported by the xAI Responses adapter.
*/
var GROK_CHAT_MODELS = [
	GROK_4_7.name,
	GROK_4_5.name,
	GROK_4_6.name,
	GROK_BUILD_0_1.name,
	GROK_4_3.name
];
/**
* Grok chat models on Vertex AI / Gemini Enterprise Agent Platform.
* This list is the Google partner catalog, not the xAI API catalog.
*/
var GROK_VERTEX_CHAT_MODELS = [
	GROK_4_3.name,
	GROK_4_20_REASONING.name,
	GROK_4_20_NON_REASONING.name,
	GROK_4_1_FAST_REASONING.name,
	GROK_4_1_FAST_NON_REASONING.name
];
/**
* Grok Image Generation Models
*/
var GROK_IMAGE_MODELS = [
	GROK_IMAGINE_IMAGE.name,
	GROK_IMAGINE_IMAGE_2_0.name,
	GROK_IMAGINE_IMAGE_QUALITY.name
];
/**
* Grok Video Generation Models (xAI Imagine API)
*
* @experimental Video generation is an experimental feature and may change.
*/
var GROK_VIDEO_MODELS = [GROK_IMAGINE_VIDEO.name, GROK_IMAGINE_VIDEO_1_5.name];
var GROK_TTS = {
	name: "grok-tts",
	supports: {
		input: ["text"],
		output: ["audio"]
	}
};
var GROK_STT = {
	name: "grok-stt",
	supports: {
		input: ["audio"],
		output: ["text"]
	}
};
var GROK_VOICE_FAST_1 = {
	name: "grok-voice-fast-1.0",
	supports: {
		input: ["audio", "text"],
		output: ["audio", "text"],
		capabilities: ["tool_calling"],
		tools: []
	}
};
/** @deprecated xAI has deprecated grok-voice-think-fast-1.0 — use grok-voice-think-fast-2.0. */
var GROK_VOICE_THINK_FAST_1 = {
	name: "grok-voice-think-fast-1.0",
	supports: {
		input: ["audio", "text"],
		output: ["audio", "text"],
		capabilities: ["reasoning", "tool_calling"],
		tools: []
	}
};
var GROK_VOICE_THINK_FAST_2 = {
	name: "grok-voice-think-fast-2.0",
	supports: {
		input: ["audio", "text"],
		output: ["audio", "text"],
		capabilities: ["reasoning", "tool_calling"],
		tools: []
	}
};
var GROK_VOICE_LATEST = {
	name: "grok-voice-latest",
	supports: {
		input: ["audio", "text"],
		output: ["audio", "text"],
		capabilities: ["reasoning", "tool_calling"],
		tools: []
	}
};
var GROK_TTS_MODELS = [GROK_TTS.name];
var GROK_TRANSCRIPTION_MODELS = [GROK_STT.name];
var GROK_REALTIME_MODELS = [
	GROK_VOICE_THINK_FAST_2.name,
	GROK_VOICE_LATEST.name,
	GROK_VOICE_FAST_1.name,
	GROK_VOICE_THINK_FAST_1.name
];
/**
* Default speech-to-speech model used by the realtime token issuer and the
* realtime client adapter when no model is specified. Single source of truth
* so a future default bump cannot leave the two sides disagreeing.
*/
var GROK_DEFAULT_REALTIME_MODEL = "grok-voice-think-fast-2.0";
/**
* Runtime map from Grok chat model name to its supported input modalities,
* read by the text adapter's `inputModalities`. `satisfies` ties it to
* {@link GrokModelInputModalitiesByName}, so the two cannot drift.
*/
var GROK_MODEL_INPUT_MODALITIES = {
	[GROK_4_3.name]: GROK_4_3.supports.input,
	[GROK_BUILD_0_1.name]: GROK_BUILD_0_1.supports.input,
	[GROK_4_5.name]: GROK_4_5.supports.input,
	[GROK_4_6.name]: GROK_4_6.supports.input,
	[GROK_4_20_REASONING.name]: GROK_4_20_REASONING.supports.input,
	[GROK_4_20_NON_REASONING.name]: GROK_4_20_NON_REASONING.supports.input,
	[GROK_4_1_FAST_REASONING.name]: GROK_4_1_FAST_REASONING.supports.input,
	[GROK_4_1_FAST_NON_REASONING.name]: GROK_4_1_FAST_NON_REASONING.supports.input,
	[GROK_4_7.name]: GROK_4_7.supports.input
};
//#endregion
export { GROK_CHAT_MODELS, GROK_DEFAULT_REALTIME_MODEL, GROK_IMAGE_MODELS, GROK_MODEL_INPUT_MODALITIES, GROK_REALTIME_MODELS, GROK_TRANSCRIPTION_MODELS, GROK_TTS_MODELS, GROK_VERTEX_CHAT_MODELS, GROK_VIDEO_MODELS };

//# sourceMappingURL=model-meta.js.map