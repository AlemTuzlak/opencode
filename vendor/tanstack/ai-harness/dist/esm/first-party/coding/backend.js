import { isRecord } from "../../utils.js";
import * as fs from "node:fs/promises";
import * as nodePath from "node:path";
import * as childProcess from "node:child_process";
//#region src/first-party/coding/backend.ts
/**
* The path functions for the paths of `backend`: POSIX for a `'sh'`
* backend, Windows for a `'cmd'` backend. Without `shell`, the functions of
* this machine.
*/
function pathsOf(backend) {
	switch (backend.shell) {
		case "sh": return nodePath.posix;
		case "cmd": return nodePath.win32;
		case void 0: return nodePath;
	}
}
/**
* The environment of a command: the environment of this process, plus
* `env`. Without `env` off Windows: `undefined`, so the command gets the
* environment of this process. On Windows it sets
* `NoDefaultCurrentDirectoryInExePath`. Then `cmd.exe` takes a program
* name like `rg` from the PATH only, and not from the current folder, where
* a cloned repo can put an `rg.cmd`.
*/
function commandEnv(env, platform) {
	if (platform !== "win32") return env && {
		...process.env,
		...env
	};
	return {
		...process.env,
		...env,
		NoDefaultCurrentDirectoryInExePath: "1"
	};
}
/** True for the error of a path that is not there. */
var isMissing = (error) => error instanceof Error && "code" in error && error.code === "ENOENT";
/** `exec` stops a command that writes more than 10 MiB of output. */
var MAX_EXEC_OUTPUT = 10485760;
/**
* Start `command` in the system shell. `kill` stops the shell and every
* command it started: on Windows, a killed `cmd.exe` leaves its commands
* running.
*/
function startShell(command, options) {
	const isWindows = process.platform === "win32";
	const child = childProcess.spawn(command, {
		cwd: options.cwd,
		env: commandEnv(options.env, process.platform),
		shell: true,
		detached: !isWindows
	});
	const kill = () => {
		if (child.pid === void 0) return;
		if (isWindows) {
			const system = nodePath.join(process.env.SystemRoot ?? "C:\\Windows", "System32");
			childProcess.execFile(nodePath.join(system, "taskkill.exe"), [
				"/pid",
				String(child.pid),
				"/T",
				"/F"
			], () => void 0);
			return;
		}
		try {
			process.kill(-child.pid, "SIGTERM");
		} catch {}
	};
	return {
		child,
		kill
	};
}
/**
* The workspace on this machine, with `node:fs` and `node:child_process`.
* Commands run in the system shell. `exec` gives exit code 124, like GNU
* `timeout`, when the timeout stops a command or the output is over 10 MiB.
* It gives 1 when the signal stops a command, or the command did not
* start. A stopped command is stopped with every command it started.
*/
var hostBackend = {
	shell: process.platform === "win32" ? "cmd" : "sh",
	readFile: (path) => fs.readFile(path),
	writeFile: async (path, data) => {
		await fs.mkdir(nodePath.dirname(path), { recursive: true });
		await fs.writeFile(path, data);
	},
	remove: (path) => fs.rm(path),
	stat: async (path) => {
		const info = await fs.stat(path).catch((error) => {
			if (isMissing(error)) return void 0;
			throw error;
		});
		if (!info) return void 0;
		return {
			type: info.isDirectory() ? "dir" : "file",
			size: info.size,
			mtimeMs: info.mtimeMs
		};
	},
	realpath: async (path) => {
		try {
			return await fs.realpath(path);
		} catch (error) {
			const isThere = await fs.lstat(path).then(() => true, () => false);
			if (isMissing(error) && !isThere) return void 0;
			throw error;
		}
	},
	readdir: async (path) => {
		return (await fs.readdir(path, { withFileTypes: true })).map((entry) => ({
			name: entry.name,
			type: entry.isSymbolicLink() ? "link" : entry.isDirectory() ? "dir" : "file"
		}));
	},
	exec: (command, options = {}) => new Promise((done) => {
		const { child, kill } = startShell(command, options);
		const stdout = [];
		const stderr = [];
		let size = 0;
		let stoppedWith;
		const stop = (exitCode) => {
			stoppedWith ??= exitCode;
			kill();
		};
		const collect = (chunks) => (chunk) => {
			chunks.push(chunk);
			size += chunk.length;
			if (size > MAX_EXEC_OUTPUT) stop(124);
		};
		child.stdout.on("data", collect(stdout));
		child.stderr.on("data", collect(stderr));
		const timer = options.timeoutMs ? setTimeout(() => stop(124), options.timeoutMs) : void 0;
		const onAbort = () => stop(1);
		options.signal?.addEventListener("abort", onAbort);
		if (options.signal?.aborted) onAbort();
		let startError = "";
		const finish = (code) => {
			clearTimeout(timer);
			options.signal?.removeEventListener("abort", onAbort);
			done({
				exitCode: stoppedWith ?? code ?? 1,
				stdout: Buffer.concat(stdout).toString(),
				stderr: Buffer.concat(stderr).toString() + startError
			});
		};
		child.on("close", finish);
		child.on("error", (error) => {
			startError = String(error);
			finish(1);
		});
	}),
	spawn: (command, options = {}) => {
		const { child, kill } = startShell(command, options);
		let output = "";
		const collect = (chunk) => {
			output += chunk.toString();
		};
		child.stdout.on("data", collect);
		child.stderr.on("data", collect);
		const exited = new Promise((done) => {
			child.on("close", (code) => done({ exitCode: code ?? 1 }));
			child.on("error", (error) => {
				output += String(error);
				done({ exitCode: 1 });
			});
		});
		return {
			wait: () => exited,
			kill,
			output: () => output
		};
	}
};
var MAX_OUTPUT = 2e4;
/** Cut text after 20,000 characters, and say how many were cut. */
function clip(text) {
	return text.length > MAX_OUTPUT ? `${text.slice(0, MAX_OUTPUT)}\n[${text.length - MAX_OUTPUT} more characters]` : text;
}
/** The string argument `key` of a tool call. Throws when it is not a string. */
function stringArg(args, key) {
	const value = optionalString(args, key);
	if (value !== void 0) return value;
	throw new Error(`Argument "${key}" must be a string.`);
}
/** The string argument `key` of a tool call, or `undefined`. */
function optionalString(args, key) {
	const value = isRecord(args) ? args[key] : void 0;
	return typeof value === "string" ? value : void 0;
}
var decoder = new TextDecoder("utf-8", { ignoreBOM: true });
/** The text of the file at `path`, as UTF-8. */
async function readText(backend, path) {
	return decoder.decode(await backend.readFile(path));
}
/**
* Run the `afterWrite` hooks for `path`, one after another. Resolves to the
* texts that the hooks return, for the tool result.
*/
async function afterWrite(env, path) {
	const notes = [];
	for (const hook of env.hooks()) {
		const note = await hook.afterWrite?.(path);
		if (note) notes.push(note);
	}
	return notes;
}
//#endregion
export { afterWrite, clip, commandEnv, hostBackend, optionalString, pathsOf, readText, stringArg };

//# sourceMappingURL=backend.js.map