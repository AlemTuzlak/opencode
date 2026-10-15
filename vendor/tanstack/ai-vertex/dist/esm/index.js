import { VertexAuthError } from "./errors.js";
import { resolveVertexGeminiOptions } from "./auth.js";
import { ChatStreamSummarizeAdapter } from "@tanstack/ai/adapters";
import { GeminiAudioAdapter, GeminiEmbeddingAdapter, GeminiImageAdapter, GeminiTTSAdapter, GeminiTextAdapter, GeminiVideoAdapter } from "@tanstack/ai-gemini";
//#region src/index.ts
function createVertex(config = {}) {
	const resolved = resolveVertexGeminiOptions(config);
	return {
		text(model) {
			return new GeminiTextAdapter(resolved, model);
		},
		summarize(model) {
			return new ChatStreamSummarizeAdapter(new GeminiTextAdapter(resolved, model), model, "gemini");
		},
		image(model) {
			return new GeminiImageAdapter(resolved, model);
		},
		embedding(model) {
			return new GeminiEmbeddingAdapter(resolved, model);
		},
		speech(model) {
			return new GeminiTTSAdapter(resolved, model);
		},
		audio(model) {
			return new GeminiAudioAdapter(resolved, model);
		},
		video(model, videoConfig) {
			return new GeminiVideoAdapter({
				...resolved,
				allowUrlFetch: videoConfig?.allowUrlFetch
			}, model);
		}
	};
}
function vertexText(model, config = {}) {
	return createVertex(config).text(model);
}
function vertexSummarize(model, config = {}) {
	return createVertex(config).summarize(model);
}
function vertexImage(model, config = {}) {
	return createVertex(config).image(model);
}
function vertexEmbedding(model, config = {}) {
	return createVertex(config).embedding(model);
}
function vertexSpeech(model, config = {}) {
	return createVertex(config).speech(model);
}
function vertexAudio(model, config = {}) {
	return createVertex(config).audio(model);
}
function vertexVideo(model, config = {}) {
	const { allowUrlFetch, ...client } = config;
	return createVertex(client).video(model, { allowUrlFetch });
}
//#endregion
export { VertexAuthError, resolveVertexGeminiOptions, vertexAudio, vertexEmbedding, vertexImage, vertexSpeech, vertexSummarize, vertexText, vertexVideo };

//# sourceMappingURL=index.js.map