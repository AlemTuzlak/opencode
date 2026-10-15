import { convertToolsToProviderFormat } from "../tools/tool-converter.js";
import "../tools/index.js";
import { AzureOpenAI } from "openai";
import { OpenAIBaseResponsesTextAdapter } from "@tanstack/openai-base";
//#region src/adapters/azure-text.ts
function normalizeAzureBaseURL(baseURL) {
	const url = new URL(baseURL.trim().replace(/\/+$/, ""));
	const azureHost = [
		".openai.azure.com",
		".cognitiveservices.azure.com",
		".ai.azure.com"
	].some((suffix) => url.hostname.endsWith(suffix));
	const path = url.pathname.replace(/\/+$/, "");
	if (azureHost && [
		"",
		"/",
		"/openai",
		"/openai/v1/responses"
	].includes(path)) {
		url.pathname = "/openai/v1";
		url.search = "";
	}
	return url.toString().replace(/\/+$/, "");
}
var AzureOpenAITextAdapter = class extends OpenAIBaseResponsesTextAdapter {
	api = "azure-openai-responses";
	deploymentName;
	configReasoning;
	azureOptions;
	constructor(config, model) {
		const { apiKey, baseURL, resourceName, apiVersion, deploymentName, deploymentNameMap, reasoning, ...clientOptions } = config;
		const env = typeof process === "undefined" ? {} : process.env;
		const explicitResource = resourceName?.trim();
		const resource = explicitResource || env.AZURE_OPENAI_RESOURCE_NAME?.trim();
		const selectedURL = baseURL?.trim() || (explicitResource ? "https://" + explicitResource + ".openai.azure.com/openai/v1" : env.AZURE_OPENAI_BASE_URL?.trim()) || (resource ? "https://" + resource + ".openai.azure.com/openai/v1" : void 0);
		if (!selectedURL) throw new Error("Azure OpenAI needs baseURL or resourceName");
		const azureOptions = {
			...clientOptions,
			apiKey: apiKey ?? env.AZURE_OPENAI_API_KEY,
			baseURL: normalizeAzureBaseURL(selectedURL),
			apiVersion: apiVersion || env.AZURE_OPENAI_API_VERSION || "v1"
		};
		super(model, "azure-openai-responses", new AzureOpenAI(azureOptions), config);
		this.azureOptions = azureOptions;
		this.configReasoning = reasoning;
		const envMap = /* @__PURE__ */ new Map();
		for (const entry of (env.AZURE_OPENAI_DEPLOYMENT_NAME_MAP ?? "").split(",")) {
			const [logical, deployment] = entry.split("=", 2).map((value) => value.trim());
			if (logical && deployment) envMap.set(logical, deployment);
		}
		this.deploymentName = deploymentName || (deploymentNameMap ? Object.hasOwn(deploymentNameMap, model) ? deploymentNameMap[model] : void 0 : envMap.get(model)) || model;
	}
	withFetch(fetch) {
		return new AzureOpenAI({
			...this.azureOptions,
			fetch
		});
	}
	modelReasoning(_model) {
		return this.configReasoning;
	}
	convertTools(tools) {
		return convertToolsToProviderFormat(tools);
	}
	mapOptionsToRequest(options) {
		return {
			...super.mapOptionsToRequest(options),
			model: this.deploymentName
		};
	}
};
function azureOpenaiText(model, config) {
	return new AzureOpenAITextAdapter(config ?? {}, model);
}
//#endregion
export { AzureOpenAITextAdapter, azureOpenaiText };

//# sourceMappingURL=azure-text.js.map