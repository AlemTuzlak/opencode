import { RunStore } from '@tanstack/ai';
/** Factory for the store under test. A fresh one per case keeps them isolated. */
export type MakeRunStore = () => RunStore | Promise<RunStore>;
export declare function runDurableRunFieldsConformance(name: string, makeStore: MakeRunStore): void;
