import { createCapability } from "@tanstack/ai";
//#region src/capabilities.ts
/**
* Persistence capability tokens.
*
* `withPersistence` PROVIDES persistence/interrupts so later middleware can
* read durable chat state. Locks live in `@tanstack/ai/locks` (`withLocks`).
*/
var PersistenceCapability = createCapability()("persistence");
var InterruptsCapability = createCapability()("persistence.interrupts");
var PersistenceCompletionCapability = createCapability()("persistence.completion");
var [getPersistence, providePersistence] = PersistenceCapability;
var [getInterrupts, provideInterrupts] = InterruptsCapability;
var [getPersistenceCompletion, providePersistenceCompletion] = PersistenceCompletionCapability;
//#endregion
export { InterruptsCapability, PersistenceCapability, PersistenceCompletionCapability, getInterrupts, getPersistence, getPersistenceCompletion, provideInterrupts, providePersistence, providePersistenceCompletion };

//# sourceMappingURL=capabilities.js.map