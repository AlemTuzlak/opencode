//#region src/model-reasoning.ts
/** The same data at runtime. `false`: the model does not reason. */
var MISTRAL_MODEL_REASONING = {
	"mistral-large-latest": false,
	"mistral-medium-latest": {
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
	"mistral-small-latest": {
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
	"ministral-8b-latest": false,
	"ministral-3b-latest": false,
	"codestral-latest": false,
	"pixtral-large-latest": false,
	"magistral-medium-latest": { budget: false },
	"open-mistral-nemo": false,
	"mistral-medium-3": false,
	"mistral-small-2503": false
};
//#endregion
export { MISTRAL_MODEL_REASONING };

//# sourceMappingURL=model-reasoning.js.map