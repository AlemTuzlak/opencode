//#region src/model-reasoning.ts
/** The same data at runtime. `false`: the model does not reason. */
var OPENROUTER_MODEL_REASONING = {
	"~anthropic/claude-fable-latest": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"~anthropic/claude-haiku-latest": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"~anthropic/claude-opus-latest": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"~anthropic/claude-sonnet-latest": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"~deepseek/deepseek-flash-latest": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"~deepseek/deepseek-pro-latest": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"~deepseek/deepseek-v4-flash-latest": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"~google/gemini-flash-latest": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"~google/gemini-pro-latest": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"~moonshotai/kimi-latest": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"~openai/gpt-astra-latest": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"~openai/gpt-luna-latest": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"~openai/gpt-mini-latest": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"~openai/gpt-sol-latest": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"~openai/gpt-terra-latest": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"~x-ai/grok-latest": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"~z-ai/glm-flash-latest": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"~z-ai/glm-latest": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"aion-labs/aion-2.0": { budget: false },
	"aion-labs/aion-3.0": { budget: false },
	"aion-labs/aion-3.0-mini": { budget: false },
	"aion-labs/aion-3.5": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"aion-labs/aion-3.5-mini": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"aion-labs/aion-rp-llama-3.1-8b": false,
	"amazon/nova-2-lite-v1": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"amazon/nova-lite-v1": false,
	"amazon/nova-micro-v1": false,
	"amazon/nova-premier-v1": false,
	"amazon/nova-pro-v1": false,
	"anthracite-org/magnum-v4-72b": false,
	"anthropic/claude-fable-5": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"anthropic/claude-fable-5:batch": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"anthropic/claude-fable-5.1": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"anthropic/claude-fable-5.1:batch": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"anthropic/claude-haiku-4.5": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"anthropic/claude-haiku-4.5:batch": { budget: false },
	"anthropic/claude-opus-4.1": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"anthropic/claude-opus-4.1:batch": { budget: false },
	"anthropic/claude-opus-4.5": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"anthropic/claude-opus-4.5:batch": { budget: false },
	"anthropic/claude-opus-4.6": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: true
	},
	"anthropic/claude-opus-4.6:batch": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"anthropic/claude-opus-4.7": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"anthropic/claude-opus-4.7:batch": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"anthropic/claude-opus-4.8": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"anthropic/claude-opus-4.8:batch": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"anthropic/claude-opus-5": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"anthropic/claude-opus-5:batch": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"anthropic/claude-opus-5.5": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"anthropic/claude-opus-5.5:batch": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"anthropic/claude-sonnet-4": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"anthropic/claude-sonnet-4.5": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"anthropic/claude-sonnet-4.5:batch": { budget: false },
	"anthropic/claude-sonnet-4.6": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"anthropic/claude-sonnet-4.6:batch": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"anthropic/claude-sonnet-5": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"anthropic/claude-sonnet-5:batch": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"anthropic/claude-sonnet-5.5": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"anthropic/claude-sonnet-5.5:batch": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"arcee-ai/trinity-large-thinking": { budget: false },
	"baidu/ernie-4.5-vl-424b-a47b": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"bytedance-seed/seed-1.6": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"bytedance-seed/seed-1.6-flash": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"bytedance-seed/seed-2-1-turbo": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"bytedance-seed/seed-2.0-code": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"bytedance-seed/seed-2.0-lite": {
		map: {
			off: "none",
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"bytedance-seed/seed-2.0-mini": {
		map: {
			off: "none",
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"bytedance/ui-tars-1.5-7b": false,
	"cognitivecomputations/dolphin-mistral-24b-venice-edition": false,
	"cohere/command-a": false,
	"cohere/command-a-plus": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"cohere/command-r-08-2024": false,
	"cohere/command-r-plus-08-2024": false,
	"cohere/command-r7b-12-2024": false,
	"cohere/north-mini-code:free": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"deepseek/deepseek-chat": false,
	"deepseek/deepseek-chat-v3-0324": false,
	"deepseek/deepseek-chat-v3.1": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"deepseek/deepseek-r1": { budget: false },
	"deepseek/deepseek-r1-0528": { budget: false },
	"deepseek/deepseek-v3.1-terminus": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"deepseek/deepseek-v3.2": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"deepseek/deepseek-v3.2-exp": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"deepseek/deepseek-v4-flash": {
		map: {
			off: "none",
			minimal: null,
			low: null,
			medium: null,
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"deepseek/deepseek-v4-flash-0731": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"deepseek/deepseek-v4-flash-vision-exp": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"deepseek/deepseek-v4-pro": {
		map: {
			off: "none",
			minimal: null,
			low: null,
			medium: null,
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"deepseek/deepseek-v4-pro-0813": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"deepseek/deepseek-v4.1-flash": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"deepseek/deepseek-v4.1-flash:batch": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"dots-studio/dots-3-note-preview:free": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"fireworks/ember-1": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"google/gemini-2.5-flash": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"google/gemini-2.5-flash-image": false,
	"google/gemini-2.5-flash-lite": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"google/gemini-2.5-flash-lite:batch": { budget: false },
	"google/gemini-2.5-flash:batch": { budget: false },
	"google/gemini-2.5-pro": { budget: true },
	"google/gemini-2.5-pro-preview": { budget: true },
	"google/gemini-2.5-pro:batch": { budget: false },
	"google/gemini-3-flash-preview": {
		map: {
			off: "none",
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3-flash-preview:batch": {
		map: {
			off: null,
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3-pro-image": { budget: false },
	"google/gemini-3-pro-image-preview": { budget: false },
	"google/gemini-3.1-flash-image": {
		map: {
			off: "none",
			minimal: "minimal",
			low: null,
			medium: null,
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.1-flash-image-preview": {
		map: {
			off: "none",
			minimal: "minimal",
			low: null,
			medium: null,
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.1-flash-lite": {
		map: {
			off: "none",
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.1-flash-lite-image": {
		map: {
			off: "none",
			minimal: "minimal",
			low: null,
			medium: null,
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.1-flash-lite-preview": {
		map: {
			off: "none",
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.1-flash-lite:batch": {
		map: {
			off: null,
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.1-pro-preview": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.1-pro-preview-customtools": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.1-pro-preview:batch": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.5-flash": {
		map: {
			off: null,
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.5-flash-lite": {
		map: {
			off: null,
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.5-flash-lite:batch": {
		map: {
			off: null,
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.5-flash:batch": {
		map: {
			off: null,
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.6-flash": {
		map: {
			off: null,
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.6-flash:batch": {
		map: {
			off: null,
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.7-flash": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.7-flash:batch": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.8-flash": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.8-flash:batch": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemma-2-27b-it": false,
	"google/gemma-3-12b-it": false,
	"google/gemma-3-27b-it": false,
	"google/gemma-3-4b-it": false,
	"google/gemma-4-26b-a4b-it": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"google/gemma-4-26b-a4b-it:free": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"google/gemma-4-31b-it": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"google/gemma-4-31b-it:free": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"gryphe/mythomax-l2-13b": false,
	"ibm-granite/granite-4.0-h-micro": false,
	"ibm-granite/granite-4.2-8b": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"inception/mercury-2": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"inception/mercury-2.5": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"inclusionai/ling-3.0-flash": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"inclusionai/ling-3.0-flash-fin": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"inclusionai/ling-3.0-flash-sante:free": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"inclusionai/ling-3.0-flash-vl": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"inference-net/schematron-v2-small": false,
	"inference-net/schematron-v2-turbo": false,
	"kwaipilot/kat-coder-pro-v2.5": false,
	"liquid/lfm-2.5-2.6b:free": { budget: false },
	"mancer/weaver": false,
	"meituan/longcat-2.0": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: true
	},
	"meta-llama/llama-3.1-70b-instruct": false,
	"meta-llama/llama-3.1-8b-instruct": false,
	"meta-llama/llama-3.2-1b-instruct": false,
	"meta-llama/llama-3.2-3b-instruct": false,
	"meta-llama/llama-3.3-70b-instruct": false,
	"meta-llama/llama-4-maverick": false,
	"meta-llama/llama-4-scout": false,
	"meta-llama/llama-guard-4-12b": false,
	"meta/muse-glimmer-30b": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"meta/muse-spark-1.1": {
		map: {
			off: null,
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"meta/muse-spark-1.2": {
		map: {
			off: null,
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"meta/muse-spark-1.2-contributor": {
		map: {
			off: null,
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"meta/muse-spark-1.3": {
		map: {
			off: null,
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"meta/muse-spark-1.3-contributor": {
		map: {
			off: null,
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"microsoft/phi-4": false,
	"microsoft/wizardlm-2-8x22b": false,
	"minimax/minimax-01": false,
	"minimax/minimax-m1": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"minimax/minimax-m2": { budget: false },
	"minimax/minimax-m2-her": false,
	"minimax/minimax-m2.1": { budget: false },
	"minimax/minimax-m2.5": { budget: false },
	"minimax/minimax-m2.7": { budget: false },
	"minimax/minimax-m3": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"mistralai/codestral-2508": false,
	"mistralai/codestral-2508:batch": false,
	"mistralai/devstral-2512": false,
	"mistralai/ministral-14b-2512": false,
	"mistralai/ministral-3b-2512": false,
	"mistralai/ministral-8b-2512": false,
	"mistralai/ministral-8b-2512:batch": false,
	"mistralai/mistral-large": false,
	"mistralai/mistral-large-2407": false,
	"mistralai/mistral-large-2512": false,
	"mistralai/mistral-large-2512:batch": false,
	"mistralai/mistral-medium-3": false,
	"mistralai/mistral-medium-3-5": {
		map: {
			off: "none",
			minimal: null,
			low: null,
			medium: null,
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"mistralai/mistral-medium-3-5:batch": {
		map: {
			off: "none",
			minimal: null,
			low: null,
			medium: null,
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"mistralai/mistral-medium-3.1": false,
	"mistralai/mistral-medium-3.1:batch": false,
	"mistralai/mistral-nemo": false,
	"mistralai/mistral-saba": false,
	"mistralai/mistral-small-24b-instruct-2501": false,
	"mistralai/mistral-small-2603": {
		map: {
			off: "none",
			minimal: null,
			low: null,
			medium: null,
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"mistralai/mistral-small-2603:batch": {
		map: {
			off: "none",
			minimal: null,
			low: null,
			medium: null,
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"mistralai/mistral-small-3.1-24b-instruct": false,
	"mistralai/mistral-small-3.2-24b-instruct": false,
	"mistralai/mixtral-8x22b-instruct": false,
	"mistralai/voxtral-small-24b-2507": false,
	"moonshotai/kimi-k2": false,
	"moonshotai/kimi-k2-0905": false,
	"moonshotai/kimi-k2-thinking": { budget: false },
	"moonshotai/kimi-k2.5": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"moonshotai/kimi-k2.6": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"moonshotai/kimi-k2.7-code": { budget: false },
	"moonshotai/kimi-k3": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"moonshotai/kimi-k3:batch": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"morph/morph-v3-fast": false,
	"morph/morph-v3-large": false,
	"nex-agi/nex-n2.5-mini": {
		map: {
			off: "none",
			minimal: null,
			low: null,
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"nex-agi/nex-n2.5-pro": {
		map: {
			off: "none",
			minimal: null,
			low: null,
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"nousresearch/hermes-3-llama-3.1-405b": false,
	"nousresearch/hermes-3-llama-3.1-70b": false,
	"nousresearch/hermes-4-405b": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"nvidia/nemotron-3-nano-30b-a3b": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: true
	},
	"nvidia/nemotron-3-super-120b-a12b": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: null,
			xhigh: null,
			max: null
		},
		budget: true
	},
	"nvidia/nemotron-3-super-120b-a12b:free": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: null,
			xhigh: null,
			max: null
		},
		budget: true
	},
	"nvidia/nemotron-3-ultra-550b-a55b": {
		map: {
			off: "none",
			minimal: null,
			low: null,
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: true
	},
	"nvidia/nemotron-3-ultra-550b-a55b:free": {
		map: {
			off: "none",
			minimal: null,
			low: null,
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: true
	},
	"nvidia/nemotron-3.5-content-safety": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"nvidia/nemotron-3.5-content-safety:free": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"nvidia/nemotron-3.5-lightning": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"nvidia/nemotron-3.5-lightning:free": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"openai/gpt-3.5-turbo": false,
	"openai/gpt-3.5-turbo-0613": false,
	"openai/gpt-3.5-turbo-16k": false,
	"openai/gpt-3.5-turbo-instruct": false,
	"openai/gpt-3.5-turbo:batch": false,
	"openai/gpt-4": false,
	"openai/gpt-4-turbo": false,
	"openai/gpt-4-turbo:batch": false,
	"openai/gpt-4.1": false,
	"openai/gpt-4.1-mini": false,
	"openai/gpt-4.1-mini:batch": false,
	"openai/gpt-4.1-nano": false,
	"openai/gpt-4.1-nano:batch": false,
	"openai/gpt-4.1:batch": false,
	"openai/gpt-4o": false,
	"openai/gpt-4o-2024-05-13": false,
	"openai/gpt-4o-2024-08-06": false,
	"openai/gpt-4o-2024-11-20": false,
	"openai/gpt-4o-mini": false,
	"openai/gpt-4o-mini-2024-07-18": false,
	"openai/gpt-4o-mini:batch": false,
	"openai/gpt-4o:batch": false,
	"openai/gpt-5": {
		map: {
			off: null,
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"openai/gpt-5-image": { budget: false },
	"openai/gpt-5-image-mini": { budget: false },
	"openai/gpt-5-mini": {
		map: {
			off: null,
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"openai/gpt-5-mini:batch": {
		map: {
			off: null,
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"openai/gpt-5-nano": {
		map: {
			off: null,
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"openai/gpt-5-nano:batch": {
		map: {
			off: null,
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"openai/gpt-5-pro": {
		map: {
			off: null,
			minimal: null,
			low: null,
			medium: null,
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"openai/gpt-5-pro:batch": {
		map: {
			off: null,
			minimal: null,
			low: null,
			medium: null,
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"openai/gpt-5:batch": {
		map: {
			off: null,
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"openai/gpt-5.1": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"openai/gpt-5.1-codex": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"openai/gpt-5.1-codex-max": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.1-codex-mini": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"openai/gpt-5.1:batch": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"openai/gpt-5.2": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.2-chat": false,
	"openai/gpt-5.2-codex": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.2-pro": {
		map: {
			off: null,
			minimal: null,
			low: null,
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.2-pro:batch": {
		map: {
			off: null,
			minimal: null,
			low: null,
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.2:batch": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.3-codex": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.4": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.4-image-2": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.4-mini": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.4-mini:batch": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.4-nano": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.4-nano:batch": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.4-pro": {
		map: {
			off: null,
			minimal: null,
			low: null,
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.4-pro:batch": {
		map: {
			off: null,
			minimal: null,
			low: null,
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.4:batch": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.5": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.5-pro": {
		map: {
			off: null,
			minimal: null,
			low: null,
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.5-pro:batch": {
		map: {
			off: null,
			minimal: null,
			low: null,
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.5:batch": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.6-luna": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-5.6-luna-pro": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-5.6-luna-pro:batch": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-5.6-luna:batch": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-5.6-sol": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-5.6-sol-pro": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-5.6-sol-pro:batch": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-5.6-sol:batch": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-5.6-terra": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-5.6-terra-pro": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-5.6-terra-pro:batch": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-5.6-terra:batch": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-6-astra": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-6-astra-pro": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-6-astra-pro:batch": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-6-astra:batch": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-6-luna": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-6-luna-pro": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-6-luna-pro:batch": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-6-luna:batch": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-6-sol": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-6-sol-pro": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-6-sol-pro:batch": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-6-sol:batch": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-6.1-sol": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-6.1-sol-pro": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-6.1-sol-pro:batch": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-6.1-sol:batch": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-audio": false,
	"openai/gpt-audio-mini": false,
	"openai/gpt-chat-latest": false,
	"openai/gpt-oss-120b": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"openai/gpt-oss-120b:batch": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"openai/gpt-oss-20b": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"openai/gpt-oss-20b:batch": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"openai/gpt-oss-safeguard-20b": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"openai/o1": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"openai/o1-pro": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"openai/o3": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"openai/o3-mini": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"openai/o3-mini-high": {
		map: {
			off: null,
			minimal: null,
			low: null,
			medium: null,
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"openai/o3-mini:batch": { budget: false },
	"openai/o3-pro": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"openai/o3:batch": { budget: false },
	"openai/o4-mini": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"openai/o4-mini-high": {
		map: {
			off: null,
			minimal: null,
			low: null,
			medium: null,
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"openai/o4-mini:batch": { budget: false },
	"perceptron/perceptron-mk1": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"perceptron/perceptron-mk1.5": {
		map: {
			off: "none",
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"perplexity/sonar": false,
	"perplexity/sonar-deep-research": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"perplexity/sonar-pro": false,
	"perplexity/sonar-pro-search": { budget: false },
	"perplexity/sonar-reasoning-pro": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"poolside/laguna-s-2.1": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"poolside/laguna-s-2.1:free": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"poolside/laguna-xs-2.1": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"poolside/laguna-xs-2.1:free": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"prism-ml/ternary-bonsai-2-27b": {
		map: {
			off: "none",
			minimal: null,
			low: null,
			medium: "medium",
			high: null,
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"qwen/qwen-2.5-72b-instruct": false,
	"qwen/qwen-2.5-7b-instruct": false,
	"qwen/qwen-2.5-coder-32b-instruct": false,
	"qwen/qwen-plus": false,
	"qwen/qwen-plus-2025-07-28": false,
	"qwen/qwen2.5-vl-72b-instruct": false,
	"qwen/qwen3-14b": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"qwen/qwen3-235b-a22b": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"qwen/qwen3-235b-a22b-2507": false,
	"qwen/qwen3-235b-a22b-thinking-2507": { budget: false },
	"qwen/qwen3-30b-a3b": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"qwen/qwen3-30b-a3b-instruct-2507": false,
	"qwen/qwen3-30b-a3b-thinking-2507": { budget: false },
	"qwen/qwen3-32b": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"qwen/qwen3-8b": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"qwen/qwen3-coder": false,
	"qwen/qwen3-coder-30b-a3b-instruct": false,
	"qwen/qwen3-coder-flash": false,
	"qwen/qwen3-coder-next": false,
	"qwen/qwen3-coder-plus": false,
	"qwen/qwen3-max": false,
	"qwen/qwen3-max-thinking": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"qwen/qwen3-next-80b-a3b-instruct": false,
	"qwen/qwen3-next-80b-a3b-thinking": { budget: false },
	"qwen/qwen3-vl-235b-a22b-instruct": false,
	"qwen/qwen3-vl-235b-a22b-thinking": { budget: false },
	"qwen/qwen3-vl-30b-a3b-instruct": false,
	"qwen/qwen3-vl-30b-a3b-thinking": { budget: false },
	"qwen/qwen3-vl-32b-instruct": false,
	"qwen/qwen3-vl-8b-instruct": false,
	"qwen/qwen3-vl-8b-thinking": { budget: false },
	"qwen/qwen3.5-122b-a10b": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"qwen/qwen3.5-27b": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"qwen/qwen3.5-35b-a3b": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"qwen/qwen3.5-397b-a17b": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"qwen/qwen3.5-9b": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"qwen/qwen3.5-flash-02-23": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"qwen/qwen3.5-plus-02-15": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"qwen/qwen3.5-plus-20260420": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"qwen/qwen3.6-27b": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"qwen/qwen3.6-35b-a3b": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"qwen/qwen3.6-flash": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"qwen/qwen3.6-max-preview": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"qwen/qwen3.6-plus": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"qwen/qwen3.7-flash": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: true
	},
	"qwen/qwen3.7-max": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"qwen/qwen3.7-plus": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"qwen/qwen3.8-2.4t-a95b": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: null,
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"qwen/qwen3.8-27b": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: null,
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"qwen/qwen3.8-27b:free": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: null,
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"qwen/qwen3.8-flash": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: true
	},
	"qwen/qwen3.8-max-0902": {
		map: {
			off: null,
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"qwen/qwen3.8-max-prime": {
		map: {
			off: null,
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"qwen/qwen3.8-omni-flash": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: true
	},
	"rekaai/reka-edge": false,
	"rekaai/reka-flash-3": { budget: false },
	"relace/relace-apply-3": false,
	"relace/relace-search": false,
	"sakana/fugu-max": {
		map: {
			off: null,
			minimal: null,
			low: null,
			medium: null,
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"sakana/fugu-ultra": {
		map: {
			off: null,
			minimal: null,
			low: null,
			medium: null,
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"sakana/fugu-ultra-v2": {
		map: {
			off: null,
			minimal: null,
			low: null,
			medium: null,
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"sakana/sakana-namazu": {
		map: {
			off: "none",
			minimal: null,
			low: null,
			medium: null,
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"sao10k/l3-lunaris-8b": false,
	"sao10k/l3.1-euryale-70b": false,
	"sao10k/l3.3-euryale-70b": false,
	"stealth/space-bunny-alpha": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"stepfun/step-3.5-flash": { budget: false },
	"stepfun/step-3.7-flash": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"tencent/hunyuan-a13b-instruct": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"tencent/hy-mt2-1.8b": false,
	"tencent/hy-mt2-30b-a3b": false,
	"tencent/hy-mt2-7b": false,
	"tencent/hy3": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"tencent/hy3-preview": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"tencent/hy4-preview": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"thedrummer/cydonia-24b-v4.1": false,
	"thedrummer/skyfall-36b-v2": false,
	"thedrummer/unslopnemo-12b": false,
	"thinkingmachines/inkling": {
		map: {
			off: "none",
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"thinkingmachines/inkling-small": {
		map: {
			off: "none",
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"thinkingmachines/inkling-small:free": {
		map: {
			off: "none",
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"thinkingmachines/inkling:free": {
		map: {
			off: "none",
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"unbiased/pareto": false,
	"undi95/remm-slerp-l2-13b": false,
	"upstage/solar-mini4": {
		map: {
			off: "none",
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"upstage/solar-pro-3": {
		map: {
			off: "none",
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"upstage/solar-pro4": {
		map: {
			off: "none",
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"writer/palmyra-x5": false,
	"x-ai/grok-4.20": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"x-ai/grok-4.20-multi-agent": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"x-ai/grok-4.3": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"x-ai/grok-4.3:batch": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"x-ai/grok-4.5": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"x-ai/grok-4.6": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"x-ai/grok-4.7": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"x-ai/grok-build-0.1": { budget: false },
	"xiaomi/mimo-v2.5": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"xiaomi/mimo-v2.5-pro": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"xiaomi/mimo-v2.6-flash": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"xiaomi/mimo-v2.6-pro": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"xiaomi/mimo-v2.6-pro-ultraspeed": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"z-ai/glm-4.5": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"z-ai/glm-4.5-air": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"z-ai/glm-4.5v": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"z-ai/glm-4.6": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"z-ai/glm-4.6v": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"z-ai/glm-4.7": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"z-ai/glm-4.7-flash": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"z-ai/glm-5": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"z-ai/glm-5-turbo": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"z-ai/glm-5.1": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"z-ai/glm-5.2": {
		map: {
			off: "none",
			minimal: null,
			low: null,
			medium: null,
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"z-ai/glm-5.3": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"z-ai/glm-5.3-flash": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"z-ai/glm-5.3-flash:batch": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"z-ai/glm-5.3-flashx": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"z-ai/glm-5.3-prime": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"z-ai/glm-5.3:batch": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"z-ai/glm-5v-turbo": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"openrouter/auto": { budget: false }
};
//#endregion
export { OPENROUTER_MODEL_REASONING };

//# sourceMappingURL=model-reasoning.js.map