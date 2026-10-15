import "./protocol.js";
import { EventType } from "@tanstack/ai";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
//#region src/build.ts
var MANIFEST = "harness.manifest.json";
var BUNDLE = "harness.js";
function run(command, args, cwd) {
	const viaShell = process.platform === "win32" && !/\.exe$/i.test(command);
	return new Promise((done, fail) => {
		const child = viaShell ? spawn(command, args.map((arg) => `"${arg}"`), {
			cwd,
			stdio: [
				"ignore",
				"pipe",
				"pipe"
			],
			shell: true
		}) : spawn(command, args, {
			cwd,
			stdio: [
				"ignore",
				"pipe",
				"pipe"
			]
		});
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (data) => stdout += data.toString());
		child.stderr.on("data", (data) => stderr += data.toString());
		child.on("error", (error) => fail(/* @__PURE__ */ new Error(`Could not run ${command}. buildHarness uses Bun: install it from https://bun.sh. (${error.message})`)));
		child.on("close", (code) => code === 0 ? done(stdout) : fail(/* @__PURE__ */ new Error(`${command} ${args[0] ?? ""} failed:\n${stderr || stdout}`)));
	});
}
/**
* Bundle a harness into a worker artifact: `harness.js` (starts a worker on
* stdin and stdout) and `harness.manifest.json`. With `compile`, also build a
* single executable.
*
* The build imports `entry` in a child process to read the harness name,
* agents, and plugin names. Importing a module runs its code.
*/
async function buildHarness(options) {
	const bun = options.bun ?? "bun";
	const entry = resolve(options.entry);
	const outDir = resolve(options.outDir);
	const exportName = options.export ?? "default";
	const slash = (path) => path.split("\\").join("/");
	const entryPath = slash(entry);
	const builtWorker = fileURLToPath(new URL("data:video/mp2t;base64,aW1wb3J0IHsgY3JlYXRlSW50ZXJmYWNlIH0gZnJvbSAnbm9kZTpyZWFkbGluZScKaW1wb3J0IHsgY3JlYXRlSGFybmVzc0hvc3QgfSBmcm9tICcuL2hvc3QnCmltcG9ydCB7CiAgSEFSTkVTU19QUk9UT0NPTF9WRVJTSU9OLAogIGFwcGx5SW5wdXQsCiAgcGFyc2VDb250cm9sRnJhbWUsCn0gZnJvbSAnLi9wcm90b2NvbCcKaW1wb3J0IHR5cGUgeyBBbnlIYXJuZXNzIH0gZnJvbSAnLi9kZWZpbmUnCmltcG9ydCB0eXBlIHsgSGFybmVzc1BlcnNpc3RlbmNlIH0gZnJvbSAnLi9ob3N0JwppbXBvcnQgdHlwZSB7IEhvc3RGcmFtZSB9IGZyb20gJy4vcHJvdG9jb2wnCgpleHBvcnQgaW50ZXJmYWNlIEhhcm5lc3NXb3JrZXJPcHRpb25zIHsKICBpbnB1dD86IE5vZGVKUy5SZWFkYWJsZVN0cmVhbQogIG91dHB1dD86IHsgd3JpdGU6ICh0ZXh0OiBzdHJpbmcpID0+IHVua25vd24gfQogIHBlcnNpc3RlbmNlPzogSGFybmVzc1BlcnNpc3RlbmNlCn0KCi8qKgogKiBSdW4gYSBoYXJuZXNzIGFzIGEgd29ya2VyOiBzZXNzaW9uLXRpZXIgZnJhbWVzIGFzIE5ESlNPTiBvbiBzdGRpbiBhbmQKICogc3Rkb3V0LiBUaGUgZmlyc3QgZnJhbWUgbXVzdCBiZSBgaGFybmVzcy5zdWJzY3JpYmVgLiBUaGUgd29ya2VyIGV4aXRzIHdoZW4KICogc3RkaW4gY2xvc2VzLiBgYXJ0aWZhY3RUZXh0YCBzdGFydHMgd29ya2VycyBsaWtlIHRoaXMuCiAqLwpleHBvcnQgYXN5bmMgZnVuY3Rpb24gcnVuSGFybmVzc1dvcmtlcigKICBoYXJuZXNzOiBBbnlIYXJuZXNzLAogIG9wdGlvbnM6IEhhcm5lc3NXb3JrZXJPcHRpb25zID0ge30sCik6IFByb21pc2U8dm9pZD4gewogIGNvbnN0IG91dHB1dCA9IG9wdGlvbnMub3V0cHV0ID8/IHByb2Nlc3Muc3Rkb3V0CiAgY29uc3Qgc2VuZCA9IChmcmFtZTogSG9zdEZyYW1lKSA9PiBvdXRwdXQud3JpdGUoYCR7SlNPTi5zdHJpbmdpZnkoZnJhbWUpfVxuYCkKICBjb25zdCBob3N0ID0gY3JlYXRlSGFybmVzc0hvc3QoCiAgICBvcHRpb25zLnBlcnNpc3RlbmNlID8geyBwZXJzaXN0ZW5jZTogb3B0aW9ucy5wZXJzaXN0ZW5jZSB9IDoge30sCiAgKQogIGNvbnN0IHJlYWRlciA9IG5ldyBBYm9ydENvbnRyb2xsZXIoKQogIGxldCBzZXNzaW9uOiBBd2FpdGVkPFJldHVyblR5cGU8dHlwZW9mIGhvc3Qub3Blbj4+IHwgdW5kZWZpbmVkCiAgY29uc3QgbGluZXMgPSBjcmVhdGVJbnRlcmZhY2UoewogICAgaW5wdXQ6IG9wdGlvbnMuaW5wdXQgPz8gcHJvY2Vzcy5zdGRpbiwKICAgIGNybGZEZWxheTogSW5maW5pdHksCiAgfSkKCiAgdHJ5IHsKICAgIGZvciBhd2FpdCAoY29uc3QgbGluZSBvZiBsaW5lcykgewogICAgICBpZiAobGluZS50cmltKCkgPT09ICcnKSBjb250aW51ZQogICAgICB0cnkgewogICAgICAgIGNvbnN0IGZyYW1lID0gcGFyc2VDb250cm9sRnJhbWUobGluZSkKICAgICAgICBpZiAoZnJhbWUudHlwZSA9PT0gJ2hhcm5lc3Muc3Vic2NyaWJlJykgewogICAgICAgICAgaWYgKHNlc3Npb24pIHRocm93IG5ldyBFcnJvcignQWxyZWFkeSBzdWJzY3JpYmVkLicpCiAgICAgICAgICBzZXNzaW9uID0gYXdhaXQgaG9zdC5vcGVuKGhhcm5lc3MsIHsgdGhyZWFkSWQ6IGZyYW1lLnRocmVhZElkIH0pCiAgICAgICAgICBzZW5kKHsKICAgICAgICAgICAgdHlwZTogJ2hhcm5lc3MuaGVsbG8nLAogICAgICAgICAgICB2OiBIQVJORVNTX1BST1RPQ09MX1ZFUlNJT04sCiAgICAgICAgICAgIHRocmVhZElkOiBmcmFtZS50aHJlYWRJZCwKICAgICAgICAgIH0pCiAgICAgICAgICBjb25zdCBldmVudHMgPSBzZXNzaW9uLmV2ZW50cyh7CiAgICAgICAgICAgIC4uLihmcmFtZS5mcm9tID8geyBmcm9tOiBmcmFtZS5mcm9tIH0gOiB7fSksCiAgICAgICAgICAgIHNpZ25hbDogcmVhZGVyLnNpZ25hbCwKICAgICAgICAgIH0pCiAgICAgICAgICB2b2lkIChhc3luYyAoKSA9PiB7CiAgICAgICAgICAgIGZvciBhd2FpdCAoY29uc3QgZW50cnkgb2YgZXZlbnRzKQogICAgICAgICAgICAgIHNlbmQoeyB0eXBlOiAnaGFybmVzcy5ldmVudCcsIC4uLmVudHJ5IH0pCiAgICAgICAgICB9KSgpCiAgICAgICAgICBjb250aW51ZQogICAgICAgIH0KICAgICAgICBpZiAoIXNlc3Npb24pIHRocm93IG5ldyBFcnJvcignU2VuZCBoYXJuZXNzLnN1YnNjcmliZSBmaXJzdC4nKQogICAgICAgIGlmIChmcmFtZS50eXBlID09PSAnaGFybmVzcy5zbmFwc2hvdCcpIHsKICAgICAgICAgIHNlbmQoeyB0eXBlOiAnaGFybmVzcy5zbmFwc2hvdCcsIHNuYXBzaG90OiBzZXNzaW9uLnNuYXBzaG90KCkgfSkKICAgICAgICAgIGNvbnRpbnVlCiAgICAgICAgfQogICAgICAgIGNvbnN0IHJlY2VpcHQgPSBhd2FpdCBhcHBseUlucHV0KGhhcm5lc3MsIHNlc3Npb24sIGZyYW1lLmlucHV0KQogICAgICAgIHNlbmQoewogICAgICAgICAgdHlwZTogJ2hhcm5lc3MucmVjZWlwdCcsCiAgICAgICAgICByZXF1ZXN0SWQ6IGZyYW1lLnJlcXVlc3RJZCwKICAgICAgICAgIC4uLnJlY2VpcHQsCiAgICAgICAgfSkKICAgICAgfSBjYXRjaCAoZXJyb3IpIHsKICAgICAgICBzZW5kKHsKICAgICAgICAgIHR5cGU6ICdoYXJuZXNzLmVycm9yJywKICAgICAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogU3RyaW5nKGVycm9yKSwKICAgICAgICB9KQogICAgICB9CiAgICB9CiAgfSBmaW5hbGx5IHsKICAgIHJlYWRlci5hYm9ydCgpCiAgICBhd2FpdCBob3N0LmNsb3NlKCkKICB9Cn0K", "" + import.meta.url));
	const workerModule = slash(existsSync(builtWorker) ? builtWorker : builtWorker.replace(/\.js$/, ".ts"));
	await mkdir(outDir, { recursive: true });
	const id = randomUUID().slice(0, 8);
	const bootstrap = join(dirname(entry), `.harness-worker-${id}.mjs`);
	const describe = join(dirname(entry), `.harness-describe-${id}.mjs`);
	await writeFile(bootstrap, [
		`import * as entry from ${JSON.stringify(entryPath)}`,
		`import { runHarnessWorker } from ${JSON.stringify(workerModule)}`,
		`await runHarnessWorker(entry[${JSON.stringify(exportName)}])`
	].join("\n"));
	await writeFile(describe, [
		`const entry = await import(${JSON.stringify(entryPath)})`,
		`const harness = entry[${JSON.stringify(exportName)}]`,
		`if (!harness || harness.kind !== 'tanstack-ai-harness') throw new Error('Export ${exportName} of ${entry.replace(/\\/g, "/")} is not a harness.')`,
		`const agents = [...(harness.agents ?? []), ...(harness.subagents?.agents ?? [])]`,
		`const plugins = harness.plugins ? harness.plugins().map((plugin) => ({ name: plugin.name })) : []`,
		`console.log(JSON.stringify({ name: harness.name, agents: agents.map((agent) => ({ name: agent.name, ...(agent.produces ? { produces: agent.produces } : {}) })), plugins }))`
	].join("\n"));
	try {
		const bundle = join(outDir, BUNDLE);
		await run(bun, [
			"build",
			bootstrap,
			"--target=node",
			`--outfile=${bundle}`
		], dirname(entry));
		const described = JSON.parse((await run(bun, [describe], dirname(entry))).trim().split("\n").at(-1) ?? "{}");
		const names = described.plugins.map((plugin) => plugin.name);
		const usesWorkspace = names.includes("tanstack/workspace-tools") || names.includes("tanstack/snapshots");
		const manifest = {
			format: "tanstack-ai-harness",
			version: 1,
			name: described.name,
			digest: createHash("sha256").update(await readFile(bundle)).digest("hex"),
			entry: BUNDLE,
			runtime: {
				kind: "node",
				major: Number(process.versions.node.split(".")[0])
			},
			protocol: 1,
			agents: described.agents,
			plugins: described.plugins,
			requires: {
				filesystem: usesWorkspace || names.includes("tanstack/project-instructions"),
				processExecution: usesWorkspace,
				network: names.some((name) => name.startsWith("connector/")) ? "declared" : "model-only"
			}
		};
		await writeFile(join(outDir, MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
		let executable;
		if (options.compile) {
			executable = resolve(options.compile.outfile);
			await run(bun, [
				"build",
				resolve(options.compile.entry),
				"--compile",
				`--outfile=${executable}`,
				...options.compile.target ? [`--target=${options.compile.target}`] : []
			], dirname(resolve(options.compile.entry)));
		}
		return {
			manifest,
			bundle,
			...executable ? { executable } : {}
		};
	} finally {
		await rm(bootstrap, { force: true });
		await rm(describe, { force: true });
	}
}
/** Read and check the manifest of a built harness. */
async function readManifest(dir) {
	const manifest = JSON.parse(await readFile(join(resolve(dir), MANIFEST), "utf8"));
	if (typeof manifest !== "object" || manifest === null || !("format" in manifest) || manifest.format !== "tanstack-ai-harness" || !("version" in manifest) || manifest.version !== 1) throw new Error(`${dir} has no tanstack-ai-harness v1 manifest.`);
	return manifest;
}
var FORWARDED = /* @__PURE__ */ new Set([
	EventType.TEXT_MESSAGE_START,
	EventType.TEXT_MESSAGE_CONTENT,
	EventType.TEXT_MESSAGE_END,
	EventType.REASONING_START,
	EventType.REASONING_MESSAGE_START,
	EventType.REASONING_MESSAGE_CONTENT,
	EventType.REASONING_MESSAGE_END,
	EventType.REASONING_END
]);
function startWorker(node, bundle, threadId) {
	const child = spawn(node, [bundle], { stdio: [
		"pipe",
		"pipe",
		"inherit"
	] });
	const listeners = /* @__PURE__ */ new Set();
	createInterface({ input: child.stdout }).on("line", (line) => {
		try {
			const frame = JSON.parse(line);
			for (const listener of listeners) listener(frame);
		} catch {}
	});
	const send = (frame) => child.stdin.write(`${JSON.stringify(frame)}\n`);
	send({
		type: "harness.subscribe",
		threadId
	});
	return {
		send,
		frames: (listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		kill: () => {
			child.stdin.end();
			child.kill();
		}
	};
}
function lastUserText(messages) {
	const message = (Array.isArray(messages) ? messages : []).findLast((entry) => typeof entry === "object" && entry !== null && "role" in entry && entry.role === "user");
	if (typeof message !== "object" || message === null || !("content" in message)) return "";
	return typeof message.content === "string" ? message.content : "";
}
/**
* Use a built harness as the model of a `chat()` call. Each outer thread gets
* its own worker process (`node harness.js`). Call `dispose()` to stop them.
*/
async function artifactText(dir, options = {}) {
	const manifest = await readManifest(dir);
	const bundle = join(resolve(dir), manifest.entry);
	if (createHash("sha256").update(await readFile(bundle)).digest("hex") !== manifest.digest) throw new Error(`The bundle in ${dir} does not match its manifest digest.`);
	const workers = /* @__PURE__ */ new Map();
	let requests = 0;
	return {
		kind: "text",
		name: "harness-artifact",
		model: manifest.name,
		"~types": {
			providerOptions: {},
			inputModalities: ["text"],
			messageMetadataByModality: {
				text: void 0,
				image: void 0,
				audio: void 0,
				video: void 0,
				document: void 0
			},
			toolCapabilities: [],
			toolCallMetadata: void 0,
			systemPromptMetadata: void 0
		},
		dispose: () => {
			for (const worker of workers.values()) worker.kill();
			workers.clear();
		},
		structuredOutput: () => Promise.reject(/* @__PURE__ */ new Error("artifactText does not support structured output.")),
		chatStream: (chatOptions) => (async function* () {
			const threadId = chatOptions.threadId ?? "default";
			let worker = workers.get(threadId);
			if (!worker) {
				worker = startWorker(options.node ?? process.execPath, bundle, threadId);
				workers.set(threadId, worker);
			}
			const runId = chatOptions.runId ?? `artifact-${Date.now().toString(36)}`;
			const requestId = `r${requests += 1}`;
			const queue = [];
			let wake;
			const stop = worker.frames((frame) => {
				queue.push(frame);
				wake?.();
			});
			worker.send({
				type: "harness.input",
				requestId,
				input: {
					op: "prompt",
					message: lastUserText(chatOptions.messages)
				}
			});
			yield {
				type: EventType.RUN_STARTED,
				runId,
				threadId,
				timestamp: Date.now()
			};
			let operationId;
			const early = [];
			try {
				while (true) {
					if (queue.length === 0) {
						await new Promise((resolveWait) => wake = resolveWait);
						wake = void 0;
					}
					const frame = queue.shift();
					if (!frame) continue;
					if (frame.type === "harness.error") throw new Error(frame.message);
					if (frame.type === "harness.receipt" && frame.requestId === requestId) {
						if (frame.status === "rejected") throw new Error(frame.reason ?? "The worker refused the prompt.");
						operationId = frame.operationId;
						queue.unshift(...early.filter((entry) => entry.operationId === operationId));
						continue;
					}
					if (frame.type !== "harness.event") continue;
					if (!operationId) {
						early.push(frame);
						continue;
					}
					if (frame.operationId !== operationId) continue;
					const event = frame.event;
					if (FORWARDED.has(event.type) && !("subagentRunId" in event && event.subagentRunId)) yield event;
					if (event.type === EventType.RUN_ERROR) throw new Error(event.message);
					if (event.type === EventType.CUSTOM && event.name === "harness.operation.finished") break;
				}
			} finally {
				stop();
			}
			yield {
				type: EventType.RUN_FINISHED,
				runId,
				threadId,
				timestamp: Date.now(),
				metadata: { tanstack: { finishReason: "stop" } }
			};
		})()
	};
}
//#endregion
export { artifactText, buildHarness, readManifest };

//# sourceMappingURL=build.js.map