import { summarize } from "../../summarize/index.js";
import { generateImage } from "../../generateImage/index.js";
import { generateVideo } from "../../generateVideo/index.js";
import { generateAudio } from "../../generateAudio/index.js";
import { generateSpeech } from "../../generateSpeech/index.js";
import { generateVoice } from "../../generateVoice/index.js";
import { generateTranscription } from "../../generateTranscription/index.js";
import { generateWorld } from "../../generateWorld/index.js";
import { generateLiveVideo } from "../../generateLiveVideo/index.js";
import { embed } from "../../embed/index.js";
import { rerank } from "../../rerank/index.js";
import { decide } from "../../evaluate/index.js";
import { chat } from "../index.js";
//#region src/activities/chat/agents/bound.ts
function createBoundActivities(agentName, input, abortController, binding) {
	let calls = 0;
	const signal = abortController.signal;
	const chatMiddleware = binding?.chatMiddleware ?? [];
	const generationMiddleware = binding?.generationMiddleware ?? [];
	const ids = (activity) => {
		calls += 1;
		return {
			threadId: input.threadId,
			runId: `${input.runId}:${activity}-${calls}`
		};
	};
	const withGenerationMiddleware = (options) => ({
		...options,
		middleware: [...generationMiddleware, ...options.middleware ?? []]
	});
	const full = (activity, options) => withGenerationMiddleware({
		...ids(activity),
		abortSignal: signal,
		...options
	});
	return {
		chat: ((options) => chat({
			messages: input.messages,
			threadId: input.threadId,
			runId: input.runId,
			parentRunId: input.parentRunId,
			subagentRunId: input.subagentRunId,
			subagentName: agentName,
			parentSubagentRunId: input.parentSubagentRunId,
			...input.resume ? { resume: input.resume } : {},
			...binding?.promptCache ? { promptCache: binding.promptCache } : {},
			abortController,
			...options,
			...options.subagents ? { subagents: {
				...options.subagents,
				binding: {
					...binding?.keys ? { keys: binding.keys } : {},
					...options.subagents.binding,
					chatMiddleware: [...chatMiddleware, ...options.subagents.binding?.chatMiddleware ?? []],
					generationMiddleware: [...generationMiddleware, ...options.subagents.binding?.generationMiddleware ?? []],
					...binding?.budget ? { budget: binding.budget } : {}
				}
			} } : {},
			middleware: [...chatMiddleware, ...options.middleware ?? []]
		})),
		summarize: ((options) => summarize(full("summarize", options))),
		generateImage: ((options) => generateImage(full("image", options))),
		generateVideo: ((options) => generateVideo(full("video", options))),
		generateAudio: ((options) => generateAudio(full("audio", options))),
		generateSpeech: ((options) => generateSpeech(full("speech", options))),
		generateVoice: ((options) => generateVoice(full("voice", options))),
		generateTranscription: ((options) => generateTranscription(full("transcription", options))),
		generateWorld: ((options) => generateWorld(full("world", options))),
		generateLiveVideo: ((options) => generateLiveVideo(full("liveVideo", options))),
		embed: ((options) => embed(withGenerationMiddleware(options))),
		rerank: ((options) => rerank(withGenerationMiddleware({
			abortSignal: signal,
			...options
		}))),
		decide: ((options) => decide(withGenerationMiddleware({
			abortSignal: signal,
			...options
		})))
	};
}
//#endregion
export { createBoundActivities };

//# sourceMappingURL=bound.js.map