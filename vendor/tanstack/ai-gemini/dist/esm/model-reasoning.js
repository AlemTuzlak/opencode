//#region src/model-reasoning.ts
/** The same data at runtime. `false`: the model does not reason. */
var GEMINI_MODEL_REASONING = {
	"gemini-3.8-flash": {
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
	"gemini-3.7-flash": {
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
	"gemini-3.5-flash": {
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
	"gemini-3.5-flash-lite": {
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
	"gemini-3.1-pro-preview": {
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
	"gemini-3-flash-preview": {
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
	"gemini-3.1-flash-lite": {
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
	"gemini-3.1-flash-lite-preview": {
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
	"gemini-2.5-pro": { budget: true },
	"gemini-2.5-flash": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: true
	},
	"gemini-2.5-flash-lite": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: true
	}
};
//#endregion
export { GEMINI_MODEL_REASONING };

//# sourceMappingURL=model-reasoning.js.map