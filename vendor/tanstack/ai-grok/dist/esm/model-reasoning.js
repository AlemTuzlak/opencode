//#region src/model-reasoning.ts
/** The same data at runtime. `false`: the model does not reason. */
var GROK_MODEL_REASONING = {
	"grok-4.7": {
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
	"grok-4.5": {
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
	"grok-4.6": {
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
	"grok-build-0.1": false,
	"grok-4.3": {
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
	"grok-4.20-reasoning": { budget: false },
	"grok-4.20-non-reasoning": false,
	"grok-4.1-fast-reasoning": { budget: false },
	"grok-4.1-fast-non-reasoning": false
};
//#endregion
export { GROK_MODEL_REASONING };

//# sourceMappingURL=model-reasoning.js.map