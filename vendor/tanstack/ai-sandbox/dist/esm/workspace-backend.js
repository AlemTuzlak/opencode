//#region src/workspace-backend.ts
/**
* A `WorkspaceBackend` over a live sandbox. With it, `workspaceTools()`
* reads and writes files and runs commands in the sandbox, not on this
* machine. You start the sandbox before, and you stop it after.
*
* - Paths are POSIX paths in the sandbox, like `/workspace/src/a.ts`.
* - `exec` gives exit code 124 when `timeoutMs` stops a command, and 1 when
*   `signal` stops it. A sandbox with `capabilities.killableProcesses` off
*   cannot stop the command, so it continues in the sandbox.
* - `spawn` is there only when the sandbox has
*   `capabilities.backgroundProcesses`.
* - `stat` gives `mtimeMs: 0`. The sandbox file system does not give the
*   time of the last change.
* - There is no `realpath`, so the tools do not check where links go.
*
* @param handle - The sandbox, from `provider.create()` or `provider.resume()`.
*
* @example
* ```ts
* const handle = await localProcessSandbox().create({})
* workspaceTools({
*   root: '/workspace',
*   backend: sandboxWorkspaceBackend(handle),
* })
* ```
*/
function sandboxWorkspaceBackend(handle) {
	const { fs } = handle;
	const follow = async (path) => {
		if (!await fs.exists(path)) return void 0;
		const bytes = await fs.readBytes(path).catch(() => void 0);
		if (!bytes) return {
			type: "dir",
			size: 0,
			mtimeMs: 0
		};
		return {
			type: "file",
			size: bytes.byteLength,
			mtimeMs: 0
		};
	};
	const stat = async (path) => {
		if (!fs.lstat) return follow(path);
		const info = await fs.lstat(path);
		if (!info) return void 0;
		switch (info.type) {
			case "file": return {
				type: "file",
				size: info.size,
				mtimeMs: 0
			};
			case "dir": return {
				type: "dir",
				size: 0,
				mtimeMs: 0
			};
			case "other": return {
				type: "file",
				size: 0,
				mtimeMs: 0
			};
			case "symlink": return follow(path);
		}
	};
	const spawn = (command, options) => {
		let output = "";
		const collect = async (stream) => {
			for await (const chunk of stream) output += chunk;
		};
		const started = handle.process.spawn(command, options);
		const exited = started.then(async (job) => {
			const [exitCode] = await Promise.all([
				job.wait(),
				collect(job.stdout),
				collect(job.stderr)
			]);
			return { exitCode };
		}).catch((error) => {
			output += String(error);
			return { exitCode: 1 };
		});
		return {
			wait: () => exited,
			kill: () => {
				started.then((job) => job.kill()).catch(() => void 0);
			},
			output: () => output
		};
	};
	return {
		shell: "sh",
		readFile: (path) => fs.readBytes(path),
		writeFile: (path, data) => fs.write(path, data),
		remove: async (path) => {
			if (!((await stat(path))?.type === "file")) throw new Error(`Cannot remove ${path}: no such file.`);
			await fs.remove(path);
		},
		stat,
		readdir: async (path) => {
			const entries = await fs.list(path);
			const { lstat } = fs;
			return Promise.all(entries.map(async (entry) => {
				const type = lstat !== void 0 && (await lstat(entry.path))?.type === "symlink" ? "link" : entry.type;
				return {
					name: entry.name,
					type
				};
			}));
		},
		exec: (command, options = {}) => {
			const { cwd, env, timeoutMs, signal } = options;
			const controller = new AbortController();
			let stop = (_exitCode) => {};
			const stopped = new Promise((resolve) => {
				stop = (exitCode) => {
					resolve({
						exitCode,
						stdout: "",
						stderr: ""
					});
					controller.abort();
				};
			});
			const timer = timeoutMs ? setTimeout(() => stop(124), timeoutMs) : void 0;
			const onAbort = () => stop(1);
			signal?.addEventListener("abort", onAbort);
			if (signal?.aborted) onAbort();
			const run = handle.process.exec(command, {
				cwd,
				env,
				signal: controller.signal
			});
			return Promise.race([stopped, run]).finally(() => {
				clearTimeout(timer);
				signal?.removeEventListener("abort", onAbort);
			});
		},
		...handle.capabilities.backgroundProcesses ? { spawn } : {}
	};
}
//#endregion
export { sandboxWorkspaceBackend };

//# sourceMappingURL=workspace-backend.js.map