//#region src/model-reasoning.ts
/** The same data at runtime. `false`: the model does not reason. */
var BEDROCK_MODEL_REASONING = {
	"openai.gpt-oss-120b-1:0": {
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
	"openai.gpt-oss-20b-1:0": {
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
	"us.anthropic.claude-sonnet-4-5-20250929-v1:0": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: true
	},
	"us.anthropic.claude-haiku-4-5-20251001-v1:0": {
		map: {
			off: "off",
			minimal: null,
			low: null,
			medium: null,
			high: "high"
		},
		budget: true
	},
	"us.amazon.nova-pro-v1:0": false,
	"us.amazon.nova-lite-v1:0": false,
	"us.amazon.nova-micro-v1:0": false,
	"us.meta.llama3-3-70b-instruct-v1:0": false,
	"us.meta.llama4-maverick-17b-instruct-v1:0": false,
	"us.mistral.pixtral-large-2502-v1:0": false,
	"us.deepseek.r1-v1:0": { budget: false },
	"google.gemma-4-31b": {
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
	"google.gemma-4-26b-a4b": {
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
	"google.gemma-4-e2b": {
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
	}
};
//#endregion
export { BEDROCK_MODEL_REASONING };

//# sourceMappingURL=model-reasoning.js.map