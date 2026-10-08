import { AIPersistence, InterruptStore } from './types.js';
export interface PersistenceCompletion {
    /** Resolves after successful terminal persistence, or rejects with the original run error or abort reason after terminal persistence settles. */
    waitForRunCompletion: () => Promise<void>;
}
export declare const PersistenceCapability: import('@tanstack/ai').Capability<AIPersistence<import('./types.js').AIPersistenceStores>, "persistence">;
export declare const InterruptsCapability: import('@tanstack/ai').Capability<InterruptStore, "persistence.interrupts">;
export declare const PersistenceCompletionCapability: import('@tanstack/ai').Capability<PersistenceCompletion, "persistence.completion">;
export declare const getPersistence: import('@tanstack/ai').CapabilityGetter<AIPersistence<import('./types.js').AIPersistenceStores>>, providePersistence: import('@tanstack/ai').CapabilityProvider<AIPersistence<import('./types.js').AIPersistenceStores>>;
export declare const getInterrupts: import('@tanstack/ai').CapabilityGetter<InterruptStore>, provideInterrupts: import('@tanstack/ai').CapabilityProvider<InterruptStore>;
export declare const getPersistenceCompletion: import('@tanstack/ai').CapabilityGetter<PersistenceCompletion>, providePersistenceCompletion: import('@tanstack/ai').CapabilityProvider<PersistenceCompletion>;
