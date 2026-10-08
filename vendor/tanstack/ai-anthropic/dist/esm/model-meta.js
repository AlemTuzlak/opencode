//#region src/model-meta.ts
var CLAUDE_OPUS_4_6 = {
	name: "claude-opus-4-6",
	id: "claude-opus-4-6",
	context_window: 2e5,
	max_output_tokens: 128e3,
	knowledge_cutoff: "2025-05-01",
	pricing: {
		input: { normal: 5 },
		output: { normal: 25 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		extended_thinking: true,
		adaptive_thinking: true,
		priority_tier: true,
		tools: [
			"web_search",
			"web_fetch",
			"code_execution",
			"computer_use",
			"bash",
			"text_editor",
			"memory"
		]
	}
};
var CLAUDE_OPUS_4_5 = {
	name: "claude-opus-4-5",
	id: "claude-opus-4-5",
	context_window: 2e5,
	max_output_tokens: 32e3,
	knowledge_cutoff: "2025-11-01",
	pricing: {
		input: { normal: 15 },
		output: { normal: 75 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		extended_thinking: true,
		priority_tier: true,
		tools: [
			"web_search",
			"web_fetch",
			"code_execution",
			"computer_use",
			"bash",
			"text_editor",
			"memory"
		]
	}
};
var CLAUDE_SONNET_4_6 = {
	name: "claude-sonnet-4-6",
	id: "claude-sonnet-4-6",
	context_window: 1e6,
	max_output_tokens: 64e3,
	knowledge_cutoff: "2025-08-01",
	pricing: {
		input: { normal: 3 },
		output: { normal: 15 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		extended_thinking: true,
		adaptive_thinking: true,
		priority_tier: true,
		tools: [
			"web_search",
			"web_fetch",
			"code_execution",
			"computer_use",
			"bash",
			"text_editor",
			"memory"
		]
	}
};
var CLAUDE_SONNET_4_5 = {
	name: "claude-sonnet-4-5",
	id: "claude-sonnet-4-5",
	context_window: 2e5,
	max_output_tokens: 64e3,
	knowledge_cutoff: "2025-09-29",
	pricing: {
		input: { normal: 3 },
		output: { normal: 15 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		extended_thinking: true,
		priority_tier: true,
		tools: [
			"web_search",
			"web_fetch",
			"code_execution",
			"computer_use",
			"bash",
			"text_editor",
			"memory"
		]
	}
};
var CLAUDE_HAIKU_4_5 = {
	name: "claude-haiku-4-5",
	id: "claude-haiku-4-5",
	context_window: 2e5,
	max_output_tokens: 64e3,
	knowledge_cutoff: "2025-10-01",
	pricing: {
		input: { normal: 1 },
		output: { normal: 5 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		extended_thinking: true,
		priority_tier: true,
		tools: [
			"web_search",
			"web_fetch",
			"code_execution",
			"computer_use",
			"bash",
			"text_editor",
			"memory"
		]
	}
};
var CLAUDE_OPUS_4_1 = {
	name: "claude-opus-4-1",
	id: "claude-opus-4-1",
	context_window: 2e5,
	max_output_tokens: 64e3,
	knowledge_cutoff: "2025-08-05",
	pricing: {
		input: { normal: 15 },
		output: { normal: 75 }
	},
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		extended_thinking: true,
		priority_tier: true,
		tools: [
			"web_search",
			"web_fetch",
			"code_execution",
			"computer_use",
			"bash",
			"text_editor",
			"memory"
		]
	}
};
var CLAUDE_OPUS_4_7 = {
	name: "claude-opus-4-7",
	id: "claude-opus-4-7",
	context_window: 1e6,
	max_output_tokens: 128e3,
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		extended_thinking: false,
		adaptive_thinking: true,
		priority_tier: true,
		tools: [
			"web_search",
			"web_fetch",
			"code_execution",
			"computer_use",
			"bash",
			"text_editor",
			"memory"
		]
	},
	pricing: {
		input: {
			normal: 5,
			cached: .5
		},
		output: { normal: 25 }
	}
};
var CLAUDE_OPUS_4_8 = {
	name: "claude-opus-4-8",
	id: "claude-opus-4-8",
	context_window: 1e6,
	max_output_tokens: 128e3,
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		extended_thinking: false,
		adaptive_thinking: true,
		priority_tier: true,
		tools: [
			"web_search",
			"web_fetch",
			"code_execution",
			"computer_use",
			"bash",
			"text_editor",
			"memory"
		]
	},
	pricing: {
		input: {
			normal: 5,
			cached: .5
		},
		output: { normal: 25 }
	}
};
var CLAUDE_FABLE_5 = {
	name: "claude-fable-5",
	id: "claude-fable-5",
	context_window: 1e6,
	max_output_tokens: 128e3,
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		extended_thinking: false,
		adaptive_thinking: true,
		priority_tier: true,
		tools: [
			"web_search",
			"web_fetch",
			"code_execution",
			"computer_use",
			"bash",
			"text_editor",
			"memory"
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
var CLAUDE_SONNET_5 = {
	name: "claude-sonnet-5",
	id: "claude-sonnet-5",
	context_window: 1e6,
	max_output_tokens: 128e3,
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		extended_thinking: false,
		adaptive_thinking: true,
		tools: [
			"web_search",
			"web_fetch",
			"code_execution",
			"computer_use",
			"bash",
			"text_editor",
			"memory"
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
/**
* Model ids accepted by the Anthropic text adapter.
*
* Every id here resolves against the first-party Anthropic API
* (`GET /v1/models/{id}`). Retired models (Claude 3.x, Sonnet 3.7,
* Opus 4 / Sonnet 4) and the `-fast` variant ids (fast mode is requested
* via the `speed` parameter, not a model id) were removed after Anthropic
* turned them off.
*/
var CLAUDE_OPUS_5 = {
	name: "claude-opus-5",
	id: "claude-opus-5",
	context_window: 1e6,
	max_output_tokens: 128e3,
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		tools: [
			"web_search",
			"web_fetch",
			"code_execution",
			"computer_use",
			"bash",
			"text_editor",
			"memory"
		]
	},
	pricing: {
		input: {
			normal: 5,
			cached: .5
		},
		output: { normal: 25 }
	}
};
var CLAUDE_OPUS_5_FAST = {
	name: "claude-opus-5-fast",
	id: "claude-opus-5-fast",
	context_window: 1e6,
	max_output_tokens: 128e3,
	supports: {
		input: [
			"text",
			"image",
			"document"
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
var CLAUDE_FABLE_5_1 = {
	name: "claude-fable-5-1",
	id: "claude-fable-5-1",
	context_window: 1e6,
	max_output_tokens: 128e3,
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		tools: [
			"web_search",
			"web_fetch",
			"code_execution",
			"computer_use",
			"bash",
			"text_editor",
			"memory"
		]
	},
	pricing: {
		input: {
			normal: 10,
			cached: .25
		},
		output: { normal: 50 }
	}
};
var CLAUDE_OPUS_5_5 = {
	name: "claude-opus-5-5",
	id: "claude-opus-5-5",
	context_window: 1e6,
	max_output_tokens: 128e3,
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		tools: [
			"web_search",
			"web_fetch",
			"code_execution",
			"bash",
			"text_editor",
			"memory"
		]
	},
	pricing: {
		input: {
			normal: 4,
			cached: .2
		},
		output: { normal: 20 }
	}
};
var CLAUDE_SONNET_5_5 = {
	name: "claude-sonnet-5-5",
	id: "claude-sonnet-5-5",
	context_window: 1e6,
	max_output_tokens: 128e3,
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		extended_thinking: false,
		adaptive_thinking: true,
		tools: [
			"web_search",
			"web_fetch",
			"code_execution",
			"bash",
			"text_editor",
			"memory"
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
var CLAUDE_HAIKU_5_5 = {
	name: "claude-haiku-5-5",
	id: "claude-haiku-5-5",
	context_window: 1e6,
	max_output_tokens: 128e3,
	supports: {
		input: [
			"text",
			"image",
			"document"
		],
		extended_thinking: false,
		adaptive_thinking: true,
		tools: [
			"web_search",
			"web_fetch",
			"code_execution",
			"bash",
			"text_editor",
			"memory"
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
var ANTHROPIC_MODELS = [
	CLAUDE_HAIKU_5_5.id,
	CLAUDE_SONNET_5_5.id,
	CLAUDE_OPUS_5_5.id,
	CLAUDE_FABLE_5_1.id,
	CLAUDE_OPUS_5.id,
	CLAUDE_OPUS_5_FAST.id,
	CLAUDE_OPUS_4_6.id,
	CLAUDE_OPUS_4_5.id,
	CLAUDE_SONNET_4_6.id,
	CLAUDE_SONNET_4_5.id,
	CLAUDE_HAIKU_4_5.id,
	CLAUDE_OPUS_4_1.id,
	CLAUDE_OPUS_4_7.id,
	CLAUDE_OPUS_4_8.id,
	CLAUDE_FABLE_5.id,
	CLAUDE_SONNET_5.id
];
/**
* Claude chat models on Vertex AI / Gemini Enterprise Agent Platform.
* This list is the Google partner catalog, not the full Anthropic API catalog.
* Source: https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/partner-models/use-partner-models
*/
var ANTHROPIC_VERTEX_CHAT_MODELS = [
	CLAUDE_OPUS_5.id,
	CLAUDE_SONNET_5.id,
	CLAUDE_FABLE_5.id,
	CLAUDE_OPUS_4_8.id,
	CLAUDE_OPUS_4_7.id,
	CLAUDE_OPUS_4_6.id,
	CLAUDE_SONNET_4_6.id,
	CLAUDE_OPUS_4_5.id,
	CLAUDE_SONNET_4_5.id,
	CLAUDE_OPUS_4_1.id,
	CLAUDE_HAIKU_4_5.id
];
/**
* Fallback `max_tokens` ceiling for a model whose metadata carries no
* `max_output_tokens` (e.g. an unrecognized model id). Anthropic's Messages
* API *requires* `max_tokens`, so the adapter must always send a value. 64K is
* the output ceiling of the current mainstream Claude tier (Sonnet/Haiku 4.5),
* so it's a sane default for an unknown — almost certainly modern — model and
* avoids silently truncating long generations (issue #849). Recognized models
* use their exact `max_output_tokens` from {@link ANTHROPIC_MODEL_MAX_OUTPUT_TOKENS}
* (e.g. 128K for Opus), so this fallback only ever applies to ids not in the
* map.
*/
var ANTHROPIC_DEFAULT_MAX_OUTPUT_TOKENS = 64e3;
/**
* Runtime lookup of each model's maximum output-token ceiling, keyed by model
* id. Lets the text adapter default the required `max_tokens` request field to
* the model's real ceiling when the caller doesn't specify one, rather than a
* low constant that truncates responses mid-stream (issue #849).
*
* Kept in sync with {@link ANTHROPIC_MODELS} by `scripts/sync-provider-models.ts`
* — when that script adds a model it also inserts the model's `max_output_tokens`
* here, so a freshly-synced model resolves to its real ceiling rather than the
* fallback above.
*/
var ANTHROPIC_MODEL_MAX_OUTPUT_TOKENS = {
	[CLAUDE_OPUS_4_6.id]: CLAUDE_OPUS_4_6.max_output_tokens,
	[CLAUDE_OPUS_4_5.id]: CLAUDE_OPUS_4_5.max_output_tokens,
	[CLAUDE_SONNET_4_6.id]: CLAUDE_SONNET_4_6.max_output_tokens,
	[CLAUDE_SONNET_4_5.id]: CLAUDE_SONNET_4_5.max_output_tokens,
	[CLAUDE_HAIKU_4_5.id]: CLAUDE_HAIKU_4_5.max_output_tokens,
	[CLAUDE_OPUS_4_1.id]: CLAUDE_OPUS_4_1.max_output_tokens,
	[CLAUDE_OPUS_4_7.id]: CLAUDE_OPUS_4_7.max_output_tokens,
	[CLAUDE_OPUS_4_8.id]: CLAUDE_OPUS_4_8.max_output_tokens,
	[CLAUDE_FABLE_5.id]: CLAUDE_FABLE_5.max_output_tokens,
	[CLAUDE_SONNET_5.id]: CLAUDE_SONNET_5.max_output_tokens,
	[CLAUDE_OPUS_5.id]: CLAUDE_OPUS_5.max_output_tokens,
	[CLAUDE_OPUS_5_FAST.id]: CLAUDE_OPUS_5_FAST.max_output_tokens,
	[CLAUDE_FABLE_5_1.id]: CLAUDE_FABLE_5_1.max_output_tokens,
	[CLAUDE_OPUS_5_5.id]: CLAUDE_OPUS_5_5.max_output_tokens,
	[CLAUDE_SONNET_5_5.id]: CLAUDE_SONNET_5_5.max_output_tokens,
	[CLAUDE_HAIKU_5_5.id]: CLAUDE_HAIKU_5_5.max_output_tokens
};
/**
* Largest `max_tokens` the Anthropic SDK permits on a **non-streaming**
* request. The SDK refuses to make a non-streaming call it estimates could
* exceed its 10-minute timeout, computed as
* `(60min * max_tokens) / 128_000 > 10min` — i.e. it throws
* `"Streaming is required for operations that may take longer than 10 minutes"`
* once `max_tokens > 128_000 * 10 / 60 ≈ 21_333`
* (`@anthropic-ai/sdk`'s `calculateNonstreamingTimeout`). The text adapter's
* only non-streaming call is the forced-tool `structuredOutput()` request, so
* its defaulted ceiling must stay at or below this; the streaming chat path
* keeps the model's full {@link getAnthropicDefaultMaxTokens} ceiling. We sit
* just under the boundary (`21_333` would round-trip to exactly 10min). This
* caps only the *default* — an explicit oversized `max_tokens` from the caller
* still surfaces the SDK's "use streaming" error, which is the correct signal.
*/
var ANTHROPIC_MAX_NONSTREAMING_TOKENS = 21e3;
/**
* Resolve the default `max_tokens` for a model: its known `max_output_tokens`
* ceiling, or {@link ANTHROPIC_DEFAULT_MAX_OUTPUT_TOKENS} for unknown models.
* Callers that pass an explicit `max_tokens` bypass this entirely.
*
* Pass `stream: false` for non-streaming requests (the `structuredOutput()`
* path): the result is then clamped to {@link ANTHROPIC_MAX_NONSTREAMING_TOKENS}
* so the defaulted ceiling doesn't trip the SDK's non-streaming 10-minute guard
* (issue #849). Streaming requests (the default) are unaffected and get the
* model's full ceiling.
*/
function getAnthropicDefaultMaxTokens(model, { stream = true } = {}) {
	const ceiling = ANTHROPIC_MODEL_MAX_OUTPUT_TOKENS[model] ?? 64e3;
	return stream ? ceiling : Math.min(ceiling, ANTHROPIC_MAX_NONSTREAMING_TOKENS);
}
/**
* Anthropic models that support combining `tools` + JSON-Schema-constrained
* output in a single streaming Messages request (per issue #605). GA'd
* 2026-01-29 for Claude 4.5+ via `output_format` on the beta messages
* endpoint. Older Claude models still need the forced-tool-use workaround
* in `structuredOutput`.
*/
var ANTHROPIC_COMBINED_TOOLS_AND_SCHEMA_MODELS = /* @__PURE__ */ new Set([
	CLAUDE_HAIKU_5_5.id,
	CLAUDE_SONNET_5_5.id,
	CLAUDE_OPUS_4_5.id,
	CLAUDE_OPUS_4_6.id,
	CLAUDE_OPUS_4_7.id,
	CLAUDE_OPUS_4_8.id,
	CLAUDE_OPUS_5.id,
	CLAUDE_FABLE_5.id,
	CLAUDE_FABLE_5_1.id,
	CLAUDE_OPUS_5_5.id,
	CLAUDE_SONNET_5.id,
	CLAUDE_SONNET_4_5.id,
	CLAUDE_SONNET_4_6.id,
	CLAUDE_HAIKU_4_5.id
]);
/**
* The mid-conversation channels of each model (from pi 0.87.1): added tools
* use the `mid-conversation-tool-changes-2026-07-01` beta, and added prompts
* go in a mid-conversation `system` message. An unknown id gives
* `undefined`, so the adapter has no channels.
*/
var ANTHROPIC_MODEL_MID_CONVERSATION_CHANNELS = {
	[CLAUDE_OPUS_4_8.id]: {
		tools: true,
		systemPrompts: true
	},
	[CLAUDE_OPUS_5.id]: {
		tools: true,
		systemPrompts: true
	},
	[CLAUDE_OPUS_5_5.id]: {
		tools: true,
		systemPrompts: true
	},
	[CLAUDE_FABLE_5.id]: {
		tools: true,
		systemPrompts: true
	},
	[CLAUDE_FABLE_5_1.id]: {
		tools: true,
		systemPrompts: true
	}
};
/**
* The models with mid-conversation effort (pi 0.87.1 `supportsMidConvoEffort`):
* the level of each call goes into the messages. See
* `ModelReasoning.midConversationEffort`.
*/
var ANTHROPIC_MID_CONVERSATION_EFFORT_MODELS = /* @__PURE__ */ new Set([
	CLAUDE_FABLE_5_1.id,
	CLAUDE_OPUS_5.id,
	CLAUDE_OPUS_5_5.id
]);
/**
* Runtime map from chat model id to its supported input modalities, for the
* text adapter's `inputModalities`. `satisfies` keeps it equal to
* {@link AnthropicModelInputModalitiesByName}. An unknown id gives `undefined`.
*/
var ANTHROPIC_MODEL_INPUT_MODALITIES = {
	[CLAUDE_OPUS_4_6.id]: CLAUDE_OPUS_4_6.supports.input,
	[CLAUDE_OPUS_4_5.id]: CLAUDE_OPUS_4_5.supports.input,
	[CLAUDE_SONNET_4_6.id]: CLAUDE_SONNET_4_6.supports.input,
	[CLAUDE_SONNET_4_5.id]: CLAUDE_SONNET_4_5.supports.input,
	[CLAUDE_HAIKU_4_5.id]: CLAUDE_HAIKU_4_5.supports.input,
	[CLAUDE_OPUS_4_1.id]: CLAUDE_OPUS_4_1.supports.input,
	[CLAUDE_OPUS_4_7.id]: CLAUDE_OPUS_4_7.supports.input,
	[CLAUDE_OPUS_4_8.id]: CLAUDE_OPUS_4_8.supports.input,
	[CLAUDE_FABLE_5.id]: CLAUDE_FABLE_5.supports.input,
	[CLAUDE_SONNET_5.id]: CLAUDE_SONNET_5.supports.input,
	[CLAUDE_OPUS_5.id]: CLAUDE_OPUS_5.supports.input,
	[CLAUDE_OPUS_5_FAST.id]: CLAUDE_OPUS_5_FAST.supports.input,
	[CLAUDE_FABLE_5_1.id]: CLAUDE_FABLE_5_1.supports.input,
	[CLAUDE_OPUS_5_5.id]: CLAUDE_OPUS_5_5.supports.input,
	[CLAUDE_SONNET_5_5.id]: CLAUDE_SONNET_5_5.supports.input,
	[CLAUDE_HAIKU_5_5.id]: CLAUDE_HAIKU_5_5.supports.input
};
//#endregion
export { ANTHROPIC_COMBINED_TOOLS_AND_SCHEMA_MODELS, ANTHROPIC_DEFAULT_MAX_OUTPUT_TOKENS, ANTHROPIC_MAX_NONSTREAMING_TOKENS, ANTHROPIC_MID_CONVERSATION_EFFORT_MODELS, ANTHROPIC_MODELS, ANTHROPIC_MODEL_INPUT_MODALITIES, ANTHROPIC_MODEL_MID_CONVERSATION_CHANNELS, ANTHROPIC_VERTEX_CHAT_MODELS, getAnthropicDefaultMaxTokens };

//# sourceMappingURL=model-meta.js.map