import { resolveDebugOption } from "../../logger/resolve.js";
import { streamGenerationResult } from "../stream-generation-result.js";
import { applyGenerationResultTransforms, createGenerationContext, runGenerationAbort, runGenerationError, runGenerationFinish, runGenerationStart, runGenerationUsage } from "../middleware/run.js";
import { abortReasonMessage, createActivityAbortControls, isActivityAbortError, raceWithAbort } from "../../utilities/activity-abort.js";
import "./adapter.js";
import { aiEventClient } from "@tanstack/ai-event-client";
//#region src/activities/generateSpeech/index.ts
/**
* TTS Activity
*
* Generates speech audio from text using text-to-speech models.
* This is a self-contained module with implementation, types, and JSDoc.
*/
/** The adapter kind this activity handles */
var kind = "tts";
function createId(prefix) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
/**
* Validate the text/turns/timestamps trio against what the adapter declares,
* and return the `text` every adapter receives.
*
* For a dialogue request that text is the turn scripts joined by newlines:
* dialogue-aware adapters read `turns` and ignore it, but it keeps `text`
* non-optional on the adapter contract and gives the devtools event and the
* artifact inputs something truthful to show.
*/
function resolveSpeechText(adapter, input) {
	const { text, turns, timestamps } = input;
	if (timestamps && !adapter.capabilities?.timestamps) throw new Error(`${adapter.name} cannot return timestamps. Drop \`timestamps: true\` — the result would have no alignment to read.`);
	if (turns) {
		if (text !== void 0) throw new Error("generateSpeech() takes either `text` or `turns`, not both.");
		if (turns.length === 0) throw new Error("generateSpeech() `turns` must not be empty.");
		const maxSpeakers = adapter.capabilities?.maxSpeakers;
		if (maxSpeakers === void 0) throw new Error(`${adapter.name} cannot generate dialogue. Pass \`text\` (and \`voice\`) instead of \`turns\`.`);
		const speakers = new Set(turns.map((turn) => turn.voice)).size;
		if (speakers > maxSpeakers) throw new Error(`${adapter.name} accepts at most ${maxSpeakers} distinct voice${maxSpeakers === 1 ? "" : "s"} per request; received ${speakers}.`);
		return turns.map((turn) => turn.text).join("\n");
	}
	if (text === void 0) throw new Error("generateSpeech() requires either `text` or `turns`.");
	return text;
}
/**
* TTS activity - generates speech from text.
*
* Uses AI text-to-speech models to create audio from natural language text.
*
* @example Generate speech from text
* ```ts
* import { generateSpeech } from '@tanstack/ai'
* import { openaiSpeech } from '@tanstack/ai-openai'
*
* const result = await generateSpeech({
*   adapter: openaiSpeech('tts-1-hd'),
*   text: 'Hello, welcome to TanStack AI!',
*   voice: 'nova'
* })
*
* console.log(result.audio) // base64-encoded audio
* ```
*
* @example With format and speed options
* ```ts
* const result = await generateSpeech({
*   adapter: openaiSpeech('tts-1'),
*   text: 'This is slower speech.',
*   voice: 'alloy',
*   format: 'wav',
*   speed: 0.8
* })
* ```
*/
function generateSpeech(options) {
	if (options.stream) return streamGenerationResult((resolved) => runGenerateSpeech({
		...options,
		runId: resolved.runId
	}), options);
	return runGenerateSpeech(options);
}
/**
* Run the core TTS generation logic (non-streaming).
*/
async function runGenerateSpeech(options) {
	const { adapter, stream: _stream, debug: _debug, middleware, threadId, runId, timeout, abortSignal: callerAbortSignal, ...rest } = options;
	const model = adapter.model;
	const text = resolveSpeechText(adapter, rest);
	const requestId = createId("speech");
	const startTime = Date.now();
	const logger = resolveDebugOption(options.debug);
	const abortControls = createActivityAbortControls({
		timeout,
		abortSignal: callerAbortSignal
	});
	const providerName = adapter.provider ?? adapter.name ?? "unknown";
	const mwCtx = createGenerationContext({
		requestId,
		activity: "tts",
		provider: adapter.name,
		model,
		modelOptions: rest.modelOptions,
		artifactInputs: {
			text,
			voice: rest.voice,
			format: rest.format,
			speed: rest.speed
		},
		threadId,
		runId,
		createId
	});
	await runGenerationStart(middleware, mwCtx);
	aiEventClient.emit("speech:request:started", {
		requestId,
		provider: adapter.name,
		model,
		text,
		voice: rest.voice,
		format: rest.format,
		speed: rest.speed,
		modelOptions: rest.modelOptions,
		timestamp: startTime
	});
	logger.request(`activity=generateSpeech provider=${providerName}`, {
		provider: providerName,
		model
	});
	try {
		const rawResult = await raceWithAbort(adapter.generateSpeech({
			...rest,
			text,
			model,
			logger,
			...abortControls.signal ? { abortSignal: abortControls.signal } : {}
		}), abortControls.signal);
		abortControls.clear();
		const result = await applyGenerationResultTransforms(mwCtx, rawResult);
		const duration = Date.now() - startTime;
		aiEventClient.emit("speech:request:completed", {
			requestId,
			provider: adapter.name,
			model,
			audio: result.audio,
			format: result.format,
			audioDuration: result.duration,
			contentType: result.contentType,
			duration,
			modelOptions: rest.modelOptions,
			timestamp: Date.now()
		});
		if (result.usage) aiEventClient.emit("speech:usage", {
			requestId,
			model,
			usage: result.usage,
			modelOptions: rest.modelOptions,
			timestamp: Date.now()
		});
		logger.output(`activity=generateSpeech bytes=${result.audio.length}`, {
			bytes: result.audio.length,
			contentType: result.contentType
		});
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
		aiEventClient.emit("speech:request:error", {
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
		logger.errors("generateSpeech activity failed", {
			error,
			source: "generateSpeech"
		});
		throw error;
	}
}
/**
* List the voices an account can pass to `generateSpeech()`.
*
* Only providers with a per-account catalog implement this. A provider whose
* voices are a fixed list publishes that list as a const in its package, so
* import it from there rather than calling this.
*
* @example Find the voices you created
* ```ts
* import { listVoices } from '@tanstack/ai'
* import { elevenlabsSpeech } from '@tanstack/ai-elevenlabs'
*
* const { voices } = await listVoices({
*   adapter: elevenlabsSpeech('eleven_v4'),
*   origins: ['generated', 'cloned'],
* })
* ```
*/
async function listVoices(options) {
	const { adapter, ...rest } = options;
	const list = adapter.listVoices;
	if (!list) throw new Error(`The ${adapter.name} speech adapter has no per-account voice catalog to list. Its voices are a fixed set — import the voice list or union its package exports instead (for example \`GeminiTTSVoices\` from @tanstack/ai-gemini, or the \`OpenAITTSVoice\` union from @tanstack/ai-openai).`);
	return await list.call(adapter, rest);
}
/**
* Create typed options for the generateSpeech() function without executing.
*/
function createSpeechOptions(options) {
	return options;
}
//#endregion
export { createSpeechOptions, generateSpeech, kind, listVoices };

//# sourceMappingURL=index.js.map