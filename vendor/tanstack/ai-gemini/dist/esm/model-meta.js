//#region src/model-meta.ts
var GEMINI_3_1_PRO = {
	name: "gemini-3.1-pro-preview",
	max_input_tokens: 1048576,
	max_output_tokens: 65536,
	knowledge_cutoff: "2025-01-01",
	supports: {
		input: [
			"text",
			"image",
			"audio",
			"video",
			"document"
		],
		output: ["text"],
		capabilities: [
			"batch_api",
			"caching",
			"function_calling",
			"structured_output",
			"thinking"
		],
		tools: [
			"code_execution",
			"file_search",
			"google_search",
			"url_context"
		]
	},
	pricing: {
		input: { normal: 2.5 },
		output: { normal: 15 }
	}
};
var GEMINI_3_FLASH = {
	name: "gemini-3-flash-preview",
	max_input_tokens: 1048576,
	max_output_tokens: 65536,
	knowledge_cutoff: "2025-01-01",
	supports: {
		input: [
			"text",
			"image",
			"audio",
			"video",
			"document"
		],
		output: ["text"],
		capabilities: [
			"batch_api",
			"caching",
			"function_calling",
			"structured_output",
			"thinking"
		],
		tools: [
			"code_execution",
			"file_search",
			"google_search",
			"url_context"
		]
	},
	pricing: {
		input: { normal: .5 },
		output: { normal: 3 }
	}
};
/**
* Gemini 3 Pro Image ("Nano Banana Pro") — GA. Accepts the ten standard
* aspect ratios at 1K / 2K / 4K.
* @see https://ai.google.dev/gemini-api/docs/models/gemini-3-pro-image
*/
var GEMINI_3_PRO_IMAGE = {
	name: "gemini-3-pro-image",
	max_input_tokens: 65536,
	max_output_tokens: 32768,
	knowledge_cutoff: "2025-01-01",
	supports: {
		input: ["text", "image"],
		output: ["text", "image"],
		capabilities: [
			"batch_api",
			"structured_output",
			"thinking"
		],
		tools: ["google_search"]
	},
	pricing: {
		input: { normal: 2 },
		output: { normal: .134 }
	}
};
/**
* @deprecated `gemini-3-pro-image-preview` was shut down on 2026-06-25. Use
* the GA id `gemini-3-pro-image` instead — the preview id now 404s.
* Kept in the model union so existing code still compiles.
* @see https://ai.google.dev/gemini-api/docs/deprecations
*/
var GEMINI_3_PRO_IMAGE_PREVIEW = {
	name: "gemini-3-pro-image-preview",
	max_input_tokens: 65536,
	max_output_tokens: 32768,
	knowledge_cutoff: "2025-01-01",
	supports: {
		input: ["text", "image"],
		output: ["text", "image"],
		capabilities: [
			"batch_api",
			"structured_output",
			"thinking"
		],
		tools: ["google_search"]
	},
	pricing: {
		input: { normal: 2 },
		output: { normal: .134 }
	}
};
/**
* Gemini 3.1 Flash Image ("Nano Banana 2") — GA. The only native image model
* that accepts the four extreme banner ratios (1:4, 4:1, 1:8, 8:1) and the
* 512 (0.5K) resolution tier.
* @see https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-image
*/
var GEMINI_3_1_FLASH_IMAGE = {
	name: "gemini-3.1-flash-image",
	max_input_tokens: 131072,
	max_output_tokens: 32768,
	knowledge_cutoff: "2025-01-01",
	supports: {
		input: ["text", "image"],
		output: ["text", "image"],
		capabilities: ["batch_api", "thinking"],
		tools: ["google_search"]
	},
	pricing: {
		input: { normal: .5 },
		output: { normal: 3 }
	}
};
/**
* @deprecated `gemini-3.1-flash-image-preview` was shut down on 2026-06-25.
* Use the GA id `gemini-3.1-flash-image` instead — the preview id now 404s.
* Kept in the model union so existing code still compiles.
* @see https://ai.google.dev/gemini-api/docs/deprecations
*/
var GEMINI_3_1_FLASH_IMAGE_PREVIEW = {
	name: "gemini-3.1-flash-image-preview",
	max_input_tokens: 65536,
	max_output_tokens: 65536,
	knowledge_cutoff: "2025-01-01",
	supports: {
		input: ["text", "image"],
		output: ["text", "image"],
		capabilities: [
			"batch_api",
			"structured_output",
			"thinking"
		],
		tools: ["google_search"]
	},
	pricing: {
		input: { normal: .25 },
		output: { normal: 1.5 }
	}
};
/**
* Gemini 3.1 Flash Lite Image ("Nano Banana 2 Lite") — GA. 1K output only.
* @see https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite-image
*/
var GEMINI_3_1_FLASH_LITE_IMAGE = {
	name: "gemini-3.1-flash-lite-image",
	max_input_tokens: 65536,
	max_output_tokens: 65536,
	knowledge_cutoff: "2025-01-01",
	supports: {
		input: ["text", "image"],
		output: ["text", "image"],
		capabilities: [
			"batch_api",
			"structured_output",
			"thinking"
		],
		tools: ["google_search"]
	},
	pricing: {
		input: { normal: .25 },
		output: { normal: 1.5 }
	}
};
/**
* Nano Banana 2.1 — GA. 1K / 2K / 4K output, no 512 tier. The id does not
* follow the `gemini-<version>-flash-image` pattern of the earlier models.
* Token limits are the values `GET /v1beta/models` returns.
* @see https://ai.google.dev/gemini-api/docs/models/gemini-nano-banana-2.1
*/
var GEMINI_NANO_BANANA_2_1 = {
	name: "gemini-nano-banana-2.1",
	max_input_tokens: 65536,
	max_output_tokens: 65536,
	supports: {
		input: ["text", "image"],
		output: ["text", "image"],
		capabilities: ["batch_api", "thinking"],
		tools: ["google_search"]
	},
	pricing: {
		input: { normal: 1.5 },
		output: { normal: 7.5 }
	}
};
var GEMINI_3_1_FLASH_LITE = {
	name: "gemini-3.1-flash-lite",
	max_input_tokens: 1048576,
	max_output_tokens: 65536,
	knowledge_cutoff: "2025-01-01",
	supports: {
		input: [
			"text",
			"image",
			"audio",
			"video",
			"document"
		],
		output: ["text"],
		capabilities: [
			"batch_api",
			"caching",
			"function_calling",
			"structured_output",
			"thinking"
		],
		tools: [
			"code_execution",
			"file_search",
			"google_search",
			"url_context"
		]
	},
	pricing: {
		input: { normal: .25 },
		output: { normal: 1.5 }
	}
};
var GEMINI_3_1_FLASH_LITE_PREVIEW = {
	name: "gemini-3.1-flash-lite-preview",
	max_input_tokens: 1048576,
	max_output_tokens: 65536,
	knowledge_cutoff: "2025-01-01",
	supports: {
		input: [
			"text",
			"image",
			"audio",
			"video",
			"document"
		],
		output: ["text"],
		capabilities: [
			"batch_api",
			"caching",
			"function_calling",
			"structured_output",
			"thinking"
		],
		tools: [
			"code_execution",
			"file_search",
			"google_search",
			"url_context"
		]
	},
	pricing: {
		input: { normal: .25 },
		output: { normal: 1.5 }
	}
};
var GEMINI_2_5_PRO = {
	name: "gemini-2.5-pro",
	max_input_tokens: 1048576,
	max_output_tokens: 65536,
	knowledge_cutoff: "2025-01-01",
	supports: {
		input: [
			"text",
			"image",
			"audio",
			"video",
			"document"
		],
		output: ["text"],
		capabilities: [
			"batch_api",
			"caching",
			"function_calling",
			"structured_output",
			"thinking"
		],
		tools: [
			"code_execution",
			"file_search",
			"google_maps",
			"google_search",
			"url_context"
		]
	},
	pricing: {
		input: { normal: 2.5 },
		output: { normal: 15 }
	}
};
var GEMINI_2_5_PRO_TTS = {
	name: "gemini-2.5-pro-preview-tts",
	max_input_tokens: 8192,
	max_output_tokens: 16384,
	knowledge_cutoff: "2025-05-01",
	supports: {
		input: ["text"],
		output: ["audio"],
		capabilities: ["audio_generation"]
	},
	pricing: {
		input: { normal: 2.5 },
		output: { normal: 15 }
	}
};
var GEMINI_2_5_FLASH = {
	name: "gemini-2.5-flash",
	max_input_tokens: 1048576,
	max_output_tokens: 65536,
	knowledge_cutoff: "2025-01-01",
	supports: {
		input: [
			"text",
			"image",
			"audio",
			"video"
		],
		output: ["text"],
		capabilities: [
			"batch_api",
			"caching",
			"function_calling",
			"structured_output",
			"thinking"
		],
		tools: [
			"code_execution",
			"file_search",
			"google_maps",
			"google_search",
			"url_context"
		]
	},
	pricing: {
		input: { normal: 1 },
		output: { normal: 2.5 }
	}
};
/**
* Gemini 2.5 Flash Image ("Nano Banana") — still GA, but documented as the
* legacy member of the family. Google publishes no `image_size` value for it,
* so its size type is a bare aspect ratio and the adapter sends no
* `imageConfig.imageSize`.
* @deprecated `gemini-2.5-flash-image` shuts down on 2026-10-02. Migrate to
* `gemini-3.1-flash-lite-image` (cheapest successor) or
* `gemini-3.1-flash-image`. Google's deprecations table still names the
* already-dead `gemini-3.1-flash-image-preview` as the replacement.
* @see https://ai.google.dev/gemini-api/docs/deprecations
*/
var GEMINI_2_5_FLASH_IMAGE = {
	name: "gemini-2.5-flash-image",
	max_input_tokens: 1048576,
	max_output_tokens: 65536,
	knowledge_cutoff: "2025-06-01",
	supports: {
		input: ["text", "image"],
		output: ["text", "image"],
		capabilities: [
			"batch_api",
			"caching",
			"structured_output"
		],
		tools: ["file_search"]
	},
	pricing: {
		input: { normal: .3 },
		output: { normal: .4 }
	}
};
/**
const GEMINI_2_5_FLASH_LIVE = {
name: 'gemini-2.5-flash-native-audio-preview-09-2025',
max_input_tokens: 141_072,
max_output_tokens: 8_192,
knowledge_cutoff: '2025-01-01',
supports: {
input: ['text', 'audio', 'video'],
output: ['text', 'audio'],
capabilities: [
'audio_generation',
'file_search',
'function_calling',
'live_api',
'search_grounding',
'thinking',
],
},
pricing: {
// todo find this info
input: {
normal: 0,
},
output: {
normal: 0,
},
},
} as const satisfies ModelMeta<
GeminiToolConfigOptions &
GeminiSafetyOptions &
GeminiGenerationConfigOptions &
GeminiCachedContentOptions
>
*/
var GEMINI_2_5_FLASH_TTS = {
	name: "gemini-2.5-flash-preview-tts",
	max_input_tokens: 8192,
	max_output_tokens: 16384,
	knowledge_cutoff: "2025-05-01",
	supports: {
		input: ["text"],
		output: ["audio"],
		capabilities: ["audio_generation", "batch_api"]
	},
	pricing: {
		input: { normal: 1 },
		output: { normal: 2.5 }
	}
};
/**
* Gemini 3.1 Flash TTS Preview - latest expressive TTS model with
* 200+ audio tags, 70+ languages, and multi-speaker dialogue support.
* @see https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-tts-preview
*/
var GEMINI_3_1_FLASH_TTS = {
	name: "gemini-3.1-flash-tts-preview",
	max_input_tokens: 32768,
	max_output_tokens: 16384,
	knowledge_cutoff: "2025-05-01",
	supports: {
		input: ["text"],
		output: ["audio"],
		capabilities: ["audio_generation", "batch_api"]
	},
	pricing: {
		input: { normal: .5 },
		output: { normal: 10 }
	}
};
/**
* Lyria 3 Pro Preview — Google's flagship music generation model.
* Generates full-length songs with multiple verses, choruses, and bridges.
* Outputs MP3 or WAV at 48 kHz stereo.
* @see https://ai.google.dev/gemini-api/docs/models/lyria-3-pro-preview
*/
var LYRIA_3_PRO = {
	name: "lyria-3-pro-preview",
	max_input_tokens: 131072,
	supports: {
		input: ["text", "image"],
		output: ["audio"],
		capabilities: ["audio_generation"]
	},
	pricing: {
		input: { normal: 0 },
		output: { normal: 0 }
	}
};
/**
* Lyria 3 Clip Preview — 30-second music clips in MP3 format.
* @see https://ai.google.dev/gemini-api/docs/music-generation
*/
var LYRIA_3_CLIP = {
	name: "lyria-3-clip-preview",
	max_input_tokens: 131072,
	supports: {
		input: ["text", "image"],
		output: ["audio"],
		capabilities: ["audio_generation"]
	},
	pricing: {
		input: { normal: 0 },
		output: { normal: 0 }
	}
};
var GEMINI_2_5_FLASH_LITE = {
	name: "gemini-2.5-flash-lite",
	max_input_tokens: 1048576,
	max_output_tokens: 65536,
	knowledge_cutoff: "2025-01-01",
	supports: {
		input: [
			"text",
			"image",
			"audio",
			"video",
			"document"
		],
		output: ["text"],
		capabilities: [
			"batch_api",
			"caching",
			"function_calling",
			"structured_output",
			"thinking"
		],
		tools: [
			"code_execution",
			"google_maps",
			"google_search",
			"url_context"
		]
	},
	pricing: {
		input: { normal: .1 },
		output: { normal: .4 }
	}
};
var IMAGEN_4_GENERATE = {
	name: "imagen-4.0-generate-001",
	max_input_tokens: 480,
	max_output_tokens: 4,
	supports: {
		input: ["text"],
		output: ["image"]
	},
	pricing: {
		input: { normal: 0 },
		output: { normal: .4 }
	}
};
var IMAGEN_4_GENERATE_ULTRA = {
	name: "imagen-4.0-ultra-generate-001",
	max_input_tokens: 480,
	max_output_tokens: 4,
	supports: {
		input: ["text"],
		output: ["image"]
	},
	pricing: {
		input: { normal: 0 },
		output: { normal: .6 }
	}
};
var IMAGEN_4_GENERATE_FAST = {
	name: "imagen-4.0-fast-generate-001",
	max_input_tokens: 480,
	max_output_tokens: 4,
	supports: {
		input: ["text"],
		output: ["image"]
	},
	pricing: {
		input: { normal: 0 },
		output: { normal: .2 }
	}
};
/**
* Veo video generation models. Pricing is per second of generated video
* (audio+video rate where the model supports audio).
* @experimental Veo video generation is an experimental feature and may change.
*/
var VEO_3_1_PREVIEW = {
	name: "veo-3.1-generate-preview",
	max_input_tokens: 1024,
	max_output_tokens: 1,
	supports: {
		input: ["text", "image"],
		output: ["video", "audio"]
	},
	pricing: {
		input: { normal: 0 },
		output: { normal: .4 }
	}
};
var VEO_3_1_FAST_PREVIEW = {
	name: "veo-3.1-fast-generate-preview",
	max_input_tokens: 1024,
	max_output_tokens: 1,
	supports: {
		input: ["text", "image"],
		output: ["video", "audio"]
	},
	pricing: {
		input: { normal: 0 },
		output: { normal: .15 }
	}
};
var VEO_3_1_LITE_PREVIEW = {
	name: "veo-3.1-lite-generate-preview",
	max_input_tokens: 1024,
	max_output_tokens: 1,
	supports: {
		input: ["text", "image"],
		output: ["video", "audio"]
	},
	pricing: {
		input: { normal: 0 },
		output: { normal: .05 }
	}
};
/**
* Gemini Omni 1.1 Flash — GA. Multimodal video generation with
* conversational editing. Serves only the Interactions API
* (`generateContent` rejects it), so it routes through the
* interactions-based path of the video adapter, not Veo's
* `:predictLongRunning` flow. Pricing is per second of generated video
* ($0.10/sec). 360p / 720p (default) / 1080p / 4k at 24 FPS, 3–10 second
* clips (default 10s).
* @see https://ai.google.dev/gemini-api/docs/models/gemini-omni-flash
* @experimental Omni video generation is an experimental feature and may change.
*/
var GEMINI_OMNI_1_1_FLASH = {
	name: "gemini-omni-1.1-flash",
	max_input_tokens: 1048576,
	max_output_tokens: 1,
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
		output: { normal: .1 }
	}
};
var GEMINI_3_8_FLASH = {
	name: "gemini-3.8-flash",
	max_input_tokens: 1048576,
	max_output_tokens: 65536,
	knowledge_cutoff: "2026-03-01",
	supports: {
		input: [
			"text",
			"image",
			"video",
			"audio",
			"document"
		],
		output: ["text"],
		capabilities: [
			"agentic_video",
			"batch_api",
			"caching",
			"function_calling",
			"structured_output",
			"thinking"
		],
		tools: [
			"code_execution",
			"file_search",
			"google_search",
			"google_maps",
			"url_context",
			"computer_use"
		]
	},
	pricing: {
		input: {
			normal: .75,
			cached: .075
		},
		output: { normal: 3.75 }
	}
};
var GEMINI_3_7_FLASH = {
	name: "gemini-3.7-flash",
	max_input_tokens: 1048576,
	max_output_tokens: 65536,
	knowledge_cutoff: "2026-03-01",
	supports: {
		input: [
			"text",
			"image",
			"video",
			"audio",
			"document"
		],
		output: ["text"],
		capabilities: [
			"agentic_video",
			"batch_api",
			"caching",
			"function_calling",
			"structured_output",
			"thinking"
		],
		tools: [
			"code_execution",
			"file_search",
			"google_search",
			"google_maps",
			"url_context",
			"computer_use"
		]
	},
	pricing: {
		input: {
			normal: .75,
			cached: .075
		},
		output: { normal: 3.75 }
	}
};
var GEMINI_3_6_FLASH = {
	name: "gemini-3.6-flash",
	max_input_tokens: 1048576,
	max_output_tokens: 65536,
	knowledge_cutoff: "2026-03-01",
	supports: {
		input: [
			"text",
			"image",
			"video",
			"audio",
			"document"
		],
		output: ["text"],
		capabilities: [
			"agentic_video",
			"batch_api",
			"caching",
			"function_calling",
			"structured_output",
			"thinking"
		],
		tools: [
			"code_execution",
			"file_search",
			"google_search",
			"google_maps",
			"url_context",
			"computer_use"
		]
	},
	pricing: {
		input: {
			normal: 1.5,
			cached: .15
		},
		output: { normal: 7.5 }
	}
};
var GEMINI_3_5_FLASH = {
	name: "gemini-3.5-flash",
	max_input_tokens: 1048576,
	max_output_tokens: 65536,
	supports: {
		input: [
			"text",
			"image",
			"video",
			"document",
			"audio"
		],
		output: ["text"],
		capabilities: [
			"batch_api",
			"caching",
			"function_calling",
			"structured_output",
			"thinking"
		],
		tools: [
			"code_execution",
			"file_search",
			"google_search",
			"google_maps",
			"url_context",
			"computer_use"
		]
	},
	pricing: {
		input: {
			normal: 1.5,
			cached: .15
		},
		output: { normal: 9 }
	}
};
var GEMINI_3_5_FLASH_LITE = {
	name: "gemini-3.5-flash-lite",
	max_input_tokens: 1048576,
	max_output_tokens: 65536,
	knowledge_cutoff: "2025-01-01",
	supports: {
		input: [
			"text",
			"image",
			"video",
			"audio",
			"document"
		],
		output: ["text"],
		capabilities: [
			"agentic_video",
			"batch_api",
			"caching",
			"function_calling",
			"structured_output",
			"thinking"
		],
		tools: [
			"code_execution",
			"file_search",
			"google_search",
			"google_maps",
			"url_context"
		]
	},
	pricing: {
		input: {
			normal: .3,
			cached: .03
		},
		output: { normal: 2.5 }
	}
};
var GEMINI_MODELS = [
	GEMINI_3_8_FLASH.name,
	GEMINI_3_7_FLASH.name,
	GEMINI_3_6_FLASH.name,
	GEMINI_3_5_FLASH.name,
	GEMINI_3_5_FLASH_LITE.name,
	GEMINI_3_1_PRO.name,
	GEMINI_3_FLASH.name,
	GEMINI_3_1_FLASH_LITE.name,
	GEMINI_3_1_FLASH_LITE_PREVIEW.name,
	GEMINI_2_5_PRO.name,
	GEMINI_2_5_FLASH.name,
	GEMINI_2_5_FLASH_LITE.name
];
/**
* Gemini models that support combining `tools` + `responseSchema` in a
* single streaming `generateContent` call (per issue #605). Per the
* provider matrix, Gemini 3.x natively interleaves the schema-constrained
* answer with function-calling on one pass; Gemini 2.x is unsupported /
* brittle and keeps the engine's legacy finalization fallback.
*/
var GEMINI_COMBINED_TOOLS_AND_SCHEMA_MODELS = /* @__PURE__ */ new Set([
	GEMINI_3_8_FLASH.name,
	GEMINI_3_7_FLASH.name,
	GEMINI_3_6_FLASH.name,
	GEMINI_3_5_FLASH.name,
	GEMINI_3_5_FLASH_LITE.name,
	GEMINI_3_1_PRO.name,
	GEMINI_3_FLASH.name,
	GEMINI_3_1_FLASH_LITE.name,
	GEMINI_3_1_FLASH_LITE_PREVIEW.name
]);
/**
* Image generation models. GA ids come first; the trailing `-preview` ids are
* shut-down aliases kept only so existing code keeps compiling — new code
* should use the GA id above its alias.
*/
var GEMINI_IMAGE_MODELS = [
	GEMINI_NANO_BANANA_2_1.name,
	GEMINI_3_1_FLASH_IMAGE.name,
	GEMINI_3_1_FLASH_LITE_IMAGE.name,
	GEMINI_3_PRO_IMAGE.name,
	GEMINI_2_5_FLASH_IMAGE.name,
	IMAGEN_4_GENERATE.name,
	IMAGEN_4_GENERATE_FAST.name,
	IMAGEN_4_GENERATE_ULTRA.name,
	GEMINI_3_1_FLASH_IMAGE_PREVIEW.name,
	GEMINI_3_PRO_IMAGE_PREVIEW.name
];
/**
* Text-to-speech models
* @experimental Gemini TTS is an experimental feature and may change.
*/
var GEMINI_TTS_MODELS = [
	GEMINI_3_1_FLASH_TTS.name,
	GEMINI_2_5_FLASH_TTS.name,
	GEMINI_2_5_PRO_TTS.name
];
/**
* Audio generation models (Lyria music generation).
* @experimental Lyria music generation is an experimental feature and may change.
*/
var GEMINI_AUDIO_MODELS = [LYRIA_3_PRO.name, LYRIA_3_CLIP.name];
/**
* Available voice names for Gemini TTS
* @see https://ai.google.dev/gemini-api/docs/speech-generation
*/
var GEMINI_TTS_VOICES = [
	"Zephyr",
	"Puck",
	"Charon",
	"Kore",
	"Fenrir",
	"Leda",
	"Orus",
	"Aoede",
	"Callirrhoe",
	"Autonoe",
	"Enceladus",
	"Iapetus",
	"Umbriel",
	"Algieba",
	"Despina",
	"Erinome",
	"Algenib",
	"Rasalgethi",
	"Laomedeia",
	"Achernar",
	"Alnilam",
	"Schedar",
	"Gacrux",
	"Pulcherrima",
	"Achird",
	"Zubenelgenubi",
	"Vindemiatrix",
	"Sadachbia",
	"Sadaltager",
	"Sulafat"
];
/**
* Video generation models. Veo models run on the long-running
* `:predictLongRunning` flow; Gemini Omni Flash runs on the Interactions
* API — the video adapter routes by model.
* @experimental Video generation is an experimental feature and may change.
*/
var GEMINI_VIDEO_MODELS = [
	VEO_3_1_PREVIEW.name,
	VEO_3_1_FAST_PREVIEW.name,
	VEO_3_1_LITE_PREVIEW.name,
	GEMINI_OMNI_1_1_FLASH.name
];
/**
* Video models served by the Interactions API rather than Veo's
* `:predictLongRunning` operations flow.
* @experimental Omni video generation is an experimental feature and may change.
*/
var GEMINI_INTERACTIONS_VIDEO_MODELS = [GEMINI_OMNI_1_1_FLASH.name];
/**
* Embedding models
*/
var GEMINI_EMBEDDING_MODELS = ["gemini-embedding-001"];
/**
* Runtime map from chat model name to its supported input modalities, for the
* text adapter's `inputModalities`. `satisfies` keeps it equal to
* {@link GeminiModelInputModalitiesByName}. An unknown name gives `undefined`.
*/
var GEMINI_MODEL_INPUT_MODALITIES = {
	[GEMINI_3_8_FLASH.name]: GEMINI_3_8_FLASH.supports.input,
	[GEMINI_3_7_FLASH.name]: GEMINI_3_7_FLASH.supports.input,
	[GEMINI_3_6_FLASH.name]: GEMINI_3_6_FLASH.supports.input,
	[GEMINI_3_5_FLASH.name]: GEMINI_3_5_FLASH.supports.input,
	[GEMINI_3_5_FLASH_LITE.name]: GEMINI_3_5_FLASH_LITE.supports.input,
	[GEMINI_3_1_PRO.name]: GEMINI_3_1_PRO.supports.input,
	[GEMINI_3_FLASH.name]: GEMINI_3_FLASH.supports.input,
	[GEMINI_3_1_FLASH_LITE.name]: GEMINI_3_1_FLASH_LITE.supports.input,
	[GEMINI_3_1_FLASH_LITE_PREVIEW.name]: GEMINI_3_1_FLASH_LITE_PREVIEW.supports.input,
	[GEMINI_2_5_PRO.name]: GEMINI_2_5_PRO.supports.input,
	[GEMINI_2_5_FLASH_LITE.name]: GEMINI_2_5_FLASH_LITE.supports.input,
	[GEMINI_2_5_FLASH.name]: GEMINI_2_5_FLASH.supports.input
};
//#endregion
export { GEMINI_AUDIO_MODELS, GEMINI_COMBINED_TOOLS_AND_SCHEMA_MODELS, GEMINI_EMBEDDING_MODELS, GEMINI_IMAGE_MODELS, GEMINI_INTERACTIONS_VIDEO_MODELS, GEMINI_MODELS, GEMINI_MODEL_INPUT_MODALITIES, GEMINI_TTS_MODELS, GEMINI_TTS_VOICES, GEMINI_VIDEO_MODELS };

//# sourceMappingURL=model-meta.js.map