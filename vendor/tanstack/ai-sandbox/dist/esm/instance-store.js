import { createCapability } from "@tanstack/ai";
//#region src/instance-store.ts
/**
* Durable sandbox **instance** map — which provider sandbox (and snapshot) to
* resume for a compound key. Owned by `@tanstack/ai-sandbox` (not chat
* persistence): domain is runtime placement for `ensure`, not conversation state.
*
* Pass to `withSandbox(sandbox, { instances })`, which uses it in `ensure`
* (in-memory fallback when absent). {@link SandboxInstanceStoreCapability} is
* the ambient alternative for platform-level wiring.
*/
/**
* Type a {@link SandboxInstanceStore} implementation inline: pass the object and
* get autocomplete + contract checking, with no separate
* `: SandboxInstanceStore` annotation. Hand the result to
* `withSandbox(sandbox, { instances })`. Matches `defineLock` /
* `defineMessageStore` style helpers elsewhere in the monorepo.
*/
function defineSandboxInstanceStore(store) {
	return store;
}
/**
* Capability for the instance map — the ambient alternative to
* `withSandbox(sandbox, { instances })`. Provide it from any middleware with
* {@link provideSandboxInstanceStore}; `withSandbox` reads it when no explicit
* option was passed.
*/
var SandboxInstanceStoreCapability = createCapability()("sandbox-instance-store");
/** Destructured accessors: `getSandboxInstanceStore` / `provideSandboxInstanceStore`. */
var [getSandboxInstanceStore, provideSandboxInstanceStore] = SandboxInstanceStoreCapability;
/** In-memory {@link SandboxInstanceStore}. Resume works only within one process. */
var InMemorySandboxInstanceStore = class {
	map = /* @__PURE__ */ new Map();
	get(key) {
		return Promise.resolve(this.map.get(key) ?? null);
	}
	upsert(record) {
		this.map.set(record.key, record);
		return Promise.resolve();
	}
	delete(key) {
		this.map.delete(key);
		return Promise.resolve();
	}
};
/**
* Wiring note: hand the store straight to the consumer —
* `withSandbox(sandbox, { instances: store })`. That cannot be mis-ordered,
* unlike a separate provider middleware composed after `withSandbox` (which
* silently degrades to the in-memory fallback).
*
* ```ts
* middleware: [
*   withLocks(locks), // from @tanstack/ai/locks — multi-replica
*   withSandbox(sandbox, { instances: instanceStore }),
* ]
* ```
*
* For ambient/platform wiring (a hosting layer injecting infra without touching
* the call site), any middleware may still
* `provideSandboxInstanceStore(ctx, store)` on the capability bus; an explicit
* option takes precedence over it.
*/
//#endregion
export { InMemorySandboxInstanceStore, SandboxInstanceStoreCapability, defineSandboxInstanceStore, getSandboxInstanceStore, provideSandboxInstanceStore };

//# sourceMappingURL=instance-store.js.map