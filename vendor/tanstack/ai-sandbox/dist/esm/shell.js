//#region src/shell.ts
/**
* Parse the output of `export -p` (or `declare -x`) into a plain env map.
* Shared by the stdin shell's `forkState` and the exec-backed shell.
*/
function parseExports(output) {
	const env = {};
	for (const line of output.split("\n")) {
		const trimmed = line.trim();
		const match = /^(?:declare\s+-x\s+|export\s+)([A-Za-z_][A-Za-z0-9_]*)(?:="((?:[^"\\]|\\.)*)")?$/.exec(trimmed);
		if (match === null) continue;
		const key = match[1];
		if (key === void 0) continue;
		const raw = match[2];
		if (raw === void 0) continue;
		env[key] = raw.replace(/\\(.)/g, "$1");
	}
	return env;
}
/** Default {@link BootstrapShellOptions.commandTimeoutMs} — 30 minutes. */
var DEFAULT_COMMAND_TIMEOUT_MS = 18e5;
/** Race marker for the per-command deadline. A symbol cannot collide with a
*  literal stdout line (a line of text `'timeout'` would). */
var TIMED_OUT = Symbol("bootstrap-shell-timeout");
/**
* Spawn one `sh` process and return a {@link BootstrapShell} that drives it
* via the sentinel-echo protocol.
*
* Protocol: for each `run(cmd)` call, we write
*   `<cmd>; printf "\n__BSSH_<N>__ $?\n"` to stdin, then read stdout lines
* until we see a line matching `__BSSH_<N>__ <exitCode>`. Everything before
* that line is the command's stdout; the trailing integer is the exit code.
* The counter `N` is a module-level monotonic integer — no Date.now / random.
*/
async function createBootstrapShell(handle, opts = {}) {
	if (!handle.capabilities.writableStdin) return createExecBootstrapShell(handle, opts);
	const proc = await handle.process.spawn("sh", { cwd: opts.cwd });
	const lineBuffer = [];
	let pending = [];
	let streamDone = false;
	let streamError;
	/** Feed the stdout async-iterable into the shared line queue. */
	async function drainStdout() {
		let partial = "";
		try {
			for await (const chunk of proc.stdout) {
				partial += chunk;
				const parts = partial.split("\n");
				for (let i = 0; i < parts.length - 1; i++) {
					const line = parts[i];
					const resolver = pending.shift();
					if (resolver !== void 0) resolver(line);
					else lineBuffer.push(line);
				}
				partial = parts[parts.length - 1];
			}
			if (partial.length > 0) {
				const line = partial;
				const resolver = pending.shift();
				if (resolver !== void 0) resolver(line);
				else lineBuffer.push(line);
			}
		} catch (error) {
			streamError = error;
		} finally {
			streamDone = true;
			for (const resolver of pending) resolver(null);
			pending = [];
		}
	}
	const drainPromise = drainStdout();
	/** Read the next line from the shared queue, or `null` once stdout ended. */
	function nextLine() {
		const buffered = lineBuffer.shift();
		if (buffered !== void 0) return Promise.resolve(buffered);
		if (streamDone) return Promise.resolve(null);
		return new Promise((resolve) => {
			pending.push(resolve);
		});
	}
	let counter = 0;
	async function run(command) {
		const id = counter;
		counter += 1;
		const sentinel = `__BSSH_${id}__`;
		await proc.stdin.write(`{ ${command} ; } 2>&1; printf "\\n${sentinel} $?\\n"\n`);
		const outputLines = [];
		let timer;
		const deadline = new Promise((resolve) => {
			timer = setTimeout(() => resolve(TIMED_OUT), opts.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS);
		});
		try {
			for (;;) {
				const line = await Promise.race([nextLine(), deadline]);
				if (line === TIMED_OUT) throw new Error(`bootstrap shell: timed out after ${opts.commandTimeoutMs ?? DEFAULT_COMMAND_TIMEOUT_MS}ms waiting for the sentinel of command: ${command}`);
				if (line === null) throw new Error(`bootstrap shell: the shell exited before the sentinel was printed; command: ${command}`, streamError === void 0 ? void 0 : { cause: streamError });
				if (line.startsWith(`${sentinel} `)) {
					const codeStr = line.slice(sentinel.length + 1).trim();
					const exitCode = parseInt(codeStr, 10);
					return {
						exitCode: Number.isFinite(exitCode) ? exitCode : 1,
						stdout: outputLines.join("\n")
					};
				}
				outputLines.push(line);
			}
		} finally {
			clearTimeout(timer);
		}
	}
	async function forkState() {
		return {
			cwd: (await run("pwd")).stdout.trim(),
			env: parseExports((await run("export -p")).stdout)
		};
	}
	async function dispose() {
		await proc.stdin.end();
		await proc.kill();
		await drainPromise;
	}
	return {
		run,
		forkState,
		dispose
	};
}
/**
* Exec-backed {@link BootstrapShell} for providers WITHOUT a writable stdin.
*
* There is no persistent process to feed commands into, so persistence of `cd`
* and exported variables is reproduced by threading state across discrete
* {@link SandboxHandle.process.exec} calls: each `run()` executes the command in
* the tracked cwd+env, then captures the resulting `pwd` and `export -p` (via
* marker lines) so the NEXT command inherits any directory change or exports.
*/
function createExecBootstrapShell(handle, opts = {}) {
	let cwd = opts.cwd ?? "/";
	let env = {};
	let counter = 0;
	async function run(command) {
		const id = counter;
		counter += 1;
		const sentinel = `__BSSH_${id}__`;
		const script = [
			command,
			`__bssh_rc=$?`,
			`printf '\\n%s %s\\n' '${sentinel}' "$__bssh_rc"`,
			`printf '%s\\n' '${sentinel}_CWD'`,
			`pwd`,
			`printf '%s\\n' '${sentinel}_ENV'`,
			`export -p`
		].join("\n");
		const res = await handle.process.exec(script, {
			cwd,
			env
		});
		const cmdOut = [];
		const cwdLines = [];
		const envLines = [];
		let exitCode = res.exitCode;
		let phase = "cmd";
		for (const line of res.stdout.split("\n")) if (phase === "cmd") {
			if (line.startsWith(`${sentinel} `)) {
				const parsed = parseInt(line.slice(sentinel.length + 1).trim(), 10);
				exitCode = Number.isFinite(parsed) ? parsed : res.exitCode;
				phase = "await-cwd";
				continue;
			}
			cmdOut.push(line);
		} else if (phase === "await-cwd") {
			if (line === `${sentinel}_CWD`) phase = "cwd";
		} else if (phase === "cwd") {
			if (line === `${sentinel}_ENV`) phase = "env";
			else cwdLines.push(line);
		} else envLines.push(line);
		const newCwd = cwdLines.map((l) => l.trim()).filter(Boolean).pop();
		if (newCwd) cwd = newCwd;
		const newEnv = parseExports(envLines.join("\n"));
		if (Object.keys(newEnv).length > 0) env = newEnv;
		return {
			exitCode,
			stdout: cmdOut.join("\n")
		};
	}
	function forkState() {
		return Promise.resolve({
			cwd,
			env: { ...env }
		});
	}
	function dispose() {
		return Promise.resolve();
	}
	return {
		run,
		forkState,
		dispose
	};
}
//#endregion
export { createBootstrapShell, createExecBootstrapShell };

//# sourceMappingURL=shell.js.map