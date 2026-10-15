//#region src/model-reasoning.ts
/** The same data at runtime. `false`: the model does not reason. */
var CLOUDFLARE_MODEL_REASONING = {
	"@cf/meta/llama-3.3-70b-instruct-fp8-fast": false,
	"@cf/meta/llama-guard-3-8b": false,
	"@cf/meta/llama-3.1-8b-instruct-fp8": false,
	"@cf/meta/llama-3.2-11b-vision-instruct": false,
	"@cf/meta/llama-3.2-1b-instruct": false,
	"@cf/meta/llama-4-scout-17b-16e-instruct": false,
	"@cf/meta/llama-3.2-3b-instruct": false,
	"@cf/google/gemma-4-26b-a4b-it": {
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
	"@cf/aisingapore/gemma-sea-lion-v4-27b-it": false,
	"@cf/ibm-granite/granite-4.0-h-micro": false,
	"@cf/deepseek-ai/deepseek-v4-flash-0731": {
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
	"@cf/deepseek-ai/deepseek-v4-pro-0813": {
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
	"@cf/deepseek-ai/deepseek-r1-distill-qwen-32b": { budget: false },
	"@cf/mistralai/mistral-small-3.1-24b-instruct": false,
	"@cf/moonshotai/kimi-k2.6": {
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
	"@cf/moonshotai/kimi-k2.7-code": { budget: false },
	"@cf/zai-org/glm-5.3-flash": {
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
	"@cf/zai-org/glm-4.7-flash": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: false
	},
	"@cf/zai-org/glm-5.2": {
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
	"@cf/zai-org/glm-5.3": {
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
	"@cf/nvidia/nemotron-3-120b-a12b": {
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
	"@cf/qwen/qwen3.8-27b": {
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
	"@cf/qwen/qwq-32b": { budget: false },
	"@cf/qwen/qwen3-30b-a3b-fp8": { budget: false },
	"@cf/qwen/qwen2.5-coder-32b-instruct": false,
	"@cf/openai/gpt-oss-20b": {
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
	"@cf/openai/gpt-oss-120b": {
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
	}
};
//#endregion
export { CLOUDFLARE_MODEL_REASONING };

//# sourceMappingURL=model-reasoning.js.map