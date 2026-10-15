//#region src/model-reasoning.ts
/** The same data at runtime. `false`: the model does not reason. */
var VERCEL_GATEWAY_MODEL_REASONING = {
	"alibaba/qwen-3-14b": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"alibaba/qwen-3-235b": {
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
	"alibaba/qwen-3-30b": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"alibaba/qwen-3-32b": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: true
	},
	"alibaba/qwen-3.6-max-preview": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: true
	},
	"alibaba/qwen3-235b-a22b-thinking": { budget: true },
	"alibaba/qwen3-coder": { budget: false },
	"alibaba/qwen3-coder-30b-a3b": { budget: false },
	"alibaba/qwen3-coder-next": { budget: false },
	"alibaba/qwen3-coder-plus": false,
	"alibaba/qwen3-max": false,
	"alibaba/qwen3-max-preview": false,
	"alibaba/qwen3-max-thinking": { budget: true },
	"alibaba/qwen3-next-80b-a3b-instruct": false,
	"alibaba/qwen3-next-80b-a3b-thinking": { budget: true },
	"alibaba/qwen3-vl-235b-a22b-instruct": false,
	"alibaba/qwen3-vl-instruct": false,
	"alibaba/qwen3-vl-thinking": { budget: true },
	"alibaba/qwen3.5-flash": {
		map: {
			off: "none",
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: true
	},
	"alibaba/qwen3.5-plus": {
		map: {
			off: "none",
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: true
	},
	"alibaba/qwen3.6-27b": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: true
	},
	"alibaba/qwen3.6-plus": {
		map: {
			off: "none",
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: true
	},
	"alibaba/qwen3.7-flash": {
		map: {
			off: "none",
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: true
	},
	"alibaba/qwen3.7-max": {
		map: {
			off: "none",
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: true
	},
	"alibaba/qwen3.7-plus": {
		map: {
			off: "none",
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: true
	},
	"alibaba/qwen3.8-2.4t-a95b": {
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
	"alibaba/qwen3.8-27b": {
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
	"alibaba/qwen3.8-flash": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: null,
			xhigh: "xhigh",
			max: null
		},
		budget: true
	},
	"alibaba/qwen3.8-max": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: null,
			xhigh: "xhigh",
			max: null
		},
		budget: true
	},
	"alibaba/qwen3.8-max-0902": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: null,
			xhigh: "xhigh",
			max: null
		},
		budget: true
	},
	"alibaba/qwen3.8-max-prime": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: null,
			xhigh: "xhigh",
			max: null
		},
		budget: true
	},
	"alibaba/qwen3.8-omni-flash": {
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
	"amazon/nova-2-lite": {
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
	"amazon/nova-lite": false,
	"amazon/nova-micro": false,
	"amazon/nova-pro": false,
	"anthropic/claude-3-haiku": false,
	"anthropic/claude-fable-5": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: true
	},
	"anthropic/claude-fable-5.1": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: true
	},
	"anthropic/claude-haiku-4.5": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: true
	},
	"anthropic/claude-opus-4": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: true
	},
	"anthropic/claude-opus-4.5": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: true
	},
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
		budget: true
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
		budget: true
	},
	"anthropic/claude-opus-4.8-fast": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: true
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
		budget: true
	},
	"anthropic/claude-opus-5-fast": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: true
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
	"anthropic/claude-opus-5.5-fast": {
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
		budget: true
	},
	"anthropic/claude-sonnet-4.5": { budget: true },
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
		budget: true
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
		budget: true
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
	"arcee-ai/trinity-large-thinking": {
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
	"bytedance/seed-1.6": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"bytedance/seed-1.8": {
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
	"bytedance/seed-2.1-turbo": {
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
	"cohere/command-a": false,
	"deepseek/deepseek-r1": { budget: false },
	"deepseek/deepseek-v3.1": {
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
	"deepseek/deepseek-v3.1-terminus": {
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
	"deepseek/deepseek-v3.2": false,
	"deepseek/deepseek-v3.2-thinking": {
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
	"deepseek/deepseek-v4-flash": {
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
	"deepseek/deepseek-v4-flash-0731": {
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
	"deepseek/deepseek-v4-flash-vision-exp": {
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
	"deepseek/deepseek-v4-pro": {
		map: {
			off: "none",
			minimal: null,
			low: null,
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"deepseek/deepseek-v4-pro-0813": {
		map: {
			off: "none",
			minimal: null,
			low: null,
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
			low: null,
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"fireworks/ember-1": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: true
	},
	"fish-audio/s1": false,
	"fish-audio/s2-pro": false,
	"fish-audio/s2.1-pro": false,
	"fish-audio/transcribe-1": false,
	"google/gemini-2.5-flash": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: true
	},
	"google/gemini-2.5-flash-image": false,
	"google/gemini-2.5-flash-lite": {
		map: {
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: true
	},
	"google/gemini-2.5-pro": { budget: true },
	"google/gemini-3-flash": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3-pro-image": false,
	"google/gemini-3.1-flash-image": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.1-flash-image-preview": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.1-flash-lite": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.1-flash-lite-image": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: null,
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
			medium: null,
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.5-flash": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.5-flash-lite": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: null,
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.5-transcribe": false,
	"google/gemini-3.5-transcribe-live": false,
	"google/gemini-3.6-flash": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: null,
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
			medium: null,
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
			medium: null,
			high: "high",
			xhigh: null,
			max: null
		},
		budget: false
	},
	"google/gemini-3.8-flash-lite-tts": false,
	"google/gemini-3.8-flash-tts": false,
	"google/gemini-3.8-live": false,
	"google/gemini-3.8-live-extended-thinking": false,
	"google/gemini-omni-flash-preview": {
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
	"google/gemma-4-26b-a4b-it": { budget: false },
	"google/gemma-4-31b-it": { budget: false },
	"inception/mercury-2": {
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
	"inception/mercury-coder-small": false,
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
	"inclusionai/ling-3.0-flash-sante": {
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
	"inclusionai/ling-3.0-flash-sante-free": {
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
	"inclusionai/ling-3.1-flash": {
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
	"inclusionai/ling-3.1-flash-free": {
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
	"inference-net/schematron-v2-small": false,
	"inference-net/schematron-v2-turbo": false,
	"interfaze/interfaze-beta": {
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
	"liquid/d1": false,
	"meituan/longcat-2.5-preview": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"meta/llama-3.1-70b": false,
	"meta/llama-3.1-8b": false,
	"meta/llama-3.3-70b": false,
	"meta/llama-4-maverick": false,
	"meta/llama-4-scout": false,
	"meta/muse-glimmer-30b": {
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
			max: null
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
			max: null
		},
		budget: false
	},
	"minimax/minimax-m2": { budget: true },
	"minimax/minimax-m2.1": { budget: true },
	"minimax/minimax-m2.1-lightning": { budget: true },
	"minimax/minimax-m2.5": { budget: true },
	"minimax/minimax-m2.5-highspeed": { budget: true },
	"minimax/minimax-m2.7": { budget: true },
	"minimax/minimax-m2.7-highspeed": { budget: true },
	"minimax/minimax-m3": { budget: true },
	"mistral/codestral": false,
	"mistral/ministral-14b": false,
	"mistral/ministral-3b": false,
	"mistral/ministral-8b": false,
	"mistral/mistral-large-3": false,
	"mistral/mistral-medium-3.5": {
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
	"mistral/mistral-nemo": false,
	"mistral/mistral-small": false,
	"mixedbread/toast-1": false,
	"moonshotai/kimi-k2": false,
	"moonshotai/kimi-k2-thinking": {
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
	"moonshotai/kimi-k2.7-code": {
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
	"moonshotai/kimi-k2.7-code-highspeed": {
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
	"moonshotai/kimi-k3-fast": {
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
	"morph/morph-v3-fast": false,
	"morph/morph-v3-large": false,
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
	"nvidia/nemotron-3-super-120b-a12b": {
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
		budget: true
	},
	"nvidia/nemotron-nano-12b-v2-vl": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"nvidia/nemotron-nano-9b-v2": {
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
	"openai/gpt-4-turbo": false,
	"openai/gpt-4.1": false,
	"openai/gpt-4.1-fast": false,
	"openai/gpt-4.1-mini": false,
	"openai/gpt-4.1-mini-fast": false,
	"openai/gpt-4.1-nano": false,
	"openai/gpt-4.1-nano-fast": false,
	"openai/gpt-4o": false,
	"openai/gpt-4o-fast": false,
	"openai/gpt-4o-mini": false,
	"openai/gpt-4o-mini-fast": false,
	"openai/gpt-4o-mini-transcribe": false,
	"openai/gpt-4o-transcribe": false,
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
	"openai/gpt-5-codex": {
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
	"openai/gpt-5-fast": {
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
	"openai/gpt-5-mini-fast": {
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
	"openai/gpt-5.1-codex": {
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
	"openai/gpt-5.1-codex-max": {
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
	"openai/gpt-5.1-thinking": {
		map: {
			off: "none",
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.1-thinking-fast": {
		map: {
			off: "none",
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.2": {
		map: {
			off: "none",
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.2-codex": {
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
	"openai/gpt-5.2-fast": {
		map: {
			off: "none",
			minimal: "minimal",
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
	"openai/gpt-5.3-codex": {
		map: {
			off: "none",
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.3-codex-fast": {
		map: {
			off: "none",
			minimal: "minimal",
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
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.4-fast": {
		map: {
			off: "none",
			minimal: "minimal",
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
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.4-mini-fast": {
		map: {
			off: "none",
			minimal: "minimal",
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
			minimal: "minimal",
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
			off: "none",
			minimal: "minimal",
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
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: null
		},
		budget: false
	},
	"openai/gpt-5.5-fast": {
		map: {
			off: "none",
			minimal: "minimal",
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
	"openai/gpt-5.6-luna-fast": {
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
			minimal: "minimal",
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	},
	"openai/gpt-5.6-sol-fast": {
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
	"openai/gpt-5.6-terra": {
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
	"openai/gpt-5.6-terra-fast": {
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
	"openai/gpt-6-astra-fast": {
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
	"openai/gpt-6-luna-fast": {
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
	"openai/gpt-6-sol-fast": {
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
	"openai/gpt-6.1-sol-fast": {
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
	"openai/gpt-live-1": false,
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
	"openai/gpt-oss-safeguard-120b": {
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
	"openai/gpt-realtime-1.5": false,
	"openai/gpt-realtime-2": false,
	"openai/gpt-realtime-2.1": {
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
	"openai/gpt-realtime-mini": false,
	"openai/gpt-realtime-whisper": false,
	"openai/o1": {
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
	"openai/o3": {
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
	"openai/o3-fast": {
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
	"openai/o3-mini": {
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
	"openai/o3-pro": {
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
	"openai/o4-mini": {
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
	"openai/o4-mini-fast": {
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
	"openai/tts-1": false,
	"openai/tts-1-hd": false,
	"openai/whisper-1": false,
	"perplexity/sonar": false,
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
	"poolside/laguna-s-2.1-free": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"quiverai/arrow-2": {
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
	"quiverai/arrow-2-telos": {
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
	"sakana/fugu-max": {
		map: {
			off: null,
			minimal: null,
			low: null,
			medium: null,
			high: "high",
			xhigh: "xhigh",
			max: null
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
			max: null
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
			max: null
		},
		budget: false
	},
	"sakana/namazu": {
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
	"spacexai/grok-4.1-fast-non-reasoning": false,
	"spacexai/grok-4.1-fast-reasoning": {
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
	"spacexai/grok-4.20-multi-agent": {
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
	"spacexai/grok-4.20-multi-agent-beta": {
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
	"spacexai/grok-4.20-non-reasoning": false,
	"spacexai/grok-4.20-non-reasoning-beta": false,
	"spacexai/grok-4.20-reasoning": {
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
	"spacexai/grok-4.20-reasoning-beta": {
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
	"spacexai/grok-4.3": {
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
	"spacexai/grok-4.5": {
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
	"spacexai/grok-4.6": {
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
	"spacexai/grok-4.7": {
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
	"spacexai/grok-build-0.1": {
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
	"spacexai/grok-stt": false,
	"spacexai/grok-tts": false,
	"spacexai/grok-voice-think-fast-1.0": false,
	"spacexai/grok-voice-think-fast-2.0": false,
	"stealth/pixel-canary": {
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
	"stepfun/step-3.5-flash": {
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
	"stepfun/step-5-preview": false,
	"tencent/hy-mt2-lite": false,
	"tencent/hy-mt2-plus": false,
	"tencent/hy-mt2-pro": false,
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
	"tencent/hy4-preview": {
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
	"thinkingmachines/inkling": {
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
	"thinkingmachines/inkling-small": {
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
	"typesafe-ai/jev": false,
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
	"xiaomi/mimo-v2.6-pro": {
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
	"xiaomi/mimo-v2.6-pro-ultraspeed": {
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
	"zai/glm-4.5": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"zai/glm-4.5-air": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"zai/glm-4.5v": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"zai/glm-4.6": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"zai/glm-4.7": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"zai/glm-4.7-flash": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"zai/glm-4.7-flashx": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"zai/glm-5": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"zai/glm-5-turbo": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"zai/glm-5.1": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"zai/glm-5.2": {
		map: {
			off: "none",
			minimal: null,
			low: null,
			medium: null,
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: false
	},
	"zai/glm-5.2-fast": {
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
	"zai/glm-5.3": {
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
	"zai/glm-5.3-fast": {
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
	"zai/glm-5.3-flash": {
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
	"zai/glm-5.3-flashx": {
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
	"zai/glm-5v-turbo": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	}
};
//#endregion
export { VERCEL_GATEWAY_MODEL_REASONING };

//# sourceMappingURL=model-reasoning.js.map