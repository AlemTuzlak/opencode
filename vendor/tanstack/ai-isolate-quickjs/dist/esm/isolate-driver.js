import { QuickJSIsolateContext } from "./isolate-context.js";
import { RELEASE_SYNC, getQuickJS, newQuickJSWASMModule, newVariant } from "quickjs-emscripten";
//#region src/isolate-driver.ts
/** Default memory limit in MB (matches Node isolate driver default). */
var DEFAULT_MEMORY_LIMIT_MB = 128;
/** Default max stack size in bytes for QuickJS runtime. */
var DEFAULT_MAX_STACK_SIZE_BYTES = 524288;
/**
* Run a tool binding against JSON-encoded args. Never rejects: errors are
* encoded into the JSON envelope so the guest-side wrapper can rethrow them.
*/
async function invokeBinding(binding, argsJson) {
	try {
		const args = JSON.parse(argsJson);
		const result = await binding.execute(args);
		return JSON.stringify({
			success: true,
			value: result
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		return JSON.stringify({
			success: false,
			error: errorMessage
		});
	}
}
/**
* Inject a tool binding as a host function that returns a QuickJS promise
* resolved from the host side.
*
* Deliberately avoids `newAsyncifiedFunction`: repeated asyncify suspensions
* corrupt QuickJS refcounts and abort the WASM module
* (https://github.com/justjake/quickjs-emscripten/issues/258). The promise
* bridge never suspends the WASM stack, so that bug cannot trigger.
*/
function injectBinding(vm, name, binding, logs, execState) {
	const toolFn = vm.newFunction(name, (argsHandle) => {
		const argsJson = vm.getString(argsHandle);
		const promise = vm.newPromise();
		const resolveWithPayload = (payloadJson) => {
			execState.pendingCancels.delete(cancel);
			if (!vm.alive || !promise.alive) return;
			const payloadHandle = vm.newString(payloadJson);
			promise.resolve(payloadHandle);
			payloadHandle.dispose();
		};
		const cancel = () => resolveWithPayload(JSON.stringify({
			success: false,
			error: "Execution timed out"
		}));
		execState.pendingCancels.add(cancel);
		invokeBinding(binding, argsJson).then(resolveWithPayload);
		promise.settled.then(() => {
			try {
				if (vm.runtime.alive) {
					const jobs = vm.runtime.executePendingJobs();
					if (jobs.error) {
						logs.push(`ERROR: uncaught error in sandboxed code: ${JSON.stringify(vm.dump(jobs.error))}`);
						jobs.error.dispose();
					}
				}
			} finally {
				promise.dispose();
			}
		});
		return promise.handle;
	});
	vm.setProp(vm.global, `__${name}_impl`, toolFn);
	toolFn.dispose();
	const wrapperCode = `
    async function ${name}(input) {
      const resultJson = await __${name}_impl(JSON.stringify(input));
      const result = JSON.parse(resultJson);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result.value;
    }
  `;
	const wrapperResult = vm.evalCode(wrapperCode);
	if (wrapperResult.error) {
		const errorStr = vm.dump(wrapperResult.error);
		wrapperResult.error.dispose();
		throw new Error(`Failed to create wrapper for ${name}: ${errorStr}`);
	}
	wrapperResult.value.dispose();
}
/**
* Create a QuickJS WASM isolate driver
*
* This driver uses QuickJS compiled to WebAssembly via Emscripten.
* It provides a sandboxed JavaScript environment that runs anywhere
* (Node.js, browser, edge) without native dependencies.
*
* Tools are injected as async functions that bridge back to the host.
*
* @example
* ```typescript
* import { createQuickJSIsolateDriver } from '@tanstack/ai-isolate-quickjs'
*
* const driver = createQuickJSIsolateDriver({
*   timeout: 30000,
* })
*
* const context = await driver.createContext({
*   bindings: {
*     readFile: {
*       name: 'readFile',
*       description: 'Read a file',
*       inputSchema: { type: 'object', properties: { path: { type: 'string' } } },
*       execute: async ({ path }) => fs.readFile(path, 'utf-8'),
*     },
*   },
* })
*
* const result = await context.execute(`
*   const content = await readFile({ path: './data.json' })
*   return JSON.parse(content)
* `)
* ```
*/
function createQuickJSIsolateDriver(config = {}) {
	const defaultTimeout = config.timeout ?? 3e4;
	const defaultMemoryLimit = config.memoryLimit ?? DEFAULT_MEMORY_LIMIT_MB;
	const defaultMaxStackSize = config.maxStackSize ?? DEFAULT_MAX_STACK_SIZE_BYTES;
	let customQuickJSModule;
	const loadQuickJS = () => {
		if (config.wasmLocation === void 0) return getQuickJS();
		customQuickJSModule ??= newQuickJSWASMModule(newVariant(RELEASE_SYNC, { wasmLocation: config.wasmLocation }));
		return customQuickJSModule;
	};
	return { async createContext(isolateConfig) {
		const timeout = isolateConfig.timeout ?? defaultTimeout;
		const memoryLimitMb = isolateConfig.memoryLimit ?? defaultMemoryLimit;
		const maxStackSizeBytes = defaultMaxStackSize;
		const vm = (await loadQuickJS()).newContext();
		vm.runtime.setMemoryLimit(memoryLimitMb * 1024 * 1024);
		vm.runtime.setMaxStackSize(maxStackSizeBytes);
		const logs = [];
		const consoleObj = vm.newObject();
		const createConsoleMethod = (prefix) => {
			return vm.newFunction(`console.${prefix}`, (...args) => {
				const parts = args.map((arg) => {
					return vm.getString(arg);
				});
				const msg = prefix ? `${prefix}: ${parts.join(" ")}` : parts.join(" ");
				logs.push(msg);
			});
		};
		const logFn = createConsoleMethod("");
		const errorFn = createConsoleMethod("ERROR");
		const warnFn = createConsoleMethod("WARN");
		const infoFn = createConsoleMethod("INFO");
		vm.setProp(consoleObj, "log", logFn);
		vm.setProp(consoleObj, "error", errorFn);
		vm.setProp(consoleObj, "warn", warnFn);
		vm.setProp(consoleObj, "info", infoFn);
		vm.setProp(vm.global, "console", consoleObj);
		logFn.dispose();
		errorFn.dispose();
		warnFn.dispose();
		infoFn.dispose();
		consoleObj.dispose();
		const execState = {
			deadline: 0,
			pendingCancels: /* @__PURE__ */ new Set()
		};
		for (const [name, binding] of Object.entries(isolateConfig.bindings)) injectBinding(vm, name, binding, logs, execState);
		vm.runtime.setInterruptHandler(() => Date.now() > execState.deadline);
		return new QuickJSIsolateContext(vm, logs, timeout, execState);
	} };
}
//#endregion
export { createQuickJSIsolateDriver };

//# sourceMappingURL=isolate-driver.js.map