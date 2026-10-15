import { createEventAwareBindings, toolsToBindings } from "./bindings/tool-to-binding.js";
import { stripTypeScript } from "./strip-typescript.js";
import { warnIfBindingsExposeSecrets } from "./validate-bindings.js";
import { z } from "zod";
import { toolDefinition } from "@tanstack/ai";
//#region src/create-code-mode-tool.ts
/**
* Schema for the execute_typescript tool input
*/
var executeTypescriptInputSchema = z.object({ typescriptCode: z.string().describe("TypeScript code to execute in the sandbox. Use external_* functions to call available APIs. Return a value to pass results back.") });
/**
* Schema for the execute_typescript tool output
*/
var executeTypescriptOutputSchema = z.object({
	success: z.boolean().describe("Whether execution completed without errors"),
	result: z.unknown().optional().describe("Return value from the executed code"),
	logs: z.array(z.string()).optional().describe("Console output captured during execution"),
	error: z.object({
		message: z.string(),
		name: z.string().optional(),
		line: z.number().optional(),
		stack: z.string().optional()
	}).optional().describe("Error details if execution failed")
});
/**
* Create an execute_typescript tool that can be used alongside other agent tools.
*
* This tool allows an LLM to execute TypeScript code in a secure sandbox.
* Tools passed in the config become `external_*` functions available inside the sandbox.
*
* @example
* ```typescript
* import { createCodeMode } from '@tanstack/ai-code-mode'
* import { createNodeIsolateDriver } from '@tanstack/ai-isolate-node'
*
* const { tool, systemPrompt } = createCodeMode({
*   driver: createNodeIsolateDriver(),
*   tools: [weatherTool, dbTool],  // Become external_fetchWeather, external_dbQuery
*   timeout: 30000,
* })
*
* chat({
*   systemPrompts: [myPrompt, systemPrompt],
*   tools: [tool, searchTool, emailTool],
*   messages,
* })
* ```
*/
function createCodeModeTool(config) {
	const { driver, tools, timeout = 3e4, memoryLimit = 128, getSnippetBindings, onSecretParameter, transpile = stripTypeScript } = config;
	if (tools.length === 0) throw new Error("At least one tool must be provided to createCodeModeTool");
	const staticBindings = toolsToBindings(tools, "external_");
	const secretDedupCache = /* @__PURE__ */ new Set();
	warnIfBindingsExposeSecrets(Object.values(staticBindings), {
		handler: onSecretParameter,
		dedupCache: secretDedupCache
	});
	return toolDefinition({
		name: "execute_typescript",
		description: buildToolDescription(tools),
		inputSchema: executeTypescriptInputSchema,
		outputSchema: executeTypescriptOutputSchema
	}).server(async (input, toolContext) => {
		const { typescriptCode } = input;
		const startedAt = Date.now();
		const emitCustomEvent = toolContext?.emitCustomEvent || (() => {});
		const finish = (result, phase) => {
			const durationMs = Date.now() - startedAt;
			const payload = {
				timestamp: Date.now(),
				durationMs,
				phase,
				success: result.success,
				logCount: result.logs?.length ?? 0,
				error: result.error ? {
					name: result.error.name,
					message: result.error.message,
					...result.error.stack !== void 0 && { stack: result.error.stack },
					...result.error.line !== void 0 && { line: result.error.line }
				} : void 0
			};
			emitCustomEvent("code_mode:execution_finished", payload);
			if (!result.success) console.error("[code-mode] execute_typescript failed", payload);
			else if (typeof process !== "undefined" && process.env?.CODE_MODE_DEBUG === "1") console.info("[code-mode] execute_typescript ok", {
				durationMs,
				phase,
				logCount: payload.logCount
			});
			return result;
		};
		if (!typescriptCode || typeof typescriptCode !== "string") return finish({
			success: false,
			error: {
				message: "typescriptCode must be a non-empty string",
				name: "ValidationError"
			}
		}, "validate-input");
		let isolateContext = null;
		emitCustomEvent("code_mode:execution_started", {
			timestamp: Date.now(),
			codeLength: typescriptCode.length
		});
		try {
			let strippedCode;
			try {
				strippedCode = await transpile(typescriptCode);
			} catch (error) {
				return finish({
					success: false,
					error: {
						message: error instanceof Error ? error.message : String(error),
						name: "TypeScriptError",
						...error instanceof Error && error.stack !== void 0 && { stack: error.stack }
					}
				}, "transpile");
			}
			const snippetBindings = getSnippetBindings ? await getSnippetBindings() : {};
			const snippetBindingValues = Object.values(snippetBindings);
			if (snippetBindingValues.length > 0) warnIfBindingsExposeSecrets(snippetBindingValues, {
				handler: onSecretParameter,
				dedupCache: secretDedupCache
			});
			const allBindings = {
				...staticBindings,
				...snippetBindings
			};
			const eventAwareBindings = createEventAwareBindings(allBindings, emitCustomEvent, toolContext);
			try {
				isolateContext = await driver.createContext({
					bindings: eventAwareBindings,
					timeout,
					memoryLimit
				});
			} catch (error) {
				return finish({
					success: false,
					error: {
						message: error instanceof Error ? error.message : String(error),
						name: error instanceof Error ? error.name : "CreateContextError",
						...error instanceof Error && error.stack !== void 0 && { stack: error.stack }
					}
				}, "create-context");
			}
			const executionResult = await isolateContext.execute(strippedCode);
			if (executionResult.logs && executionResult.logs.length > 0) for (const log of executionResult.logs) {
				let level = "log";
				let message = log;
				if (log.startsWith("ERROR: ")) {
					level = "error";
					message = log.slice(7);
				} else if (log.startsWith("WARN: ")) {
					level = "warn";
					message = log.slice(6);
				} else if (log.startsWith("INFO: ")) {
					level = "info";
					message = log.slice(6);
				}
				emitCustomEvent("code_mode:console", {
					level,
					message,
					timestamp: Date.now()
				});
			}
			if (executionResult.success) return finish({
				success: true,
				result: executionResult.value,
				logs: executionResult.logs
			}, "execute");
			return finish({
				success: false,
				error: executionResult.error ? {
					message: executionResult.error.message,
					name: executionResult.error.name,
					...executionResult.error.stack !== void 0 && { stack: executionResult.error.stack }
				} : {
					message: "Unknown execution error",
					name: "UnknownError"
				},
				logs: executionResult.logs
			}, "execute");
		} catch (error) {
			return finish({
				success: false,
				error: {
					message: error instanceof Error ? error.message : String(error),
					name: error instanceof Error ? error.name : "Error",
					...error instanceof Error && error.stack !== void 0 && { stack: error.stack }
				}
			}, "unhandled");
		} finally {
			if (isolateContext) await isolateContext.dispose();
		}
	});
}
/**
* Build the tool description including available external functions
*/
function buildToolDescription(tools) {
	const eager = tools.filter((t) => !t.lazy);
	const hasLazy = tools.some((t) => t.lazy);
	return `Execute TypeScript code in a secure sandbox environment. The code can use these external API functions: ${eager.map((t) => `external_${t.name}`).join(", ")}.${hasLazy ? ` To get more functions, call the discover_tools tool before you run code here. discover_tools is a separate tool. It is not available inside this sandbox.` : ""} All external_* calls are async and must be awaited. Return a value to pass results back. Use console.log() for debugging.`;
}
//#endregion
export { createCodeModeTool };

//# sourceMappingURL=create-code-mode-tool.js.map