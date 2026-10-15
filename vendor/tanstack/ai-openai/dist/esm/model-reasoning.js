//#region src/model-reasoning.ts
/** The same data at runtime. `false`: the model does not reason. */
var OPENAI_MODEL_REASONING = {
	"gpt-6.1-sol": {
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
	"gpt-6.1-sol-pro": {
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
	"gpt-6-luna": {
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
	"gpt-6-luna-pro": {
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
	"gpt-6-sol": {
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
	"gpt-6-sol-pro": {
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
	"gpt-6-astra": {
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
	"gpt-6-astra-pro": {
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
	"gpt-5.6-luna-pro": {
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
	"gpt-5.6-sol-pro": {
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
	"gpt-5.6-terra-pro": {
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
	"gpt-5.2": {
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
	"gpt-5.2-pro": {
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
	"gpt-5.2-chat-latest": {
		map: {
			off: null,
			minimal: null,
			low: null,
			medium: "medium",
			high: null,
			xhigh: null,
			max: null
		},
		budget: false
	},
	"gpt-5.1": {
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
	"gpt-5.1-codex": {
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
	"gpt-5": {
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
	"gpt-5-mini": {
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
	"gpt-5-nano": {
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
	"gpt-5-pro": {
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
	"gpt-5-codex": {
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
	o3: {
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
	"o3-pro": {
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
	"o3-mini": {
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
	"o4-mini": {
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
	"gpt-4.1": false,
	"gpt-4.1-mini": false,
	"gpt-4.1-nano": false,
	"gpt-4": false,
	"gpt-4-turbo": false,
	"gpt-4o": false,
	"gpt-4o-mini": false,
	"gpt-3.5-turbo": false,
	"gpt-audio": false,
	"gpt-audio-mini": false,
	"gpt-5-chat-latest": false,
	"gpt-5.1-codex-mini": {
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
	o1: {
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
	"o1-pro": {
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
	"gpt-5.6": {
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
	"gpt-5.6-sol": {
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
	"gpt-5.6-luna": {
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
	"gpt-5.5-pro": {
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
	"gpt-5.4-nano": {
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
	"gpt-5.4-image-2": {
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
	"gpt-chat-latest": {
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
export { OPENAI_MODEL_REASONING };

//# sourceMappingURL=model-reasoning.js.map