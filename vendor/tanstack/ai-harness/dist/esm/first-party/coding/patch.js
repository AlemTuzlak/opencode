import { afterWrite, readText, stringArg } from "./backend.js";
import { findMatches, toEndingsOf } from "./edit.js";
import { toolDefinition } from "@tanstack/ai";
//#region src/first-party/coding/patch.ts
var BOM = "﻿";
var DESCRIPTION = `Change files with a patch:

*** Begin Patch
*** Add File: src/new.ts
+each line of a new file starts with +
*** Update File: src/app.ts
@@ function main() {
 a context line starts with a space
-a removed line starts with -
+an added line starts with +
*** Delete File: src/old.ts
*** End Patch

In an update, each chunk starts with @@. The text after @@ is optional. It is a line above the change, to find the place. Give 3 context lines above and below each change, so the old lines are unique. Chunks apply in order. "*** Move to: <path>" right after "*** Update File:" renames the file. "*** End of File" after a chunk means that the chunk ends the file.`;
function lineError(index, message) {
	return /* @__PURE__ */ new Error(`Patch line ${index + 1}: ${message}`);
}
/** The path after a header. Throws when it is empty. */
function pathAt(index, rest = "") {
	const path = rest.trim();
	if (path === "") throw lineError(index, "the path is missing.");
	return path;
}
/** Throws when `operation` is an update with no lines and no move. */
function checkNotEmpty(operation, index) {
	if (operation?.type !== "update" || operation.movePath !== void 0) return;
	if (!operation.chunks.some((chunk) => chunk.oldLines.length + chunk.newLines.length > 0)) throw lineError(index, `"*** Update File: ${operation.path}" has no changes.`);
}
function newChunk(context) {
	return {
		context: context || void 0,
		oldLines: [],
		newLines: [],
		endOfFile: false
	};
}
var isFilled = (line) => line.trim() !== "";
/**
* Read a patch in the `*** Begin Patch` format into its file changes. Throws
* an error with the line number when the text does not follow the format.
*
* @example
* ```ts
* parsePatch('*** Begin Patch\n*** Delete File: old.txt\n*** End Patch')
* // [{ type: 'delete', path: 'old.txt' }]
* ```
*/
function parsePatch(text) {
	const lines = text.split(/\r?\n/);
	const first = Math.max(lines.findIndex(isFilled), 0);
	const last = lines.findLastIndex(isFilled);
	if (lines[first]?.trim() !== "*** Begin Patch") throw lineError(first, "the patch must start with \"*** Begin Patch\".");
	if (last === first || lines[last]?.trim() !== "*** End Patch") throw lineError(last, "the patch must end with \"*** End Patch\".");
	const operations = [];
	let current;
	let currentLine = first;
	let chunk;
	for (let index = first + 1; index < last; index++) {
		const line = lines[index] ?? "";
		const head = line.trimEnd();
		const header = /^\*\*\* (Add|Delete|Update) File:(.*)$/.exec(head);
		if (header) {
			checkNotEmpty(current, currentLine);
			const [, kind, rest] = header;
			const path = pathAt(index, rest);
			if (kind === "Add") current = {
				type: "add",
				path,
				content: ""
			};
			else if (kind === "Delete") current = {
				type: "delete",
				path
			};
			else current = {
				type: "update",
				path,
				chunks: []
			};
			operations.push(current);
			currentLine = index;
			chunk = void 0;
			continue;
		}
		const move = /^\*\*\* Move to:(.*)$/.exec(head);
		if (move) {
			if (current?.type !== "update" || current.chunks.length > 0 || current.movePath !== void 0) throw lineError(index, "\"*** Move to:\" must come right after \"*** Update File:\".");
			current.movePath = pathAt(index, move[1]);
			continue;
		}
		if (head === "*** End of File") {
			if (!chunk) throw lineError(index, "\"*** End of File\" must come after a chunk.");
			chunk.endOfFile = true;
			chunk = void 0;
			continue;
		}
		switch (current?.type) {
			case void 0:
			case "delete":
				if (head !== "") throw lineError(index, "expected \"*** Add File:\", \"*** Delete File:\", or \"*** Update File:\".");
				break;
			case "add":
				if (!line.startsWith("+")) throw lineError(index, "each line of an added file must start with \"+\".");
				current.content += `${line.slice(1)}\n`;
				break;
			case "update": {
				if (line.startsWith("@@")) {
					chunk = newChunk(line.slice(2).trim());
					current.chunks.push(chunk);
					break;
				}
				const sign = line.charAt(0) || " ";
				if (sign !== " " && sign !== "-" && sign !== "+") throw lineError(index, "each chunk line must start with \" \", \"-\", or \"+\".");
				if (!chunk) {
					chunk = newChunk("");
					current.chunks.push(chunk);
				}
				const body = line.slice(1);
				if (sign !== "+") chunk.oldLines.push(body);
				if (sign !== "-") chunk.newLines.push(body);
				break;
			}
		}
	}
	checkNotEmpty(current, currentLine);
	if (operations.length === 0) throw lineError(first, "the patch has no file changes.");
	return operations;
}
/**
* Every path that a patch changes, also the targets of `*** Move to:`, as
* the patch gives them. The permission rules check them. Throws when the
* patch does not parse.
*
* @example
* ```ts
* patchPaths(text) // ['src/a.ts', 'src/old.ts', 'src/new.ts']
* ```
*/
function patchPaths(text) {
	return parsePatch(text).flatMap((operation) => operation.type === "update" && operation.movePath !== void 0 ? [operation.path, operation.movePath] : [operation.path]);
}
/** The lines as text, each with a line ending. */
var asText = (lines) => lines.map((line) => `${line}\n`).join("");
/**
* `content` with `chunks` applied in order. A chunk is searched after the
* chunk before it, and from the line of its `@@` text. The old lines must be
* whole lines, and must be there once. Keeps a byte order mark, the line
* endings, and a missing line ending at the end. `name` is the file, for the
* errors.
*/
function applyChunks(content, chunks, name) {
	const hasBom = content.startsWith(BOM);
	const body = hasBom ? content.slice(1) : content;
	const eol = toEndingsOf("\n", body);
	const ended = body === "" || body.endsWith("\n");
	let text = ended ? body : body + eol;
	let from = 0;
	const entries = chunks.entries();
	for (const [index, chunk] of entries) {
		const label = `Chunk ${index + 1} of ${name}`;
		const newText = toEndingsOf(asText(chunk.newLines), text);
		let searchFrom = from;
		let below = text.length;
		if (chunk.context !== void 0) {
			const [found] = findMatches(text.slice(from), chunk.context);
			if (!found) throw new Error(`${label}: "@@ ${chunk.context}" is not in the file.`);
			searchFrom = text.lastIndexOf("\n", from + found.start - 1) + 1;
			below = text.indexOf("\n", from + found.end) + 1;
		}
		if (chunk.oldLines.length === 0) {
			const spot = chunk.endOfFile ? text.length : below;
			text = text.slice(0, spot) + newText + text.slice(spot);
			from = spot + newText.length;
			continue;
		}
		const oldText = toEndingsOf(asText(chunk.oldLines), text);
		const isWhole = (match) => {
			const startsLine = match.start === 0 || text[match.start - 1] === "\n";
			const endsRight = !chunk.endOfFile || match.end === text.length;
			return startsLine && endsRight;
		};
		const matches = findMatches(text.slice(searchFrom), oldText).map((match) => ({
			start: match.start + searchFrom,
			end: match.end + searchFrom
		})).filter(isWhole);
		const [match, ...others] = matches;
		if (!match) throw new Error(`${label}: the old lines are not in the file.`);
		if (others.length > 0) throw new Error(`${label}: the old lines appear ${matches.length} times. Add context lines.`);
		text = text.slice(0, match.start) + newText + text.slice(match.end);
		from = match.start + newText.length;
	}
	const result = ended ? text : text.replace(/\r?\n$/, "");
	return hasBom ? BOM + result : result;
}
/**
* Apply each step. Every file is read and checked first. The files are
* written and removed only when every operation fits. Then the `afterWrite`
* hooks run for the written files.
*/
async function applyAll(env, steps) {
	const { backend } = env;
	const planned = /* @__PURE__ */ new Map();
	const changes = [];
	for (const { operation, full, to } of steps) {
		const shown = env.shown(full);
		switch (operation.type) {
			case "add":
				planned.set(full, operation.content);
				changes.push(`added ${shown}`);
				break;
			case "delete":
				if (!backend.remove) throw new Error(`Cannot delete ${shown}: the workspace cannot remove files.`);
				if (planned.has(full)) throw new Error(`Cannot delete ${shown}: the patch changes it before.`);
				if (!((await backend.stat(full))?.type === "file")) throw new Error(`Cannot delete ${shown}: no such file.`);
				planned.set(full, null);
				changes.push(`deleted ${shown}`);
				break;
			case "update": {
				const isMove = to !== full;
				const toShown = env.shown(to);
				if (isMove) {
					if (!backend.remove) throw new Error(`Cannot move ${shown}: the workspace cannot remove files.`);
					if (planned.has(full)) throw new Error(`Cannot move ${shown}: the patch changes it before.`);
					if (!(planned.get(to) === null || !planned.has(to) && await backend.stat(to) === void 0)) throw new Error(`Cannot move ${shown} to ${toShown}: ${toShown} already exists.`);
				}
				const known = planned.get(full);
				if (known === null) throw new Error(`Cannot update ${shown}: the patch removes it before.`);
				const before = known ?? await readText(backend, full);
				planned.set(to, applyChunks(before, operation.chunks, shown));
				if (isMove) planned.set(full, null);
				changes.push(isMove ? `moved ${shown} to ${toShown}` : `updated ${shown}`);
				break;
			}
		}
	}
	const files = [...planned];
	const written = files.flatMap(([full, text]) => text === null ? [] : [{
		full,
		text
	}]);
	const removed = files.flatMap(([full, text]) => text === null ? [full] : []);
	for (const { full, text } of written) await backend.writeFile(full, text);
	for (const full of removed) await backend.remove?.(full);
	const notes = [];
	for (const { full } of written) notes.push(...await afterWrite(env, full));
	return [
		"Applied the patch:",
		...changes,
		...notes
	].join("\n");
}
/**
* The `patch` tool: it changes files with a patch in the `*** Begin Patch`
* format (see {@link parsePatch}). The old lines of a chunk are found with
* {@link findMatches}. All files are checked before the first write, so a
* patch that does not fit changes nothing. The `afterWrite` hooks run for
* each written file. The result lists the changed files.
*
* - `*** Add File:` replaces a file that is there, like `write_file`.
* - `*** Delete File:` needs a file there.
* - `*** Move to:` writes the new path, then removes the old one. It refuses
*   a target that is already there, unless the patch removes it first.
* - A delete or a move needs `remove` on the backend. Without it, the tool
*   refuses them, before it writes anything.
* - A file that the patch removed or moved away cannot change again in the
*   same patch. A file cannot be removed or moved after the patch changed it.
*/
function patchTools(env) {
	return [toolDefinition({
		name: "patch",
		description: DESCRIPTION,
		inputSchema: {
			type: "object",
			properties: { patch: { type: "string" } },
			required: ["patch"]
		}
	}).server(async (args) => {
		const operations = parsePatch(stringArg(args, "patch"));
		const steps = [];
		for (const operation of operations) {
			const full = await env.reach(operation.path, "patch", "file");
			const movePath = operation.type === "update" ? operation.movePath : void 0;
			const to = movePath === void 0 ? full : await env.reach(movePath, "patch", "file");
			steps.push({
				operation,
				full,
				to
			});
		}
		const paths = [...new Set(steps.flatMap((step) => [step.full, step.to]))].sort();
		let run = () => applyAll(env, steps);
		for (const path of paths) {
			const inner = run;
			run = () => env.lock(path, inner);
		}
		return run();
	})];
}
//#endregion
export { parsePatch, patchPaths, patchTools };

//# sourceMappingURL=patch.js.map