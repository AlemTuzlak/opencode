import { describe, expect, it } from "vitest";
//#region src/testkit/durable-run-fields-conformance.ts
/**
* Conformance for the DURABLE-RUN fields on a `RunStore`.
*
* These four fields (`sandboxKey`, `detachedSince`, `cancelRequested`,
* `driverEpoch`) exist for durable sandboxed runs: detach on disconnect, takeover
* by a later host, and the reaper. A chat-only app never writes them, so proving
* them is NOT part of `runPersistenceConformance` in `@tanstack/ai-persistence`.
* They live here, next to the takeover and reaper suites that depend on them.
*
* Run this when your app wires `withSandbox(sandbox, { runs, durability })`. The
* fields round-trip through the REQUIRED `update`/`get` pair, so a backend can
* pass every persistence case while silently dropping one of them, and the
* failure then shows up as a run that looks permanently detached or a takeover
* that cannot fence a superseded host.
*
* ```ts
* import { runDurableRunFieldsConformance } from '@tanstack/ai-sandbox/testkit'
* import { myPersistence } from './persistence'
*
* runDurableRunFieldsConformance('my postgres runs', () => myPersistence().stores.runs)
* ```
*/
function runDurableRunFieldsConformance(name, makeStore) {
	describe(`durable run fields conformance: ${name}`, () => {
		it("round-trips the durable run fields, overwrites driverEpoch, and clears every one of them on explicit undefined", async () => {
			const store = await makeStore();
			await store.createOrResume({
				runId: "fc-1",
				threadId: "fc-t",
				startedAt: 1
			});
			const fresh = await store.get("fc-1");
			expect(fresh?.cancelRequested).toBeUndefined();
			expect(fresh?.detachedSince).toBeUndefined();
			expect(fresh?.sandboxKey).toBeUndefined();
			expect(fresh?.driverEpoch).toBeUndefined();
			await store.update("fc-1", {
				sandboxKey: "sandbox-abc",
				detachedSince: 500,
				cancelRequested: true,
				driverEpoch: 1
			});
			const afterFirstUpdate = await store.get("fc-1");
			expect(afterFirstUpdate?.sandboxKey).toBe("sandbox-abc");
			expect(afterFirstUpdate?.detachedSince).toBe(500);
			expect(afterFirstUpdate?.cancelRequested).toBe(true);
			expect(afterFirstUpdate?.driverEpoch).toBe(1);
			await store.update("fc-1", { driverEpoch: 2 });
			const afterEpochBump = await store.get("fc-1");
			expect(afterEpochBump?.driverEpoch).toBe(2);
			expect(afterEpochBump?.sandboxKey).toBe("sandbox-abc");
			expect(afterEpochBump?.cancelRequested).toBe(true);
			await store.update("fc-1", { detachedSince: void 0 });
			const afterClear = await store.get("fc-1");
			expect(afterClear?.detachedSince).toBeUndefined();
			expect(afterClear?.sandboxKey).toBe("sandbox-abc");
			expect(afterClear?.cancelRequested).toBe(true);
			expect(afterClear?.driverEpoch).toBe(2);
			await store.update("fc-1", { cancelRequested: false });
			const afterExplicitFalse = await store.get("fc-1");
			expect(afterExplicitFalse?.cancelRequested).toBe(false);
			expect(afterExplicitFalse?.cancelRequested).not.toBeUndefined();
			await store.update("fc-1", {
				sandboxKey: "sandbox-xyz",
				detachedSince: 900,
				cancelRequested: true,
				driverEpoch: 3
			});
			const beforeFullClear = await store.get("fc-1");
			expect(beforeFullClear?.sandboxKey).toBe("sandbox-xyz");
			expect(beforeFullClear?.detachedSince).toBe(900);
			expect(beforeFullClear?.cancelRequested).toBe(true);
			expect(beforeFullClear?.driverEpoch).toBe(3);
			await store.update("fc-1", {
				sandboxKey: void 0,
				detachedSince: void 0,
				cancelRequested: void 0,
				driverEpoch: void 0
			});
			const afterFullClear = await store.get("fc-1");
			expect(afterFullClear?.sandboxKey).toBeUndefined();
			expect(afterFullClear?.detachedSince).toBeUndefined();
			expect(afterFullClear?.cancelRequested).toBeUndefined();
			expect(afterFullClear?.driverEpoch).toBeUndefined();
			expect(afterFullClear?.status).toBe("running");
			expect(afterFullClear?.startedAt).toBe(1);
		});
	});
}
//#endregion
export { runDurableRunFieldsConformance };

//# sourceMappingURL=durable-run-fields-conformance.js.map