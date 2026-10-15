import { fromSpecTokenUsage, toSpecTokenUsage } from "./utilities/ag-ui-usage.js";
import { mergeMetadata, tanstackMetadata, withTanstackMetadata } from "./utilities/merge-metadata.js";
import { normalizeStreamChunk } from "./utilities/normalize-stream-chunk.js";
import { canonicalInterruptJson, cloneAndDeepFreezeJson, digestInterruptJson } from "./interrupt-serialization.js";
import { INTERRUPT_BINDING_VERSION, canonicalizeInterruptResolutions } from "./interrupts.js";
import { convertSchemaToJsonSchema, isStandardSchema, parseWithStandardSchema, validateWithStandardSchema } from "./activities/chat/tools/schema-converter.js";
import { hashSchemaInput, normalizeApprovalSchema } from "./activities/chat/tools/approval-schema.js";
import { INTERRUPT_BINDING_METADATA_KEY, readInterruptBinding, readUnopenedInterruptBinding, withInterruptBinding, withoutInterruptBinding } from "./interrupt-resume.js";
import { INTERRUPT_PAYLOAD_METADATA_KEY, defineInterrupt, hashInterruptDefinitionSchema } from "./interrupt-definition.js";
import { INTERRUPT_CONTINUATION_METADATA_KEY, INTERRUPT_CONTINUATION_VERSION, genericInterruptContinuationFromDescriptor, readGenericInterruptContinuation, wrapGenericInterruptContinuation } from "./generic-interrupt-continuation.js";
import { convertMessagesToModelMessages, generateMessageId, modelMessageToUIMessage, modelMessagesToUIMessages, normalizeToUIMessage, uiMessageToModelMessages } from "./activities/chat/messages.js";
import { uiMessagesToWire } from "./utilities/ag-ui-wire.js";
import { restoreInboundChunk } from "./utilities/restore-inbound-chunk.js";
import { defineAgent } from "./activities/chat/agents/define-agent.js";
import { subagentRoute } from "./activities/chat/agents/route.js";
import { fileSourceFromHandle } from "./activities/files/index.js";
import { toolDefinition } from "./activities/chat/tools/tool-definition.js";
import { getChunkRunId, getChunkThreadId } from "./utilities/chunk-ids.js";
import { PartialJSONParser, defaultJSONParser, parsePartialJSON } from "./activities/chat/stream/json-parser.js";
import { BatchStrategy, CompositeStrategy, ImmediateStrategy, PunctuationStrategy, WordBoundaryStrategy } from "./activities/chat/stream/strategies.js";
import { StreamProcessor } from "./activities/chat/stream/processor.js";
import { EventType } from "@ag-ui/core";
//#region src/client.ts
var generationKinds = [
	"image",
	"audio",
	"tts",
	"voice",
	"video",
	"transcription",
	"world",
	"liveVideo"
];
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function hasOwnKey(value, key) {
	return Object.prototype.hasOwnProperty.call(value, key);
}
function isGenerationEnvelope(body) {
	return isRecord(body) && (hasOwnKey(body, "data") || hasOwnKey(body, "forwardedProps"));
}
function assertGenerationKind(kind) {
	if (!generationKinds.includes(kind)) throw new Error(`Unsupported generation kind: ${String(kind)}. Expected one of ${generationKinds.join(", ")}.`);
}
/**
* The input field(s) that identify a generation body for a kind. Most kinds
* have exactly one; `voice` accepts either of its two creation modes, so any
* one of its keys is enough.
*/
function requiredKeysForKind(kind) {
	switch (kind) {
		case "tts": return ["text"];
		case "transcription": return ["audio"];
		case "voice": return ["prompt", "referenceAudio"];
		case "image":
		case "audio":
		case "video":
		case "world":
		case "liveVideo": return ["prompt"];
	}
}
function assertInputForKind(kind, input) {
	if (!isRecord(input)) throw new Error(`Generation ${kind} input must be an object.`);
	const requiredKeys = requiredKeysForKind(kind);
	if (!requiredKeys.some((key) => hasOwnKey(input, key))) throw new Error(`Generation ${kind} input must include ${requiredKeys.join(" or ")}.`);
}
function isInputForKind(kind, input) {
	if (!isRecord(input)) return false;
	return requiredKeysForKind(kind).some((key) => hasOwnKey(input, key));
}
function forwardedPropsFromEnvelope(envelope) {
	if (!hasOwnKey(envelope, "forwardedProps")) return {};
	if (!isRecord(envelope.forwardedProps)) throw new Error("Generation envelope forwardedProps must be an object.");
	return envelope.forwardedProps;
}
function optionalStringField(envelope, key) {
	if (!hasOwnKey(envelope, key)) return;
	const value = envelope[key];
	if (typeof value !== "string") throw new Error(`Generation envelope ${key} must be a string.`);
	return value;
}
function generationIdentityFields(envelope) {
	const identity = {};
	const threadId = optionalStringField(envelope, "threadId");
	const runId = optionalStringField(envelope, "runId");
	if (threadId !== void 0) identity.threadId = threadId;
	if (runId !== void 0) identity.runId = runId;
	return identity;
}
function generationParamsFromBody(kind, body) {
	assertGenerationKind(kind);
	if (isInputForKind(kind, body)) {
		assertInputForKind(kind, body);
		return {
			input: body,
			forwardedProps: {}
		};
	}
	if (!isGenerationEnvelope(body)) {
		assertInputForKind(kind, body);
		return {
			input: body,
			forwardedProps: {}
		};
	}
	if (!hasOwnKey(body, "data")) throw new Error(`Generation ${kind} envelope must include data.`);
	const input = body.data;
	assertInputForKind(kind, input);
	return {
		input,
		forwardedProps: forwardedPropsFromEnvelope(body),
		...generationIdentityFields(body)
	};
}
async function generationParamsFromRequest(kind, request) {
	let body;
	try {
		body = await request.json();
	} catch (error) {
		throw new Error("Invalid JSON request body.", { cause: error });
	}
	if (!isRecord(body)) throw new Error("Generation request body must be a JSON object.");
	return generationParamsFromBody(kind, body);
}
//#endregion
export { BatchStrategy, CompositeStrategy, EventType, INTERRUPT_BINDING_METADATA_KEY, INTERRUPT_BINDING_VERSION, INTERRUPT_CONTINUATION_METADATA_KEY, INTERRUPT_CONTINUATION_VERSION, INTERRUPT_PAYLOAD_METADATA_KEY, ImmediateStrategy, PartialJSONParser, PunctuationStrategy, StreamProcessor, WordBoundaryStrategy, canonicalInterruptJson, canonicalizeInterruptResolutions, cloneAndDeepFreezeJson, convertMessagesToModelMessages, convertSchemaToJsonSchema, defaultJSONParser, defineAgent, defineInterrupt, digestInterruptJson, fileSourceFromHandle, fromSpecTokenUsage, generateMessageId, generationParamsFromBody, generationParamsFromRequest, genericInterruptContinuationFromDescriptor, getChunkRunId, getChunkThreadId, hashInterruptDefinitionSchema, hashSchemaInput, isStandardSchema, mergeMetadata, modelMessageToUIMessage, modelMessagesToUIMessages, normalizeApprovalSchema, normalizeStreamChunk, normalizeToUIMessage, parsePartialJSON, parseWithStandardSchema, readGenericInterruptContinuation, readInterruptBinding, readUnopenedInterruptBinding, restoreInboundChunk, subagentRoute, tanstackMetadata, toSpecTokenUsage, toolDefinition, uiMessageToModelMessages, uiMessagesToWire, validateWithStandardSchema, withInterruptBinding, withTanstackMetadata, withoutInterruptBinding, wrapGenericInterruptContinuation };

//# sourceMappingURL=client.js.map