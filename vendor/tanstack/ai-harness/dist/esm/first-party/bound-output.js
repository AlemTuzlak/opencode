import { isRecord } from "../utils.js";
import { definePlugin } from "../plugins.js";
import { normalizeToolResult } from "@tanstack/ai";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
//#region src/first-party/bound-output.ts
var HOUR = 36e5;
var DAY = 24 * HOUR;
/** Saved outputs start with this. The cleanup removes only these files. */
var SAVED_PREFIX = "tool-output-";
/** Core marks subagent tools with this global symbol. */
var SUBAGENT_TOOL = Symbol.for("tanstack.ai.subagentTool");
var encoder = new TextEncoder();
var decoder = new TextDecoder("utf-8", { ignoreBOM: true });
/** The number of lines in `text`. A final newline does not start a new line. */
function countLines(text) {
	return text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
}
/** True for a UTF-8 byte inside a character, not at its start. */
function isContinuationByte(byte) {
	return byte !== void 0 && (byte & 192) === 128;
}
/** The start of `text` inside both limits. `bytes` is `text` as UTF-8. */
function firstPart(text, bytes, limits) {
	let end = limits.maxBytes;
	while (isContinuationByte(bytes[end])) end--;
	const firstBytes = decoder.decode(bytes.subarray(0, end));
	const firstLines = text.split("\n", limits.maxLines).join("\n");
	return firstLines.length < firstBytes.length ? firstLines : firstBytes;
}
/** The end of `text` inside both limits. `bytes` is `text` as UTF-8. */
function lastPart(text, bytes, limits) {
	let start = Math.max(0, bytes.length - limits.maxBytes);
	while (isContinuationByte(bytes[start])) start++;
	const lastBytes = decoder.decode(bytes.subarray(start));
	const lines = text.split("\n");
	const finalNewline = text.endsWith("\n") ? 1 : 0;
	const from = Math.max(0, lines.length - limits.maxLines - finalNewline);
	const lastLines = lines.slice(from).join("\n");
	return lastLines.length < lastBytes.length ? lastLines : lastBytes;
}
/**
* Keep the part of `text` that fits in `maxLines` lines and `maxBytes` UTF-8
* bytes: the first lines (`keep: 'head'`, the default) or the last lines
* (`keep: 'tail'`). When something is cut, `truncated` is `true` and a note
* tells how much is shown: after the text for `head`, before it for `tail`.
* A cut never splits a character. Text inside both limits comes back
* unchanged.
*
* @example
* ```ts
* const { text, truncated } = boundText(output, {
*   maxLines: 2000,
*   maxBytes: 50 * 1024,
*   keep: 'tail',
* })
* ```
*/
function boundText(text, limits) {
	const lines = countLines(text);
	const bytes = encoder.encode(text);
	if (!(lines > limits.maxLines || bytes.length > limits.maxBytes)) return {
		text,
		truncated: false
	};
	const isTail = limits.keep === "tail";
	const kept = isTail ? lastPart(text, bytes, limits) : firstPart(text, bytes, limits);
	const shown = `${countLines(kept)} of ${lines} lines, ${encoder.encode(kept).length} of ${bytes.length} bytes`;
	return isTail ? {
		text: `[Output cut. Showing the last ${shown}.]\n\n${kept}`,
		truncated: true
	} : {
		text: `${kept}\n\n[Output cut. Showing the first ${shown}.]`,
		truncated: true
	};
}
/**
* The time a saved output was written, from its file name, so no stat call
* is needed. `NaN` for a file this plugin did not save.
*/
function savedAt(name) {
	if (!name.startsWith(SAVED_PREFIX)) return NaN;
	return Number(name.slice(12).split("-")[0]);
}
/** Remove the saved outputs in `dir` that are older than `maxAgeMs`. */
async function removeOldOutputs(dir, maxAgeMs) {
	const cutoff = Date.now() - maxAgeMs;
	const old = (await readdir(dir)).filter((name) => savedAt(name) < cutoff);
	await Promise.all(old.map((name) => rm(join(dir, name), { force: true })));
}
/**
* Save the full output of one tool call in `dir`. Gives back the note for
* the model: the file path, or why the save failed.
*/
async function saveFullOutput(dir, toolCallId, text) {
	const safeId = toolCallId.replace(/[^\w-]/g, "_");
	const path = join(dir, `${SAVED_PREFIX}${Date.now()}-${safeId}.txt`);
	try {
		await mkdir(dir, { recursive: true });
		await writeFile(path, text);
		return `[Full output saved to ${path}.]`;
	} catch (error) {
		return `[The full output was not saved: ${String(error)}]`;
	}
}
/**
* The result the model sees now. A failed call shows `{ error: message }`,
* unless an earlier middleware replaced it. `undefined` when there is
* nothing to cut.
*/
function currentResult(info) {
	if (info.ok || info.result !== void 0) return info.result;
	if (info.tool !== void 0 && SUBAGENT_TOOL in info.tool || !(info.error instanceof Error)) return void 0;
	return { error: info.error.message };
}
/**
* The long part of a result, and a function that puts the cut text back.
* An error result keeps its other fields. A subagent result keeps its
* `subagentRunId`, so the model can still continue the child.
*/
function longPart(result, ok) {
	if (isRecord(result)) {
		if (!ok && "error" in result) return {
			long: result.error,
			put: (cut) => ({
				...result,
				error: cut
			})
		};
		if (typeof result.subagentRunId === "string" && "result" in result) return {
			long: result.result,
			put: (cut) => ({
				...result,
				result: cut
			})
		};
	}
	return {
		long: result,
		put: (cut) => cut
	};
}
/**
* Keep every tool result small enough for the model. A result over
* `maxLines` lines (default 2000) or `maxBytes` UTF-8 bytes (default 50 KiB)
* is cut to its first lines, with a note.
*
* - A string result is cut as is. Any other value is cut as JSON text.
* - A failed call has its error text cut. It stays an error.
* - A subagent result has the child's answer cut. Its `subagentRunId` stays.
* - Content parts (images, audio, and so on) are not changed.
*
* It runs for every tool, MCP tools too, in the lead turn and in every agent
* run. With `dir`, the full output is saved to a file in `dir` and the note
* gives its path. Saved files older than `retentionDays` (default 7) are
* removed, at most once an hour. Node only.
*
* @example
* ```ts
* defineHarness({
*   name: 'acme/coder',
*   adapter,
*   plugins: () => [boundToolOutput({ dir: '.agent/tool-output' })],
* })
* ```
*/
function boundToolOutput(options = {}) {
	const { maxLines = 2e3, maxBytes = 51200, dir, retentionDays = 7 } = options;
	return definePlugin({
		name: "tanstack/bound-tool-output",
		setup: () => {
			let lastCleanup = 0;
			const cleanUp = async (folder) => {
				const now = Date.now();
				if (now - lastCleanup < HOUR) return;
				lastCleanup = now;
				await removeOldOutputs(folder, retentionDays * DAY).catch(() => {});
			};
			const bound = {
				name: "tanstack/bound-tool-output",
				onAfterToolCall: async (_ctx, info) => {
					const result = currentResult(info);
					if (result === void 0) return;
					const { long, put } = longPart(result, info.ok);
					const full = normalizeToolResult(long);
					if (typeof full !== "string") return;
					const bounded = boundText(full, {
						maxLines,
						maxBytes
					});
					if (!bounded.truncated) return;
					if (dir === void 0) return {
						type: "replaceResult",
						result: put(bounded.text)
					};
					const saved = await saveFullOutput(dir, info.toolCallId, full);
					await cleanUp(dir);
					return {
						type: "replaceResult",
						result: put(`${bounded.text}\n${saved}`)
					};
				}
			};
			return {
				middleware: [bound],
				agentMiddleware: [bound]
			};
		}
	});
}
//#endregion
export { boundText, boundToolOutput };

//# sourceMappingURL=bound-output.js.map