import { createHarnessHost } from "./host.js";
import { applyInput, parseControlFrame } from "./protocol.js";
import { createInterface } from "node:readline";
//#region src/worker.ts
/**
* Run a harness as a worker: session-tier frames as NDJSON on stdin and
* stdout. The first frame must be `harness.subscribe`. The worker exits when
* stdin closes. `artifactText` starts workers like this.
*/
async function runHarnessWorker(harness, options = {}) {
	const output = options.output ?? process.stdout;
	const send = (frame) => output.write(`${JSON.stringify(frame)}\n`);
	const host = createHarnessHost(options.persistence ? { persistence: options.persistence } : {});
	const reader = new AbortController();
	let session;
	const lines = createInterface({
		input: options.input ?? process.stdin,
		crlfDelay: Infinity
	});
	try {
		for await (const line of lines) {
			if (line.trim() === "") continue;
			try {
				const frame = parseControlFrame(line);
				if (frame.type === "harness.subscribe") {
					if (session) throw new Error("Already subscribed.");
					session = await host.open(harness, { threadId: frame.threadId });
					send({
						type: "harness.hello",
						v: 1,
						threadId: frame.threadId
					});
					const events = session.events({
						...frame.from ? { from: frame.from } : {},
						signal: reader.signal
					});
					(async () => {
						for await (const entry of events) send({
							type: "harness.event",
							...entry
						});
					})();
					continue;
				}
				if (!session) throw new Error("Send harness.subscribe first.");
				if (frame.type === "harness.snapshot") {
					send({
						type: "harness.snapshot",
						snapshot: session.snapshot()
					});
					continue;
				}
				const receipt = await applyInput(harness, session, frame.input);
				send({
					type: "harness.receipt",
					requestId: frame.requestId,
					...receipt
				});
			} catch (error) {
				send({
					type: "harness.error",
					message: error instanceof Error ? error.message : String(error)
				});
			}
		}
	} finally {
		reader.abort();
		await host.close();
	}
}
//#endregion
export { runHarnessWorker };

//# sourceMappingURL=worker.js.map