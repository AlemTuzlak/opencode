//#region src/model-reasoning.ts
/** The same data at runtime. `false`: the model does not reason. */
var LLMGATEWAY_MODEL_REASONING = {
	"gpt-5.6-terra": {
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
	"gpt-5.5": {
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
	"gpt-5.4-mini": {
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
	"claude-opus-5": {
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
	"claude-sonnet-5": {
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
	"claude-haiku-4-5": {
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
	"gemini-pro-latest": {
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
	"gemini-3.6-flash": {
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
	"kimi-k3": {
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
	"glm-5.2": {
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
	"deepseek-v4-pro": {
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
	"qwen3.7-max": {
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
	"minimax-m2.5": {
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
	"grok-4-5": {
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
export { LLMGATEWAY_MODEL_REASONING };

//# sourceMappingURL=model-reasoning.js.map