//#region src/model-reasoning.ts
/** The same data at runtime. `false`: the model does not reason. */
var ANTHROPIC_MODEL_REASONING = {
	"claude-haiku-5-5": {
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
	"claude-sonnet-5-5": {
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
	"claude-opus-5-5": {
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
	"claude-fable-5-1": {
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
	"claude-opus-5-fast": {
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
	"claude-opus-4-6": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: true
	},
	"claude-opus-4-5": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: null
		},
		budget: true
	},
	"claude-sonnet-4-6": {
		map: {
			off: null,
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: null,
			max: "max"
		},
		budget: true
	},
	"claude-sonnet-4-5": { budget: true },
	"claude-haiku-4-5": { budget: true },
	"claude-opus-4-1": { budget: true },
	"claude-opus-4-7": {
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
	"claude-opus-4-8": {
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
	"claude-fable-5": {
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
			off: "none",
			minimal: null,
			low: "low",
			medium: "medium",
			high: "high",
			xhigh: "xhigh",
			max: "max"
		},
		budget: false
	}
};
//#endregion
export { ANTHROPIC_MODEL_REASONING };

//# sourceMappingURL=model-reasoning.js.map