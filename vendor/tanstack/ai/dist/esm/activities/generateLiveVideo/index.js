import { resolveDebugOption } from "../../logger/resolve.js";
import { streamGenerationResult } from "../stream-generation-result.js";
import { applyGenerationResultTransforms, createGenerationContext, runGenerationAbort, runGenerationError, runGenerationFinish, runGenerationStart, runGenerationUsage } from "../middleware/run.js";
import { abortReasonMessage, createActivityAbortControls, isActivityAbortError, raceWithAbort } from "../../utilities/activity-abort.js";
import "./adapter.js";
import { aiEventClient } from "@tanstack/ai-event-client";
//#region src/activities/generateLiveVideo/index.ts
/**
* Live Activity (Experimental)
*
* Mints a session token for a live, prompt-steerable video session. Unlike
* generateVideo (a job that finishes with a URL), the browser then connects
* with the token, sets the prompt, and streams until stop/close.
*
* @experimental Live generation is an experimental feature and may change.
*/
/** The adapter kind this activity handles */
var kind = "liveVideo";
function createId(prefix) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
/**
* Live generation activity - opens a live, prompt-steerable video session.
*
* @example Mint a session token on the server
* ```ts
* import { generateLiveVideo } from '@tanstack/ai'
* import { reactorVideo } from '@tanstack/ai-reactor'
*
* const live = await generateLiveVideo({
*   adapter: reactorVideo('helios'),
*   prompt: 'A red sports car powerslides a mountain hairpin',
* })
*
* // Hand live.token, live.model, and live.prompt to the browser.
* ```
*
* @experimental Live generation is an experimental feature and may change.
*/
function generateLiveVideo(options) {
	if (options.stream) return streamGenerationResult((resolved) => runGenerateLiveVideo({
		...options,
		runId: resolved.runId
	}), options);
	return runGenerateLiveVideo(options);
}
/**
* Run the core live generation logic (non-streaming).
*/
async function runGenerateLiveVideo(options) {
	const { adapter, stream: _stream, debug: _debug, middleware, threadId, runId, timeout, abortSignal: callerAbortSignal, ...rest } = options;
	const model = adapter.model;
	const requestId = createId("liveVideo");
	const startTime = Date.now();
	const logger = resolveDebugOption(options.debug);
	const abortControls = createActivityAbortControls({
		timeout,
		abortSignal: callerAbortSignal
	});
	const providerName = adapter.provider ?? adapter.name ?? "unknown";
	const mwCtx = createGenerationContext({
		requestId,
		activity: "liveVideo",
		provider: adapter.name,
		model,
		modelOptions: rest.modelOptions,
		threadId,
		runId,
		artifactInputs: { prompt: rest.prompt },
		createId
	});
	await runGenerationStart(middleware, mwCtx);
	aiEventClient.emit("liveVideo:request:started", {
		requestId,
		provider: adapter.name,
		model,
		prompt: rest.prompt,
		timestamp: startTime,
		...rest.modelOptions !== void 0 && { modelOptions: rest.modelOptions }
	});
	logger.request(`activity=generateLiveVideo provider=${providerName}`, {
		provider: providerName,
		model
	});
	try {
		const rawResult = await raceWithAbort(adapter.createLiveVideo({
			...rest,
			model,
			logger,
			...abortControls.signal ? { abortSignal: abortControls.signal } : {}
		}), abortControls.signal);
		abortControls.clear();
		const result = await applyGenerationResultTransforms(mwCtx, rawResult);
		const elapsedMs = Date.now() - startTime;
		aiEventClient.emit("liveVideo:request:completed", {
			requestId,
			provider: adapter.name,
			model: result.model,
			prompt: result.prompt,
			status: result.status,
			duration: elapsedMs,
			timestamp: Date.now(),
			...rest.modelOptions !== void 0 && { modelOptions: rest.modelOptions }
		});
		if (result.usage) aiEventClient.emit("liveVideo:usage", {
			requestId,
			model: result.model,
			usage: result.usage,
			timestamp: Date.now(),
			...rest.modelOptions !== void 0 && { modelOptions: rest.modelOptions }
		});
		logger.output(`activity=generateLiveVideo provider=${providerName}`, {
			model: result.model,
			status: result.status
		});
		if (result.usage) await runGenerationUsage(middleware, mwCtx, result.usage);
		await runGenerationFinish(middleware, mwCtx, {
			duration: elapsedMs,
			usage: result.usage
		});
		return result;
	} catch (error) {
		abortControls.clear();
		const elapsedMs = Date.now() - startTime;
		const err = error;
		aiEventClient.emit("liveVideo:request:error", {
			requestId,
			provider: adapter.name,
			model,
			error: {
				message: err.message,
				name: err.name
			},
			duration: elapsedMs,
			timestamp: Date.now(),
			...rest.modelOptions !== void 0 && { modelOptions: rest.modelOptions }
		});
		if (isActivityAbortError(error, abortControls.signal)) await runGenerationAbort(middleware, mwCtx, {
			reason: abortReasonMessage(error, abortControls.signal),
			duration: elapsedMs
		});
		else await runGenerationError(middleware, mwCtx, {
			error,
			duration: elapsedMs
		});
		logger.errors("generateLiveVideo activity failed", {
			error,
			source: "generateLiveVideo"
		});
		throw error;
	}
}
/**
* Create typed options for the generateLiveVideo() function without executing.
*/
function createLiveVideoOptions(options) {
	return options;
}
//#endregion
export { createLiveVideoOptions, generateLiveVideo, kind };

//# sourceMappingURL=index.js.map