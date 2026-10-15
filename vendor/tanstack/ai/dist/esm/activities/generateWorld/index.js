import { resolveDebugOption } from "../../logger/resolve.js";
import { streamGenerationResult } from "../stream-generation-result.js";
import { applyGenerationResultTransforms, createGenerationContext, runGenerationAbort, runGenerationError, runGenerationFinish, runGenerationStart, runGenerationUsage } from "../middleware/run.js";
import { abortReasonMessage, createActivityAbortControls, isActivityAbortError, raceWithAbort } from "../../utilities/activity-abort.js";
import "./adapter.js";
import { aiEventClient } from "@tanstack/ai-event-client";
//#region src/activities/generateWorld/index.ts
/**
* World Activity (Experimental)
*
* Live adapters mint a session token for a prompt-steerable world. Job
* adapters start generation and return a viewer URL, or an operation id
* while the job is still running.
*
* @experimental World generation is an experimental feature and may change.
*/
/** The adapter kind this activity handles */
var kind = "world";
function createId(prefix) {
	return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
/**
* World generation activity. Live adapters mint a session token. Job
* adapters return a viewer URL or an in-progress operation id.
*
* @example Mint a session token on the server
* ```ts
* import { generateWorld } from '@tanstack/ai'
* import { reactorWorld } from '@tanstack/ai-reactor'
*
* const world = await generateWorld({
*   adapter: reactorWorld('visko-orbis-stable'),
*   prompt: 'A neon cyberpunk city at night, slow aerial drift',
* })
*
* // Hand world.token, world.model, and world.prompt to the browser.
* ```
*
* @experimental World generation is an experimental feature and may change.
*/
function generateWorld(options) {
	if (options.stream) return streamGenerationResult((resolved) => runGenerateWorld({
		...options,
		runId: resolved.runId
	}), options);
	return runGenerateWorld(options);
}
/**
* Run the core world generation logic (non-streaming).
*/
async function runGenerateWorld(options) {
	const { adapter, stream: _stream, debug: _debug, middleware, threadId, runId, timeout, abortSignal: callerAbortSignal, ...rest } = options;
	const model = adapter.model;
	const requestId = createId("world");
	const startTime = Date.now();
	const logger = resolveDebugOption(options.debug);
	const abortControls = createActivityAbortControls({
		timeout,
		abortSignal: callerAbortSignal
	});
	const providerName = adapter.provider ?? adapter.name ?? "unknown";
	const mwCtx = createGenerationContext({
		requestId,
		activity: "world",
		provider: adapter.name,
		model,
		modelOptions: rest.modelOptions,
		threadId,
		runId,
		artifactInputs: { prompt: rest.prompt },
		createId
	});
	await runGenerationStart(middleware, mwCtx);
	aiEventClient.emit("world:request:started", {
		requestId,
		provider: adapter.name,
		model,
		prompt: rest.prompt,
		timestamp: startTime,
		...rest.modelOptions !== void 0 && { modelOptions: rest.modelOptions }
	});
	logger.request(`activity=generateWorld provider=${providerName}`, {
		provider: providerName,
		model
	});
	try {
		const rawResult = await raceWithAbort(adapter.createWorld({
			...rest,
			model,
			logger,
			...abortControls.signal ? { abortSignal: abortControls.signal } : {}
		}), abortControls.signal);
		abortControls.clear();
		const result = await applyGenerationResultTransforms(mwCtx, rawResult);
		const elapsedMs = Date.now() - startTime;
		aiEventClient.emit("world:request:completed", {
			requestId,
			provider: adapter.name,
			model: result.model,
			prompt: result.prompt,
			status: result.status,
			duration: elapsedMs,
			timestamp: Date.now(),
			...rest.modelOptions !== void 0 && { modelOptions: rest.modelOptions }
		});
		if (result.usage) aiEventClient.emit("world:usage", {
			requestId,
			model: result.model,
			usage: result.usage,
			timestamp: Date.now(),
			...rest.modelOptions !== void 0 && { modelOptions: rest.modelOptions }
		});
		logger.output(`activity=generateWorld provider=${providerName}`, {
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
		aiEventClient.emit("world:request:error", {
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
		logger.errors("generateWorld activity failed", {
			error,
			source: "generateWorld"
		});
		throw error;
	}
}
/**
* Create typed options for the generateWorld() function without executing.
*/
function createWorldOptions(options) {
	return options;
}
//#endregion
export { createWorldOptions, generateWorld, kind };

//# sourceMappingURL=index.js.map