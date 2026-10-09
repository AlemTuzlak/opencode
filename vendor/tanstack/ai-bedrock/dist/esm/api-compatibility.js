//#region src/api-compatibility.ts
var BEDROCK_API_COMPATIBILITY = [
	{
		match: "openai.gpt-oss",
		converse: true,
		chat: true,
		responses: true
	},
	{
		match: "anthropic.claude",
		converse: true,
		chat: false,
		responses: false
	},
	{
		match: "amazon.nova",
		converse: true,
		chat: false,
		responses: false
	},
	{
		match: "meta.llama",
		converse: true,
		chat: false,
		responses: false
	},
	{
		match: "ai21.jamba",
		converse: true,
		chat: false,
		responses: false
	},
	{
		match: "cohere.command",
		converse: true,
		chat: false,
		responses: false
	},
	{
		match: "deepseek.r1",
		converse: true,
		chat: false,
		responses: false
	},
	{
		match: "deepseek",
		converse: true,
		chat: true,
		responses: false
	},
	{
		match: "mistral.pixtral",
		converse: true,
		chat: false,
		responses: false
	},
	{
		match: "mistral",
		converse: true,
		chat: true,
		responses: false
	},
	{
		match: "qwen",
		converse: true,
		chat: true,
		responses: false
	},
	{
		match: "google.gemma-4-",
		converse: false,
		chat: true,
		responses: true,
		mantlePath: "/openai/v1",
		models: [
			{
				id: "google.gemma-4-31b",
				input: ["text", "image"]
			},
			{
				id: "google.gemma-4-26b-a4b",
				input: ["text", "image"]
			},
			{
				id: "google.gemma-4-e2b",
				input: ["text", "image"]
			}
		]
	},
	{
		match: "google.gemma",
		converse: true,
		chat: true,
		responses: false,
		mantlePath: "/v1"
	}
];
var DEFAULT_COMPAT = {
	converse: true,
	chat: false,
	responses: false,
	mantlePath: "/v1"
};
function lookupBedrockCompatibility(id) {
	for (const rule of BEDROCK_API_COMPATIBILITY) if (id.includes(rule.match)) return {
		converse: rule.converse,
		chat: rule.chat,
		responses: rule.responses,
		mantlePath: rule.mantlePath ?? "/v1"
	};
	return DEFAULT_COMPAT;
}
/** Mantle OpenAI path from the compatibility config. Unknown ids stay on `/v1`. */
function mantlePathForModel(model) {
	if (typeof model !== "string") return "/v1";
	return lookupBedrockCompatibility(model).mantlePath;
}
//#endregion
export { BEDROCK_API_COMPATIBILITY, lookupBedrockCompatibility, mantlePathForModel };

//# sourceMappingURL=api-compatibility.js.map