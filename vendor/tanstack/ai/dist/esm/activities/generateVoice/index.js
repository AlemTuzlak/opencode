import { resolveDebugOption } from "../../logger/resolve.js";
import { streamGenerationResult } from "../stream-generation-result.js";
import { applyGenerationResultTransforms, createGenerationContext, runGenerationAbort, runGenerationError, runGenerationFinish, runGenerationStart, runGenerationUsage } from "../middleware/run.js";
import { abortReasonMessage, createActivityAbortControls, isActivityAbortError, raceWithAbort } from "../../utilities/activity-abort.js";
import "./adapter.js";
import { aiEventClient } from "@tanstack/ai-event-client";
//#region src/activities/generateVoice/index.ts
/**
* Voice Activity
*
* Creates a reusable voice — either designed from a text description or cloned
* from reference audio — and returns voice ids that `generateSpeech()` accepts.
* This is a self-contained module with implementation, types, and JSDoc.
*/
/** The adapter kind this activity handles */
var kind = "voice";
function createId(prefix) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
/**
* Voice activity - creates a reusable voice.
*
* Providers create voices in one of two ways, and some support both: design a
* new voice from a text description, or clone one from reference audio. Either
* way the result carries voice ids you pass back to `generateSpeech()`.
*
* @example Design a voice from a description
* ```ts
* import { generateVoice, generateSpeech } from '@tanstack/ai'
* import { elevenlabsVoiceDesign, elevenlabsSpeech } from '@tanstack/ai-elevenlabs'
*
* const designed = await generateVoice({
*   adapter: elevenlabsVoiceDesign('eleven_ttv_v3'),
*   prompt: 'A warm, gravelly narrator in his sixties with a slight Irish lilt',
* })
*
* const [preview] = designed.voices
* if (!preview) throw new Error('No voice candidates returned')
*
* const speech = await generateSpeech({
*   adapter: elevenlabsSpeech('eleven_v4'),
*   text: 'Once upon a time...',
*   voice: preview.voiceId,
* })
* ```
*
* @example Save the voice to the provider's library
* ```ts
* const saved = await generateVoice({
*   adapter: elevenlabsVoiceDesign('eleven_ttv_v3'),
*   prompt: 'A bright, upbeat product demo host',
*   name: 'Demo Host',
*   description: 'Bright, upbeat, mid-30s',
* })
* ```
*/
function generateVoice(options) {
	if (options.stream) return streamGenerationResult((resolved) => runGenerateVoice({
		...options,
		runId: resolved.runId
	}), options);
	return runGenerateVoice(options);
}
/**
* Run the core voice generation logic (non-streaming).
*/
async function runGenerateVoice(options) {
	const { adapter, stream: _stream, debug: _debug, middleware, threadId, runId, timeout, abortSignal: callerAbortSignal, ...rest } = options;
	if (rest.prompt == null && rest.referenceAudio == null) throw new Error("generateVoice() requires `prompt` (design a new voice) or `referenceAudio` (clone an existing one).");
	const model = adapter.model;
	const requestId = createId("voice");
	const startTime = Date.now();
	const logger = resolveDebugOption(options.debug);
	const abortControls = createActivityAbortControls({
		timeout,
		abortSignal: callerAbortSignal
	});
	const mwCtx = createGenerationContext({
		requestId,
		activity: "voice",
		provider: adapter.name,
		model,
		modelOptions: rest.modelOptions,
		artifactInputs: {
			prompt: rest.prompt,
			name: rest.name,
			description: rest.description
		},
		threadId,
		runId,
		createId
	});
	await runGenerationStart(middleware, mwCtx);
	aiEventClient.emit("voice:request:started", {
		requestId,
		provider: adapter.name,
		model,
		prompt: rest.prompt,
		name: rest.name,
		description: rest.description,
		hasReferenceAudio: rest.referenceAudio != null,
		modelOptions: rest.modelOptions,
		timestamp: startTime
	});
	logger.request(`activity=generateVoice provider=${adapter.name}`, {
		provider: adapter.name,
		model
	});
	try {
		const rawResult = await raceWithAbort(adapter.generateVoice({
			...rest,
			model,
			logger,
			...abortControls.signal ? { abortSignal: abortControls.signal } : {}
		}), abortControls.signal);
		abortControls.clear();
		const result = await applyGenerationResultTransforms(mwCtx, rawResult);
		const duration = Date.now() - startTime;
		aiEventClient.emit("voice:request:completed", {
			requestId,
			provider: adapter.name,
			model,
			voiceIds: result.voices.map((voice) => voice.voiceId),
			voiceCount: result.voices.length,
			previewText: result.previewText,
			duration,
			modelOptions: rest.modelOptions,
			timestamp: Date.now()
		});
		if (result.usage) aiEventClient.emit("voice:usage", {
			requestId,
			model,
			usage: result.usage,
			modelOptions: rest.modelOptions,
			timestamp: Date.now()
		});
		logger.output(`activity=generateVoice voices=${result.voices.length}`, { voices: result.voices.length });
		if (result.usage) await runGenerationUsage(middleware, mwCtx, result.usage);
		await runGenerationFinish(middleware, mwCtx, {
			duration,
			usage: result.usage
		});
		return result;
	} catch (error) {
		abortControls.clear();
		const duration = Date.now() - startTime;
		const err = error;
		aiEventClient.emit("voice:request:error", {
			requestId,
			provider: adapter.name,
			model,
			error: {
				message: err.message,
				name: err.name
			},
			duration,
			modelOptions: rest.modelOptions,
			timestamp: Date.now()
		});
		if (isActivityAbortError(error, abortControls.signal)) await runGenerationAbort(middleware, mwCtx, {
			reason: abortReasonMessage(error, abortControls.signal),
			duration
		});
		else await runGenerationError(middleware, mwCtx, {
			error,
			duration
		});
		logger.errors("generateVoice activity failed", {
			error,
			source: "generateVoice"
		});
		throw error;
	}
}
/**
* Create typed options for the generateVoice() function without executing.
*/
function createVoiceOptions(options) {
	return options;
}
//#endregion
export { createVoiceOptions, generateVoice, kind };

//# sourceMappingURL=index.js.map