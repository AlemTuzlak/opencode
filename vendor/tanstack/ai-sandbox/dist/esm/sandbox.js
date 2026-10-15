import { InMemorySandboxInstanceStore } from "./instance-store.js";
import { resolveAllSecrets } from "./secrets.js";
import { computeSandboxKey } from "./key.js";
import { bootstrapWorkspace } from "./bootstrap.js";
import { InMemoryLockStore } from "@tanstack/ai/locks";
//#region src/sandbox.ts
/**
* `defineSandbox()` returns a LAZY controller — it never creates a sandbox at
* definition time. `withSandbox()` (and advanced users) call `ensure()` to
* resume-or-create, following: provider.resume → provider.restoreSnapshot →
* create + bootstrap. The controller folds provider/workspace/policy/lifecycle
* into a stable instance key and coordinates through the (optional) lock +
* sandbox stores.
*/
var outcomeEnsure = /* @__PURE__ */ new WeakMap();
var existingEnsure = /* @__PURE__ */ new WeakMap();
function stageEnsureExistingSandbox(definition) {
	const fn = existingEnsure.get(definition);
	if (fn) return (ctx, stage) => fn(ctx, stage);
	const ensureExisting = definition.ensureExisting.bind(definition);
	return (ctx) => ensureExisting(ctx);
}
function ensureSandboxWithOutcome(definition, ctx) {
	const fn = outcomeEnsure.get(definition);
	if (!fn) throw new Error("Sandbox snapshot mode requires a definition created by defineSandbox()");
	return fn(ctx);
}
/**
* Parse a human-readable duration string into milliseconds.
* Supports `'<n>h'` (hours) and `'<n>m'` (minutes).
* Returns `undefined` when the input is undefined or the format is unrecognised.
*/
function parseMaxAgeMs(value) {
	if (value === void 0) return void 0;
	const hourMatch = /^(\d+)h$/.exec(value);
	if (hourMatch) return Number(hourMatch[1]) * 60 * 60 * 1e3;
	const minuteMatch = /^(\d+)m$/.exec(value);
	if (minuteMatch) return Number(minuteMatch[1]) * 60 * 1e3;
}
/**
* Bound for the unfenced teardown `destroy` call (see `destroy` below). Long
* enough that a slow provider API still completes, short enough that a wedged
* one cannot pin the process forever.
*/
var DESTROY_TIMEOUT_MS = 6e4;
var fallbackStore = new InMemorySandboxInstanceStore();
var fallbackLocks = new InMemoryLockStore();
/**
* Put workspace secrets onto a live handle. Resume and snapshot restore skip
* bootstrap, so this is the only path that re-injects them after reconnect.
* Create injects secrets via `provider.create({ env })`, but resume/restore
* return a handle whose process env is empty unless we set it here. sbx in
* particular has no Docker Env on resume, so this is the only way secrets
* come back for that provider.
*/
async function applyWorkspaceSecrets(handle, workspace, stagedSecrets) {
	if (workspace?.secrets === void 0) return;
	const resolved = stagedSecrets ?? resolveAllSecrets(workspace.secrets);
	if (Object.keys(resolved).length === 0) return;
	await handle.env.set(resolved);
}
function defineSandbox(config) {
	const keyInputFor = (ctx) => ({
		threadId: config.lifecycle?.reuse === "none" ? `${ctx.threadId}:${ctx.runId}` : ctx.threadId,
		sandboxId: config.id,
		providerName: config.provider.name,
		workspace: config.workspace,
		tenant: ctx.tenant
	});
	const ensureWithOutcome = async (ctx) => {
		const store = ctx.store ?? fallbackStore;
		const locks = ctx.locks ?? fallbackLocks;
		const key = computeSandboxKey(keyInputFor(ctx));
		const caps = config.provider.capabilities();
		return locks.withLock(`sandbox:${key}`, async () => {
			const effectiveSnapshot = config.lifecycle?.snapshot ?? (caps.snapshots ? "after-setup" : "none");
			const maxAgeMs = parseMaxAgeMs(config.lifecycle?.snapshotMaxAge);
			const existing = await store.get(key);
			if (existing) {
				if (!(maxAgeMs !== void 0 && Date.now() - existing.updatedAt > maxAgeMs)) {
					const resumed = await config.provider.resume({
						id: existing.providerSandboxId,
						signal: ctx.signal
					});
					if (resumed) {
						await applyWorkspaceSecrets(resumed, config.workspace);
						await store.upsert({
							...existing,
							latestRunId: ctx.runId,
							updatedAt: Date.now()
						});
						return {
							handle: resumed,
							outcome: "resumed"
						};
					}
					if (existing.latestSnapshotId && caps.snapshots && config.provider.restoreSnapshot) {
						const restored = await config.provider.restoreSnapshot({
							snapshotId: existing.latestSnapshotId,
							workspace: config.workspace,
							policy: config.policy,
							env: config.workspace?.secrets !== void 0 ? resolveAllSecrets(config.workspace.secrets) : void 0,
							signal: ctx.signal
						});
						await applyWorkspaceSecrets(restored, config.workspace);
						await store.upsert({
							...existing,
							providerSandboxId: restored.id,
							latestRunId: ctx.runId,
							updatedAt: Date.now()
						});
						return {
							handle: restored,
							outcome: "native-restored"
						};
					}
				}
			}
			const created = await config.provider.create({
				id: key,
				workspace: config.workspace,
				policy: config.policy,
				env: config.workspace?.secrets !== void 0 ? resolveAllSecrets(config.workspace.secrets) : void 0,
				signal: ctx.signal,
				adapterName: ctx.adapterName
			});
			if (config.workspace) try {
				await bootstrapWorkspace(created, config.workspace, { signal: ctx.signal });
			} catch (error) {
				await created.destroy().catch(() => {});
				throw error;
			}
			let latestSnapshotId;
			if (effectiveSnapshot === "after-setup" && caps.snapshots && created.snapshot) latestSnapshotId = (await created.snapshot("after-setup")).id;
			await store.upsert({
				key,
				provider: config.provider.name,
				providerSandboxId: created.id,
				latestSnapshotId,
				threadId: ctx.threadId,
				latestRunId: ctx.runId,
				updatedAt: Date.now()
			});
			return {
				handle: created,
				outcome: "created"
			};
		});
	};
	const ensure = async (ctx) => (await ensureWithOutcome(ctx)).handle;
	const ensureExistingWithStage = async (ctx, stage) => {
		const store = ctx.store ?? fallbackStore;
		const locks = ctx.locks ?? fallbackLocks;
		const key = stage?.key ?? computeSandboxKey(keyInputFor(ctx));
		const workspace = stage?.workspace ?? config.workspace;
		const snapshotMaxAge = stage ? stage.snapshotMaxAge : config.lifecycle?.snapshotMaxAge;
		const resume = stage?.resume ?? config.provider.resume.bind(config.provider);
		return locks.withLock(`sandbox:${key}`, async () => {
			const existing = await store.get(key);
			const maxAgeMs = parseMaxAgeMs(snapshotMaxAge);
			if (!existing || maxAgeMs !== void 0 && Date.now() - existing.updatedAt > maxAgeMs) return null;
			const resumed = await resume({
				id: existing.providerSandboxId,
				signal: ctx.signal
			});
			if (!resumed) return null;
			await applyWorkspaceSecrets(resumed, workspace, stage?.resolvedSecrets);
			await store.upsert({
				...existing,
				latestRunId: ctx.runId,
				updatedAt: Date.now()
			});
			return resumed;
		});
	};
	const ensureExisting = (ctx) => ensureExistingWithStage(ctx);
	const destroy = async (ctx) => {
		const store = ctx.store ?? fallbackStore;
		const key = computeSandboxKey(keyInputFor(ctx));
		const existing = await store.get(key);
		if (!existing) return;
		const teardown = new AbortController();
		const timer = setTimeout(() => teardown.abort(), DESTROY_TIMEOUT_MS);
		try {
			await config.provider.destroy({
				id: existing.providerSandboxId,
				signal: teardown.signal
			});
		} finally {
			clearTimeout(timer);
		}
		await store.delete(key);
	};
	const definition = {
		id: config.id,
		provider: config.provider,
		workspace: config.workspace,
		policy: config.policy,
		lifecycle: config.lifecycle,
		hooks: config.hooks,
		fileEvents: config.fileEvents,
		key: (ctx) => computeSandboxKey(keyInputFor(ctx)),
		ensure,
		ensureExisting,
		destroy
	};
	outcomeEnsure.set(definition, ensureWithOutcome);
	existingEnsure.set(definition, ensureExistingWithStage);
	return definition;
}
//#endregion
export { defineSandbox, ensureSandboxWithOutcome, stageEnsureExistingSandbox };

//# sourceMappingURL=sandbox.js.map