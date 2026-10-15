import { defineRunStore, isTerminalRunStatus as isTerminalRunStatus$1 } from "@tanstack/ai";
//#region src/types.ts
/** Type a {@link MessageStore} implementation inline. */
function defineMessageStore(store) {
	return store;
}
/** Type an {@link ActivityStore} implementation inline. */
function defineActivityStore(store) {
	return store;
}
/** Type an {@link InterruptStore} implementation inline. */
function defineInterruptStore(store) {
	return store;
}
/** Type a {@link MetadataStore} implementation inline. */
function defineMetadataStore(store) {
	return store;
}
/** Type an {@link InboxStore} implementation inline. */
function defineInboxStore(store) {
	return store;
}
/**
* The error {@link LogStore.append} rejects with when `seq` is not the next
* free position of the thread. It means that another writer appended first.
* Nothing of the rejected batch is written.
*/
var LogConflictError = class extends Error {
	threadId;
	seq;
	constructor(threadId, seq) {
		super(`Log conflict on thread ${JSON.stringify(threadId)}: position ${seq} is not the next free position.`);
		this.name = "LogConflictError";
		this.threadId = threadId;
		this.seq = seq;
	}
};
/** Type a {@link LogStore} implementation inline. */
function defineLogStore(store) {
	return store;
}
/**
* Type a {@link WorkClaimStore} implementation inline.
*
* @param store - The store implementation.
* @example
* const workClaims = defineWorkClaimStore({ claim, release, listExpired })
*/
function defineWorkClaimStore(store) {
	return store;
}
/** Type a {@link SessionIndexStore} implementation inline. */
function defineSessionIndexStore(store) {
	return store;
}
/** Type a {@link CredentialStore} implementation inline. */
function defineCredentialStore(store) {
	return store;
}
/** Type a {@link GenerationRunStore} implementation inline. */
function defineGenerationRunStore(store) {
	return store;
}
/** Type an {@link ArtifactStore} implementation inline. */
function defineArtifactStore(store) {
	return store;
}
/** Type a {@link BlobStore} implementation inline. */
function defineBlobStore(store) {
	return store;
}
var storeKeys = [
	"messages",
	"activities",
	"runs",
	"generationRuns",
	"interrupts",
	"metadata",
	"artifacts",
	"blobs",
	"inbox",
	"credentials",
	"log",
	"leases",
	"workClaims",
	"sessions"
];
var storeKeySet = new Set(storeKeys);
function assertKnownStoreKeys(stores, location) {
	for (const key of Object.keys(stores)) if (!storeKeySet.has(key)) throw new Error(`Unknown AIPersistence ${location} key: ${key}`);
}
function validatePersistenceStoreKeys(persistence) {
	assertKnownStoreKeys(persistence.stores, "store");
}
/**
* Chat middleware entrypoint rules:
* - `messages` is required (chat persistence means a durable transcript)
* - `interrupts` requires `runs` (interrupt records are run-scoped)
*/
function validateChatPersistenceStores(persistence) {
	validatePersistenceStoreKeys(persistence);
	if (!persistence.stores.messages) throw new Error("Chat persistence requires stores.messages.");
	if (persistence.stores.interrupts && !persistence.stores.runs) throw new Error("Chat persistence stores.interrupts requires stores.runs.");
}
/**
* Generation middleware entrypoint rule: `generationRuns` is required (the
* generation run lifecycle is keyed on its own `runId`, not a chat conversation
* `threadId`). When artifact persistence is used, `artifacts` and `blobs` must
* be provided together.
*/
function validateGenerationPersistenceStores(persistence) {
	validatePersistenceStoreKeys(persistence);
	if (persistence.stores.artifacts !== void 0 !== (persistence.stores.blobs !== void 0)) throw new Error("Generation artifact persistence requires both stores.artifacts and stores.blobs.");
	if (!persistence.stores.generationRuns) throw new Error("Generation persistence requires stores.generationRuns.");
}
/**
* Server hydrate entrypoint rule: `messages` is required.
*/
function validateReconstructChatStores(persistence) {
	validatePersistenceStoreKeys(persistence);
	if (!persistence.stores.messages) throw new Error("reconstructChat requires stores.messages.");
}
/**
* Server hydrate entrypoint rule for generation: `generationRuns` is required.
* The run store resolves the latest generation for a thread (or a specific run
* id), so a server-authoritative client can hydrate the last generation's
* status, result, and artifact refs on load.
*/
function validateReconstructGenerationStores(persistence) {
	validatePersistenceStoreKeys(persistence);
	if (!persistence.stores.generationRuns) throw new Error("reconstructGeneration requires stores.generationRuns.");
}
function defineAIPersistence(persistence) {
	validatePersistenceStoreKeys(persistence);
	return persistence;
}
function composePersistence(base, config) {
	validatePersistenceStoreKeys(base);
	assertKnownStoreKeys(config.overrides, "override");
	const stores = { ...base.stores };
	for (const key of storeKeys) {
		if (!Object.prototype.hasOwnProperty.call(config.overrides, key)) continue;
		const override = config.overrides[key];
		if (override === false) delete stores[key];
		else if (override !== void 0) setStore(stores, key, override);
	}
	return { stores };
}
function setStore(stores, key, value) {
	stores[key] = value;
}
//#endregion
export { LogConflictError, composePersistence, defineAIPersistence, defineActivityStore, defineArtifactStore, defineBlobStore, defineCredentialStore, defineGenerationRunStore, defineInboxStore, defineInterruptStore, defineLogStore, defineMessageStore, defineMetadataStore, defineRunStore, defineSessionIndexStore, defineWorkClaimStore, isTerminalRunStatus$1 as isTerminalRunStatus, validateChatPersistenceStores, validateGenerationPersistenceStores, validatePersistenceStoreKeys, validateReconstructChatStores, validateReconstructGenerationStores };

//# sourceMappingURL=types.js.map