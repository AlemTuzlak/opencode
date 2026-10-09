//#region src/model-reasoning.ts
/** The same data at runtime. `false`: the model does not reason. */
var GROQ_MODEL_REASONING = {
	"llama-3.1-8b-instant": false,
	"llama-3.3-70b-versatile": false,
	"meta-llama/llama-4-maverick-17b-128e-instruct": false,
	"meta-llama/llama-4-scout-17b-16e-instruct": false,
	"meta-llama/llama-guard-4-12b": false,
	"meta-llama/llama-prompt-guard-2-86m": false,
	"meta-llama/llama-prompt-guard-2-22m": false,
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
	"moonshotai/kimi-k2-instruct-0905": false,
	"qwen/qwen3-32b": {
		map: {
			off: "none",
			minimal: null,
			low: null,
			medium: null,
			high: "default",
			xhigh: null,
			max: null
		},
		budget: false
	}
};
//#endregion
export { GROQ_MODEL_REASONING };

//# sourceMappingURL=model-reasoning.js.map