import { SandboxCapability, provideSandbox, provideSandboxPolicy } from "./capabilities.js";
import { SandboxInstanceStoreCapability } from "./instance-store.js";
import { SandboxCheckpointError } from "./checkpoint-store.js";
import { captureSandboxArtifacts, captureSandboxFiles, resolveSandboxSnapshotPolicy, restoreSandboxFiles } from "./snapshots.js";
import { resolveAllSecrets, resolveSecret } from "./secrets.js";
import { computeWorkspaceHash } from "./key.js";
import { resolveHarnessCwd } from "./harness-cwd.js";
import "./bootstrap.js";
import { ensureSandboxWithOutcome } from "./sandbox.js";
import { ProjectionCapability, provideWorkspaceProjection } from "./projection.js";
import { provideSandboxDurability, resolveSandboxDurability } from "./durability.js";
import { buildFileHookEvent, resolveFileEvents } from "./file-diff.js";
import { createToolHistoryRecorder, stripObservedToolCalls } from "./tool-history.js";
import { watchWorkspace } from "./watch.js";
import { defineChatMiddleware, isTerminalRunStatus, provideDetachableRun, provideRunDetached, wasCancelRequested } from "@tanstack/ai";
import { InMemoryLockStore, LocksCapability } from "@tanstack/ai/locks";
import { getPendingTurn, getRunDisconnect, getSandboxRuntime } from "@tanstack/ai/adapter-internals";
//#region src/middleware.ts
/**
* `withSandbox(definition, options?)` — the middleware that PROVIDES the
* {@link SandboxCapability} a harness adapter requires.
*
* - `setup`: resume-or-create the sandbox (via the definition's ensure
*   algorithm), provide the handle, using the durability seams from
*   {@link SandboxMiddlewareOptions} (or, failing that, a bus-provided
*   SandboxInstanceStoreCapability / LocksCapability, then an in-memory
*   fallback). If `fileEvents` is not false, starts a
*   watcher that dispatches to sandbox-scoped hooks and forwards to the runtime
*   sink.
* - `onFinish`/`onAbort`/`onError`: stop the watcher, snapshot (`after-run`)
*   and/or destroy per lifecycle.
*
* NOTE: streamed sandbox lifecycle events (sandbox.created, workspace.setup.*)
* are emitted by the harness adapter's chatStream (which can yield CUSTOM
* chunks), not from here — middleware setup runs before streaming begins.
*/
var runState = /* @__PURE__ */ new WeakMap();
function stopSnapshotLease(state, options = {}) {
	if (options.closePortable) state.snapshotClosed = true;
	if (state.snapshotStop) return state.snapshotStop;
	if (state.snapshotCleaned) return Promise.resolve();
	state.snapshotCleaned = true;
	state.snapshotRenewalGeneration++;
	if (state.snapshotRenewal !== void 0) clearTimeout(state.snapshotRenewal);
	state.snapshotRenewal = void 0;
	const renewTask = state.snapshotRenewTask;
	const captureTask = state.snapshotCaptureTask;
	const lease = state.snapshotLease;
	state.snapshotLease = void 0;
	state.snapshotStop = (async () => {
		await renewTask?.catch(() => {});
		await captureTask?.catch(() => {});
		await lease?.release();
	})();
	return state.snapshotStop;
}
function startSnapshotRenewal(state) {
	const lease = state.snapshotLease;
	if (!lease) return;
	const schedule = () => {
		const generation = state.snapshotRenewalGeneration;
		state.snapshotRenewal = setTimeout(() => {
			(async () => {
				state.snapshotRenewal = void 0;
				if (state.snapshotCleaned || generation !== state.snapshotRenewalGeneration) return;
				const renewal = Promise.resolve().then(async () => {
					await lease.renew();
				});
				state.snapshotRenewTask = renewal;
				try {
					await renewal;
				} catch (error) {
					state.snapshotLost = error instanceof Error ? error : new Error(String(error));
				} finally {
					if (state.snapshotRenewTask === renewal) state.snapshotRenewTask = void 0;
				}
				if (state.snapshotLost) await stopSnapshotLease(state).catch(() => {});
				else if (!state.snapshotCleaned && generation === state.snapshotRenewalGeneration) schedule();
			})();
		}, lease.renewAfterMs);
	};
	schedule();
}
/**
* Stop the watcher and drain any in-flight `diff()` promises before teardown,
* so the final file's diff isn't dropped when a run finishes/aborts/errors
* mid-computation. The `pendingDiffs` await is the load-bearing line — without
* it a deferred diff resolves after the run is gone and its chunk is lost.
*/
async function drainWatcher(state, phase) {
	try {
		await state.watcher?.stop();
	} catch (error) {
		state.logger?.warn("sandbox watcher stop failed", {
			phase,
			error
		});
	}
	await Promise.allSettled(state.pendingDiffs);
	if (state.watcher) state.logger?.sandbox("sandbox watcher stopped", { phase });
}
function canPublishPortableSnapshot(state, lease) {
	if (state.snapshotLost) throw state.snapshotLost;
	return !state.snapshotClosed && !state.snapshotCleaned && state.snapshotLease === lease;
}
/**
* Record the two facts a later attach and the reaper both need, then publish the
* detach verdict core reads.
*
* Shared by the DISCONNECT subscriber registered in `setup` (the run is still
* going — the normal case) and `onAbort`'s detach branch (the run is being torn
* down while detachable), so the two can never write a different shape of detach.
*
* GUARDED, and reports failure rather than throwing. `update` is a documented
* no-op for an unknown runId, so a vanished record does not turn teardown into a
* throw; a genuinely rejecting store is the caller's to react to — `onAbort` falls
* through to destroying the sandbox, because a DESTROYED sandbox beats an
* unreachable one, while the disconnect subscriber has nothing to fall back to
* (the run is alive and still using the sandbox) and simply leaves the verdict
* unpublished.
*
* The verdict is published ONLY on success. Publishing it after a failed record
* write would leave core holding the log open for a takeover that can never be
* found, since nothing in the store points at the run.
*/
async function recordDetach(definition, state, durability, ctx, phase) {
	try {
		try {
			const current = await durability.runs.get(ctx.runId);
			if (current !== null && isTerminalRunStatus(current.status)) return true;
		} catch {}
		await durability.runs.update(ctx.runId, {
			detachedSince: Date.now(),
			sandboxKey: definition.key(state.ensureCtx)
		});
	} catch (error) {
		state.logger?.warn("sandbox detach record write failed", {
			runId: ctx.runId,
			phase,
			error
		});
		return false;
	}
	provideRunDetached(ctx, true);
	return true;
}
/**
* Whether an out-of-band cancel has been recorded for this run, in EITHER band.
* A user pressing Stop and a user closing the tab produce the IDENTICAL
* connection close, so intent is never inferred from the disconnect itself: it
* arrives in-process (the abort reason carried the cancel sentinel) or durably
* (another host recorded it on the run record).
*/
async function cancelIntent(durability, runId, inProcess) {
	if (inProcess) return true;
	if (durability === void 0) return false;
	return wasCancelRequested(durability.runs, runId);
}
/** Defensively pull tenant scoping out of the runtime context, if present. */
function tenantFrom(context) {
	if (context === null || typeof context !== "object") return void 0;
	const c = context;
	const userId = typeof c.userId === "string" ? c.userId : void 0;
	const orgId = typeof c.orgId === "string" ? c.orgId : void 0;
	if (userId === void 0 && orgId === void 0) return void 0;
	return {
		userId,
		orgId
	};
}
/**
* Resolve the ensure seams. Precedence is explicit option → capability bus →
* (in `ensure`) the in-memory fallback. The option wins because it is visible
* at the call site; the bus remains for platform/framework injection.
*/
function buildEnsureCtx(ctx, options) {
	return {
		threadId: ctx.threadId,
		runId: ctx.runId,
		store: options?.instances ?? ctx.getOptional(SandboxInstanceStoreCapability),
		locks: options?.locks ?? ctx.getOptional(LocksCapability),
		tenant: tenantFrom(ctx.context),
		signal: ctx.signal,
		adapterName: ctx.provider
	};
}
/**
* Dispatch a sandbox file event to the per-type hooks declared on the
* definition. Errors in individual hooks are swallowed so one bad hook
* cannot break the run — but are logged under the `errors` category first, so
* a throwing hook is observable (matching the run-scoped path in the engine
* and the behavior the observability docs promise).
*/
async function dispatchDefinitionHooks(hooks, event, logger) {
	if (!hooks) return;
	const typed = {
		create: "onFileCreate",
		change: "onFileChange",
		delete: "onFileDelete"
	}[event.type];
	for (const fn of [hooks.onFile, hooks[typed]]) {
		if (!fn) continue;
		try {
			await fn(event);
		} catch (error) {
			logger?.errors("sandbox file hook failed", {
				path: event.path,
				type: event.type,
				error
			});
		}
	}
}
function withSandbox(definition, options) {
	return defineChatMiddleware({
		name: "sandbox",
		provides: [SandboxCapability, ProjectionCapability],
		optionalRequires: [SandboxInstanceStoreCapability, LocksCapability],
		async setup(ctx) {
			const ensureCtx = buildEnsureCtx(ctx, options);
			const snapshotConfig = options?.snapshots;
			const snapshotWorkspaceHash = definition.workspace ? computeWorkspaceHash(definition.workspace) : void 0;
			const snapshotPolicy = snapshotConfig ? resolveSandboxSnapshotPolicy(snapshotConfig.policy, snapshotWorkspaceHash) : void 0;
			let snapshotRuntime;
			let snapshotLease;
			if (snapshotConfig) {
				if (!snapshotConfig.persistence?.stores?.messages || !snapshotConfig.persistence.stores.artifacts || !snapshotConfig.persistence.stores.blobs) throw new Error("Sandbox snapshots require persistence stores.messages, stores.artifacts, and stores.blobs");
				const persistenceModule = await import("@tanstack/ai-persistence");
				const persistence = ctx.getOptional(persistenceModule.PersistenceCapability);
				if (persistence === void 0) throw new Error("Sandbox snapshots require withPersistence(snapshots.persistence) before withSandbox");
				if (persistence !== snapshotConfig.persistence) throw new Error("Sandbox snapshots require the same persistence instance passed to withPersistence");
				const completion = ctx.getOptional(persistenceModule.PersistenceCompletionCapability);
				if (!completion) throw new Error("Sandbox snapshots require withPersistence before withSandbox");
				snapshotRuntime = {
					persistence: snapshotConfig.persistence,
					completion
				};
				snapshotLease = await snapshotConfig.checkpoints.acquireWriter(ctx.threadId);
			}
			const durability = resolveSandboxDurability(options);
			if (durability !== void 0) {
				provideSandboxDurability(ctx, durability);
				provideDetachableRun(ctx, true);
			}
			const runtime = getSandboxRuntime(ctx, { optional: true });
			const logger = runtime?.logger;
			const state = {
				ensureCtx,
				snapshotRenewalGeneration: 0,
				pendingDiffs: [],
				toolHistory: createToolHistoryRecorder(),
				...logger ? { logger } : {},
				...durability ? { durability } : {}
			};
			runState.set(ctx, state);
			if (snapshotLease) {
				state.snapshotLease = snapshotLease;
				startSnapshotRenewal(state);
			}
			if (durability !== void 0) {
				try {
					await durability.runs.createOrResume({
						runId: ctx.runId,
						threadId: ctx.threadId,
						startedAt: Date.now()
					});
				} catch (error) {
					logger?.warn("sandbox run record pre-create failed", {
						runId: ctx.runId,
						error
					});
				}
				try {
					await getPendingTurn(ctx, { optional: true })?.snapshot();
				} catch (error) {
					logger?.warn("sandbox pending-turn snapshot failed", {
						runId: ctx.runId,
						error
					});
				}
			}
			if (durability !== void 0 && durability.detachOnDisconnect) getRunDisconnect(ctx, { optional: true })?.subscribe(async () => {
				const snapshotStop = stopSnapshotLease(state, { closePortable: true });
				snapshotStop.catch(() => {});
				if (await cancelIntent(durability, ctx.runId, false)) {
					await snapshotStop.catch((error) => {
						state.logger?.warn("sandbox snapshot writer release failed", {
							runId: ctx.runId,
							phase: "disconnect",
							error
						});
					});
					return;
				}
				if (await recordDetach(definition, state, durability, ctx, "disconnect")) {
					try {
						await snapshotStop;
					} catch (error) {
						state.logger?.warn("sandbox snapshot writer release failed", {
							runId: ctx.runId,
							phase: "disconnect",
							error
						});
					}
					state.logger?.sandbox("sandbox run detached on disconnect; the run continues", { runId: ctx.runId });
				} else await snapshotStop.catch((error) => {
					state.logger?.warn("sandbox snapshot writer release failed", {
						runId: ctx.runId,
						phase: "disconnect",
						error
					});
				});
			});
			let outcome = "created";
			let handle;
			try {
				if (snapshotConfig) ({handle, outcome} = await ensureSandboxWithOutcome(definition, ensureCtx));
				else handle = await definition.ensure(ensureCtx);
				state.handle = handle;
				state.privateHandle = snapshotConfig ? outcome !== "resumed" : true;
				if (snapshotConfig && outcome !== "resumed") {
					const head = await snapshotConfig.checkpoints.getHead(ctx.threadId);
					if (head) {
						const checkpoint = await snapshotConfig.checkpoints.get(head);
						if (!checkpoint) throw new SandboxCheckpointError("SANDBOX_SNAPSHOT_CHECKPOINT_NOT_FOUND", `Checkpoint '${head}' was not found`);
						await restoreSandboxFiles(handle, {
							blobs: snapshotConfig.persistence.stores.blobs,
							workspaceRoot: definition.workspace?.root ?? "/workspace"
						}, checkpoint, snapshotPolicy);
					}
				}
			} catch (error) {
				await stopSnapshotLease(state).catch(() => {});
				if (state.handle && state.privateHandle) await definition.destroy(ensureCtx).catch(() => {});
				throw error;
			}
			state.handle = handle;
			if (snapshotConfig) {
				state.snapshotConfig = snapshotConfig;
				state.snapshotPolicy = snapshotPolicy;
				state.snapshotRuntime = snapshotRuntime;
			}
			try {
				provideSandbox(ctx, handle);
				if (definition.policy) provideSandboxPolicy(ctx, definition.policy);
				if (durability !== void 0 && (ensureCtx.locks === void 0 || ensureCtx.locks instanceof InMemoryLockStore)) logger?.warn("sandbox durability is wired over an InMemoryLockStore: run claims are serialized within this process only and the lease never signals loss, so two hosts can drive one run and duplicate its event log. Use a distributed LockStore via withLocks for any multi-replica deploy.", { runId: ctx.runId });
				const watchRoot = definition.workspace?.root ?? "/workspace";
				let baseSha = "";
				try {
					const shaRes = await handle.process.exec("git rev-parse HEAD", { cwd: watchRoot });
					if (shaRes.exitCode === 0) {
						baseSha = shaRes.stdout.trim();
						logger?.sandbox("sandbox git baseline captured", {
							root: watchRoot,
							baseSha
						});
					} else logger?.sandbox("sandbox git baseline unavailable (non-zero exit)", {
						root: watchRoot,
						exitCode: shaRes.exitCode,
						stderr: shaRes.stderr
					});
				} catch (error) {
					logger?.warn("sandbox git baseline capture failed", {
						root: watchRoot,
						error
					});
				}
				const workspace = definition.workspace;
				if (workspace !== void 0) {
					const virtualRoot = workspace.root ?? "/workspace";
					const root = resolveHarnessCwd(handle, virtualRoot);
					const workspaceHash = computeWorkspaceHash(workspace);
					const secrets = workspace.secrets;
					provideWorkspaceProjection(ctx, {
						skills: workspace.skills ?? [],
						plugins: workspace.plugins ?? [],
						resolveSecret: (ref) => {
							if (secrets === void 0) throw new Error(`resolveSecret: no secrets defined on this workspace (ref: "${ref.__secretName}")`);
							return resolveSecret(secrets, ref);
						},
						markerPath: `${root}/.tanstack-projected-${workspaceHash}`,
						root,
						...workspace.scripts !== void 0 ? { scripts: workspace.scripts } : {}
					});
				}
				const hooks = definition.hooks;
				await hooks?.onReady?.(handle);
				const fe = resolveFileEvents(definition.fileEvents);
				const pendingDiffs = state.pendingDiffs;
				let watcher;
				if (fe.enabled) {
					watcher = await watchWorkspace(handle, {
						onEvent: (event) => {
							const enriched = buildFileHookEvent(handle, watchRoot, baseSha, event, logger);
							dispatchDefinitionHooks(hooks, enriched, logger);
							runtime?.emit(enriched);
							if (fe.diff) pendingDiffs.push(enriched.diff().then((diff) => {
								runtime?.emitFileDiff({
									path: event.path,
									diff
								});
							}).catch((error) => {
								logger?.warn("sandbox file diff emit failed", {
									path: event.path,
									error
								});
							}));
						},
						root: watchRoot,
						...ctx.signal !== void 0 ? { signal: ctx.signal } : {},
						...logger !== void 0 ? { logger } : {}
					});
					logger?.sandbox("sandbox watcher started", {
						root: watchRoot,
						diff: fe.diff
					});
				}
				if (watcher) state.watcher = watcher;
			} catch (error) {
				await drainWatcher(state, "error");
				await stopSnapshotLease(state).catch(() => {});
				if (state.privateHandle) await definition.destroy(ensureCtx).catch(() => {});
				throw error;
			}
		},
		onConfig(_ctx, config) {
			const messages = stripObservedToolCalls(config.messages);
			if (messages.length === config.messages.length) return;
			return { messages };
		},
		onIteration(ctx) {
			runState.get(ctx)?.toolHistory.reconcile(ctx);
		},
		async onChunk(ctx, chunk) {
			const state = runState.get(ctx);
			state?.toolHistory.observe(chunk, ctx);
			if (state && chunk.type === "RUN_FINISHED" && chunk.outcome?.type === "interrupt") {
				state.interrupted = true;
				await drainWatcher(state, "pause");
				await stopSnapshotLease(state, { closePortable: true });
			}
		},
		async onFinish(ctx) {
			const state = runState.get(ctx);
			if (!state || state.interrupted) return;
			const { handle, ensureCtx } = state;
			state.toolHistory.reconcile(ctx);
			await drainWatcher(state, "finish");
			let primaryError;
			try {
				const snapshotCaptureTask = Promise.resolve().then(async () => {
					const config = state.snapshotConfig;
					const runtime = state.snapshotRuntime;
					const lease = state.snapshotLease;
					if (!config || !runtime || !handle || !lease) {
						if (state.snapshotLost) throw state.snapshotLost;
						return;
					}
					if (!canPublishPortableSnapshot(state, lease)) return;
					await runtime.completion.waitForRunCompletion();
					if (!canPublishPortableSnapshot(state, lease)) return;
					const conversation = await runtime.persistence.stores.messages.loadThread(ctx.threadId);
					if (!canPublishPortableSnapshot(state, lease)) return;
					const files = await captureSandboxFiles(handle, {
						blobs: config.persistence.stores.blobs,
						workspaceRoot: definition.workspace?.root ?? "/workspace"
					}, state.snapshotPolicy, definition.workspace?.secrets !== void 0 ? resolveAllSecrets(definition.workspace.secrets) : {});
					if (!canPublishPortableSnapshot(state, lease)) return;
					const artifacts = await captureSandboxArtifacts({
						blobs: config.persistence.stores.blobs,
						artifacts: config.persistence.stores.artifacts
					}, ctx.threadId, definition.workspace?.secrets !== void 0 ? resolveAllSecrets(definition.workspace.secrets) : {});
					if (!canPublishPortableSnapshot(state, lease)) return;
					const parentCheckpointId = await config.checkpoints.getHead(ctx.threadId);
					if (!canPublishPortableSnapshot(state, lease)) return;
					try {
						await config.checkpoints.append({
							checkpoint: {
								id: `checkpoint-${ctx.runId}`,
								threadId: ctx.threadId,
								parentCheckpointId,
								createdAt: Date.now(),
								reason: "automatic",
								sourceRunId: ctx.runId,
								files: files.files,
								conversation,
								artifacts
							},
							expectedHeadId: parentCheckpointId,
							writer: lease
						});
					} catch (error) {
						if (state.snapshotLost) throw state.snapshotLost;
						throw error;
					}
					if (state.snapshotLost) throw state.snapshotLost;
				});
				state.snapshotCaptureTask = snapshotCaptureTask;
				try {
					await snapshotCaptureTask;
				} finally {
					if (state.snapshotCaptureTask === snapshotCaptureTask) state.snapshotCaptureTask = void 0;
				}
				const lifecycle = definition.lifecycle;
				if (lifecycle?.snapshot === "after-run" && handle?.capabilities.snapshots && handle.snapshot) {
					const snapshot = await handle.snapshot(`after-run-${ctx.runId}`);
					const store = ensureCtx.store;
					if (store) {
						const key = definition.key(ensureCtx);
						const existing = await store.get(key);
						if (existing) await store.upsert({
							...existing,
							latestSnapshotId: snapshot.id,
							updatedAt: Date.now()
						});
					}
				}
				if (lifecycle?.destroyOnComplete) {
					await definition.destroy(ensureCtx);
					await definition.hooks?.onDestroy?.();
				}
			} catch (error) {
				primaryError = error;
				if (definition.lifecycle?.destroyOnComplete) try {
					await definition.destroy(ensureCtx);
					await definition.hooks?.onDestroy?.();
				} catch (cleanupError) {
					state.logger?.warn("sandbox destroy after terminal failure failed", {
						runId: ctx.runId,
						phase: "finish",
						error: cleanupError
					});
				}
			}
			let snapshotCleanupError;
			try {
				await stopSnapshotLease(state, { closePortable: true });
			} catch (error) {
				snapshotCleanupError = error;
			}
			if (primaryError !== void 0) {
				if (snapshotCleanupError !== void 0) state.logger?.warn("sandbox snapshot writer release failed", {
					runId: ctx.runId,
					phase: "finish",
					error: snapshotCleanupError
				});
				throw primaryError;
			}
			if (snapshotCleanupError !== void 0) throw snapshotCleanupError;
		},
		async onAbort(ctx, info) {
			const state = runState.get(ctx);
			if (!state) return;
			await drainWatcher(state, "abort");
			let releaseError;
			try {
				await stopSnapshotLease(state, { closePortable: true });
			} catch (error) {
				releaseError = error;
			}
			const durability = state.durability;
			const cancelled = await cancelIntent(durability, ctx.runId, info.cancelRequested === true);
			if (durability !== void 0 && !cancelled && durability.detachOnDisconnect) {
				if (await recordDetach(definition, state, durability, ctx, "abort")) {
					if (releaseError) throw releaseError;
					return;
				}
				await definition.destroy(state.ensureCtx);
				await definition.hooks?.onDestroy?.();
				if (releaseError) throw releaseError;
				return;
			}
			await definition.destroy(state.ensureCtx);
			await definition.hooks?.onDestroy?.();
			if (releaseError) throw releaseError;
		},
		async onError(ctx, info) {
			const state = runState.get(ctx);
			if (!state) return;
			await drainWatcher(state, "error");
			let releaseError;
			try {
				await stopSnapshotLease(state);
			} catch (error) {
				releaseError = error;
			}
			await definition.hooks?.onError?.(info.error);
			if (definition.lifecycle?.destroyOnComplete) {
				await definition.destroy(state.ensureCtx);
				await definition.hooks?.onDestroy?.();
			}
			if (releaseError) throw releaseError;
		}
	});
}
//#endregion
export { withSandbox };

//# sourceMappingURL=middleware.js.map