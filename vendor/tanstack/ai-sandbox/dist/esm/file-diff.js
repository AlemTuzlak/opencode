//#region src/file-diff.ts
/** Path relative to the repo/workspace root, POSIX form. */
function relTo(root, path) {
	const prefix = root.endsWith("/") ? root : `${root}/`;
	return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}
/**
* POSIX single-quote escape for embedding a value in a shell command.
*/
function q(value) {
	return `'${value.replace(/'/g, `'\\''`)}'`;
}
/**
* Unified add-patch for a brand-new file, closely following the shape `git
* diff` produces for an added file (`diff --git` header + `new file mode` +
* `--- /dev/null` + `+++ b/<rel>`), so synthesized `create` diffs align with
* the real `git diff` output emitted for `change` events. `rel` must be the
* repo-root-relative POSIX path (like git's). Reproduces git's `\ No newline
* at end of file` marker and the header-only form for a zero-byte file, so a
* consumer applying the patch reconstructs the file byte-for-byte. It is not
* byte-identical to git — it omits the `index <hash>..<hash>` line and always
* writes the `+1,N` hunk count (git omits `,1`) — but both are valid
* unified-diff and accepted by `git apply`/`patch`.
*/
function synthesizeAddPatch(rel, content) {
	const header = `diff --git a/${rel} b/${rel}\nnew file mode 100644\n`;
	if (content === "") return header;
	const hasFinalNewline = content.endsWith("\n");
	const lines = content.replace(/\n$/, "").split("\n");
	const body = lines.map((l) => `+${l}`).join("\n");
	return header + `--- /dev/null\n+++ b/${rel}\n@@ -0,0 +1,${lines.length} @@\n` + body + (hasFinalNewline ? "\n" : "\n\\ No newline at end of file\n");
}
/**
* Wrap a raw {@link SandboxFileEvent} with lazy git-backed accessors bound to
* the live handle. `baseSha` is the session baseline (`''` when the workspace
* isn't a git repo). Never throws — every git/fs failure falls back to `''`
* (or a synthesized add-patch), but is logged first via `logger` so a failure
* is observable instead of silently becoming empty data.
*/
function buildFileHookEvent(handle, root, baseSha, event, logger) {
	const after = async () => {
		if (event.type === "delete") return "";
		try {
			return await handle.fs.read(event.path);
		} catch (error) {
			logger?.warn("sandbox after() failed to read file", {
				path: event.path,
				error
			});
			return "";
		}
	};
	const before = async () => {
		if (baseSha === "") return "";
		const rel = relTo(root, event.path);
		try {
			const res = await handle.process.exec(`git show ${q(baseSha)}:${q(rel)}`, { cwd: root });
			if (res.exitCode === 0) return res.stdout;
			logger?.sandbox("before() git show non-zero exit", {
				path: event.path,
				exitCode: res.exitCode,
				stderr: res.stderr
			});
			return "";
		} catch (error) {
			logger?.warn("sandbox before() git show failed", {
				path: event.path,
				error
			});
			return "";
		}
	};
	const synthesizeIfUntracked = async (rel) => {
		const content = await after();
		if (content === "") return "";
		try {
			const ignored = await handle.process.exec(`git check-ignore -q -- ${q(rel)}`, { cwd: root });
			if (ignored.exitCode === 0) {
				logger?.sandbox("sandbox diff() withheld for git-ignored file", { path: event.path });
				return "";
			}
			if (ignored.exitCode !== 1) logger?.warn("sandbox diff() git check-ignore non-zero exit", {
				path: event.path,
				exitCode: ignored.exitCode,
				stderr: ignored.stderr
			});
		} catch (error) {
			logger?.warn("sandbox diff() git check-ignore failed", {
				path: event.path,
				error
			});
		}
		try {
			const res = await handle.process.exec(`git show ${q(baseSha)}:${q(rel)}`, { cwd: root });
			if (res.exitCode === 0) return "";
			logger?.sandbox("sandbox diff() tracked-ness probe non-zero exit (treating as untracked)", {
				path: event.path,
				exitCode: res.exitCode,
				stderr: res.stderr
			});
			return synthesizeAddPatch(rel, content);
		} catch (error) {
			logger?.warn("sandbox diff() tracked-ness probe failed", {
				path: event.path,
				error
			});
			return "";
		}
	};
	const diff = async () => {
		if (baseSha === "") {
			if (event.type === "delete") return "";
			return synthesizeAddPatch(relTo(root, event.path), await after());
		}
		const rel = relTo(root, event.path);
		try {
			const res = await handle.process.exec(`git diff ${q(baseSha)} -- ${q(rel)}`, { cwd: root });
			if (res.exitCode !== 0) {
				logger?.warn("sandbox diff() git diff non-zero exit", {
					path: event.path,
					exitCode: res.exitCode,
					stderr: res.stderr
				});
				return "";
			}
			if (res.stdout !== "") return res.stdout;
			return synthesizeIfUntracked(rel);
		} catch (error) {
			logger?.warn("sandbox diff() git diff failed", {
				path: event.path,
				error
			});
			return "";
		}
	};
	return {
		...event,
		before,
		after,
		diff
	};
}
/** Normalize the `fileEvents` option (`boolean | { diff?: boolean }`). */
function resolveFileEvents(opt) {
	if (opt === false) return {
		enabled: false,
		diff: false
	};
	if (opt === void 0 || opt === true) return {
		enabled: true,
		diff: false
	};
	return {
		enabled: true,
		diff: opt.diff === true
	};
}
//#endregion
export { buildFileHookEvent, resolveFileEvents };

//# sourceMappingURL=file-diff.js.map