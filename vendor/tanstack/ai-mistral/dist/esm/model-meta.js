//#region src/model-meta.ts
var MISTRAL_LARGE_LATEST = {
	name: "mistral-large-latest",
	context_window: 131072,
	max_completion_tokens: 8192,
	pricing: {
		input: { normal: .5 },
		output: { normal: 1.5 }
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
		]
	}
};
var MISTRAL_MEDIUM_LATEST = {
	name: "mistral-medium-latest",
	context_window: 131072,
	max_completion_tokens: 8192,
	pricing: {
		input: { normal: .4 },
		output: { normal: 2 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"json_object",
			"json_schema",
			"vision"
		]
	}
};
var MISTRAL_SMALL_LATEST = {
	name: "mistral-small-latest",
	context_window: 131072,
	max_completion_tokens: 8192,
	pricing: {
		input: { normal: .1 },
		output: { normal: .3 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"json_object",
			"json_schema",
			"vision"
		]
	}
};
var MINISTRAL_8B_LATEST = {
	name: "ministral-8b-latest",
	context_window: 131072,
	max_completion_tokens: 8192,
	pricing: {
		input: { normal: .1 },
		output: { normal: .1 }
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
		]
	}
};
var MINISTRAL_3B_LATEST = {
	name: "ministral-3b-latest",
	context_window: 131072,
	max_completion_tokens: 8192,
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
			"tools",
			"json_object",
			"json_schema"
		]
	}
};
var CODESTRAL_LATEST = {
	name: "codestral-latest",
	context_window: 256e3,
	max_completion_tokens: 8192,
	pricing: {
		input: { normal: .3 },
		output: { normal: .9 }
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
			"code"
		]
	}
};
var PIXTRAL_LARGE_LATEST = {
	name: "pixtral-large-latest",
	context_window: 131072,
	max_completion_tokens: 8192,
	pricing: {
		input: { normal: 2 },
		output: { normal: 6 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"json_object",
			"json_schema",
			"vision"
		]
	}
};
var PIXTRAL_12B_2409 = {
	name: "pixtral-12b-2409",
	context_window: 131072,
	max_completion_tokens: 8192,
	pricing: {
		input: { normal: .15 },
		output: { normal: .15 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"json_object",
			"vision"
		]
	}
};
var MAGISTRAL_MEDIUM_LATEST = {
	name: "magistral-medium-latest",
	context_window: 4e4,
	max_completion_tokens: 4e4,
	pricing: {
		input: { normal: 2 },
		output: { normal: 5 }
	},
	supports: {
		input: ["text"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"reasoning",
			"json_object",
			"json_schema"
		]
	}
};
var MAGISTRAL_SMALL_LATEST = {
	name: "magistral-small-latest",
	context_window: 4e4,
	max_completion_tokens: 4e4,
	pricing: {
		input: { normal: .5 },
		output: { normal: 1.5 }
	},
	supports: {
		input: ["text"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"reasoning",
			"json_object",
			"json_schema"
		]
	}
};
var OPEN_MISTRAL_NEMO = {
	name: "open-mistral-nemo",
	context_window: 131072,
	max_completion_tokens: 8192,
	pricing: {
		input: { normal: .15 },
		output: { normal: .15 }
	},
	supports: {
		input: ["text"],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"json_object"
		]
	}
};
var MISTRAL_MEDIUM_3 = {
	name: "mistral-medium-3",
	context_window: 131072,
	max_completion_tokens: 8192,
	pricing: {
		input: { normal: .4 },
		output: { normal: 2 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"json_object",
			"json_schema",
			"vision"
		]
	}
};
var MISTRAL_SMALL_2503 = {
	name: "mistral-small-2503",
	context_window: 131072,
	max_completion_tokens: 8192,
	pricing: {
		input: { normal: .1 },
		output: { normal: .3 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		output: ["text"],
		endpoints: ["chat"],
		features: [
			"streaming",
			"tools",
			"json_object",
			"json_schema",
			"vision"
		]
	}
};
var CODESTRAL_2 = {
	name: "codestral-2",
	context_window: 131072,
	max_completion_tokens: 8192,
	pricing: {
		input: { normal: .3 },
		output: { normal: .9 }
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
			"code"
		]
	}
};
/**
* All supported Mistral chat model identifiers.
*/
var MISTRAL_CHAT_MODELS = [
	MISTRAL_LARGE_LATEST.name,
	MISTRAL_MEDIUM_LATEST.name,
	MISTRAL_SMALL_LATEST.name,
	MINISTRAL_8B_LATEST.name,
	MINISTRAL_3B_LATEST.name,
	CODESTRAL_LATEST.name,
	PIXTRAL_LARGE_LATEST.name,
	PIXTRAL_12B_2409.name,
	MAGISTRAL_MEDIUM_LATEST.name,
	MAGISTRAL_SMALL_LATEST.name,
	OPEN_MISTRAL_NEMO.name
];
/**
* Mistral chat models on Vertex AI / Gemini Enterprise Agent Platform.
* This list is the Google partner catalog, not the Mistral API catalog.
* OCR (`mistral-ocr-2505`) is not a chat model.
*/
var MISTRAL_VERTEX_CHAT_MODELS = [
	MISTRAL_MEDIUM_3.name,
	MISTRAL_SMALL_2503.name,
	CODESTRAL_2.name
];
/**
* Runtime map from Mistral chat model name to its supported input modalities,
* for the text adapter's `inputModalities`. `satisfies` keeps it equal to
* {@link MistralModelInputModalitiesByName}. An unknown name gives `undefined`.
*/
var MISTRAL_MODEL_INPUT_MODALITIES = {
	[MISTRAL_LARGE_LATEST.name]: MISTRAL_LARGE_LATEST.supports.input,
	[MISTRAL_MEDIUM_LATEST.name]: MISTRAL_MEDIUM_LATEST.supports.input,
	[MISTRAL_SMALL_LATEST.name]: MISTRAL_SMALL_LATEST.supports.input,
	[MINISTRAL_8B_LATEST.name]: MINISTRAL_8B_LATEST.supports.input,
	[MINISTRAL_3B_LATEST.name]: MINISTRAL_3B_LATEST.supports.input,
	[CODESTRAL_LATEST.name]: CODESTRAL_LATEST.supports.input,
	[PIXTRAL_LARGE_LATEST.name]: PIXTRAL_LARGE_LATEST.supports.input,
	[PIXTRAL_12B_2409.name]: PIXTRAL_12B_2409.supports.input,
	[MAGISTRAL_MEDIUM_LATEST.name]: MAGISTRAL_MEDIUM_LATEST.supports.input,
	[MAGISTRAL_SMALL_LATEST.name]: MAGISTRAL_SMALL_LATEST.supports.input,
	[OPEN_MISTRAL_NEMO.name]: OPEN_MISTRAL_NEMO.supports.input,
	[MISTRAL_MEDIUM_3.name]: MISTRAL_MEDIUM_3.supports.input,
	[MISTRAL_SMALL_2503.name]: MISTRAL_SMALL_2503.supports.input,
	[CODESTRAL_2.name]: CODESTRAL_2.supports.input
};
/**
* Embedding models (based on endpoints: "embeddings")
*/
var MISTRAL_EMBEDDING_MODELS = ["mistral-embed", "codestral-embed"];
//#endregion
export { MISTRAL_CHAT_MODELS, MISTRAL_EMBEDDING_MODELS, MISTRAL_MODEL_INPUT_MODALITIES, MISTRAL_VERTEX_CHAT_MODELS };

//# sourceMappingURL=model-meta.js.map