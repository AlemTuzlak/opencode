import { clampReasoningLevel } from "@tanstack/ai";
import { reasoningBudget, reasoningValue } from "@tanstack/ai/adapter-internals";
//#region src/compatible/quirks.ts
var isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
/** The objects of an array field, for example `messages` or `tools`. */
var records = (value) => Array.isArray(value) ? value.filter(isRecord) : [];
/** pi: at least this many tokens stay for the answer under a shared ceiling. */
var MIN_ANSWER_TOKENS = 1024;
/**
* A chat template value: a fixed value, or `{ $var: 'thinking.enabled' }`,
* `{ $var: 'thinking.budget' }`, or `{ omitWhenOff: true }` (pi's shapes).
*/
function templateValues(values, reasoning, effort, budget) {
	const resolved = {};
	for (const [key, value] of Object.entries(values ?? {})) {
		if (typeof value !== "object" || value === null) {
			resolved[key] = value;
			continue;
		}
		if (!effort && "omitWhenOff" in value && value.omitWhenOff) continue;
		const variable = "$var" in value ? value.$var : void 0;
		if (variable === "thinking.enabled") resolved[key] = !!effort;
		else if (variable === "thinking.budget") {
			if (budget !== void 0) resolved[key] = budget;
		} else {
			const mapped = reasoningValue(reasoning, effort ?? "off");
			if (typeof mapped === "string") resolved[key] = mapped;
		}
	}
	return Object.keys(resolved).length > 0 ? resolved : void 0;
}
/**
* Write the thinking fields of `request` into `params`, the way pi's
* `buildParams` does for each `thinkingFormat`. `reasoning: false` (a model
* that does not reason) gets nothing.
*/
function applyThinking(params, request, reasoning, compat, modelMaxTokens) {
	if (reasoning === false) return;
	const level = clampReasoningLevel(reasoning, request.level);
	const effort = level === "off" ? void 0 : level;
	const on = effort !== void 0;
	const value = (target) => reasoningValue(reasoning, target);
	const map = reasoning?.map;
	const effortAllowed = compat.supportsReasoningEffort !== false;
	const ceiling = (typeof params.max_tokens === "number" ? params.max_tokens : void 0) ?? (typeof params.max_completion_tokens === "number" ? params.max_completion_tokens : void 0) ?? modelMaxTokens;
	const budget = on ? ceiling === void 0 ? reasoningBudget(request) : Math.min(reasoningBudget(request), Math.max(0, ceiling - MIN_ANSWER_TOKENS)) : void 0;
	switch (compat.thinkingFormat ?? "openai") {
		case "zai": {
			params.thinking = on ? {
				type: "enabled",
				clear_thinking: false
			} : { type: "disabled" };
			const mapped = on && effortAllowed ? value(effort) : null;
			if (typeof mapped === "string") params.reasoning_effort = mapped;
			break;
		}
		case "qwen": {
			params.enable_thinking = on;
			const mapped = on && effortAllowed ? value(effort) : null;
			if (typeof mapped === "string") params.reasoning_effort = mapped;
			break;
		}
		case "qwen-chat-template":
			params.chat_template_kwargs = {
				enable_thinking: on,
				preserve_thinking: true
			};
			break;
		case "chat-template": {
			const kwargs = templateValues(compat.chatTemplateKwargs, reasoning, effort, budget);
			if (kwargs) params.chat_template_kwargs = kwargs;
			break;
		}
		case "baseten": {
			const args = templateValues(compat.chatTemplateArgs, reasoning, effort, budget);
			if (args) params.chat_template_args = args;
			if (effortAllowed) {
				const mapped = value(effort ?? "off");
				if (typeof mapped === "string") params.reasoning_effort = mapped;
			}
			break;
		}
		case "deepseek":
			if (on) params.thinking = { type: "enabled" };
			else if (map?.off !== null) params.thinking = { type: "disabled" };
			if (on && effortAllowed) params.reasoning_effort = value(effort) ?? effort;
			break;
		case "openrouter":
			if (on) params.reasoning = { effort: value(effort) ?? effort };
			else if (map?.off !== null) params.reasoning = { effort: map?.off ?? "none" };
			break;
		case "ant-ling": {
			const mapped = on ? map?.[effort] : void 0;
			if (typeof mapped === "string") params.reasoning = { effort: mapped };
			break;
		}
		case "together":
			params.reasoning = { enabled: on };
			if (on && effortAllowed) params.reasoning_effort = value(effort) ?? effort;
			break;
		case "string-thinking":
			if (on) params.thinking = value(effort) ?? effort;
			else if (map?.off !== null) params.thinking = map?.off ?? "none";
			break;
		case "openai": if (effortAllowed) {
			const mapped = value(effort ?? "off");
			if (typeof mapped === "string" && (on || map?.off !== void 0)) params.reasoning_effort = mapped;
		}
	}
	if (compat.thinkingTokenBudgetField && budget !== void 0 && budget > 0) params[compat.thinkingTokenBudgetField] = budget;
}
/** Put an Anthropic cache marker on the last text part of a message. */
function markMessage(message, marker) {
	const content = message.content;
	if (typeof content === "string") {
		if (content.length === 0) return false;
		message.content = [{
			type: "text",
			text: content,
			cache_control: marker
		}];
		return true;
	}
	if (!Array.isArray(content)) return false;
	for (let index = content.length - 1; index >= 0; index--) {
		const part = content[index];
		if (isRecord(part) && part.type === "text") {
			content[index] = {
				...part,
				cache_control: marker
			};
			return true;
		}
	}
	return false;
}
/**
* The quirks that are not about thinking: the instruction role, the token
* field name, `store`, strict tools, `tool_stream`, and cache markers.
* `promptCache` sets the cache markers. When it is absent, the markers stay
* as today.
*/
function applyRequestQuirks(params, compat, reasons, promptCache) {
	const messages = records(params.messages);
	const instructions = messages.find((message) => message.role === "system");
	if (instructions && reasons && compat.supportsDeveloperRole !== false) instructions.role = "developer";
	const rename = (from, to) => {
		if (params[from] === void 0) return;
		params[to] = params[from];
		delete params[from];
	};
	if (compat.maxTokensField === "max_tokens") rename("max_completion_tokens", "max_tokens");
	if (compat.maxTokensField === "max_completion_tokens") rename("max_tokens", "max_completion_tokens");
	if (compat.supportsStore === false) delete params.store;
	if (compat.supportsTemperature === false) delete params.temperature;
	const tools = records(params.tools);
	if (tools.length > 0) {
		if (compat.supportsStrictMode === false) {
			for (const tool of tools) if (isRecord(tool.function)) tool.function = {
				...tool.function,
				strict: false
			};
		}
		if (compat.zaiToolStream) params.tool_stream = true;
	}
	if (compat.cacheControlFormat === "anthropic" && promptCache?.retention !== "none") {
		const marker = promptCache?.retention === "long" && compat.supportsLongCacheRetention !== false ? {
			type: "ephemeral",
			ttl: "1h"
		} : { type: "ephemeral" };
		const system = messages.find((message) => message.role === "system" || message.role === "developer");
		if (system) markMessage(system, marker);
		const lastTool = tools.at(-1);
		if (lastTool) lastTool.cache_control = marker;
		for (let index = messages.length - 1; index >= 0; index--) {
			const message = messages[index];
			if (message && [
				"user",
				"assistant",
				"tool"
			].includes(String(message.role)) && markMessage(message, marker)) break;
		}
	}
}
/**
* The thinking of an earlier assistant turn, sent back as
* `reasoning_content`. Some providers (DeepSeek) refuse the next turn without
* it, so it is `''` when the turn had no thinking.
*/
function replayReasoning(thinking) {
	return (thinking ?? []).map((part) => part.content).filter((content) => content.trim().length > 0).join("\n");
}
/** The session headers for `sendSessionAffinityHeaders`, as pi sends them. */
function sessionHeaders(compat, sessionId) {
	if (!sessionId || !compat.sendSessionAffinityHeaders) return void 0;
	if (compat.sessionAffinityFormat === "openrouter") return { "x-session-id": sessionId };
	return {
		...(compat.sessionAffinityFormat ?? "openai") === "openai" ? { session_id: sessionId } : {},
		"x-client-request-id": sessionId,
		"x-session-affinity": sessionId
	};
}
//#endregion
export { applyRequestQuirks, applyThinking, replayReasoning, sessionHeaders };

//# sourceMappingURL=quirks.js.map