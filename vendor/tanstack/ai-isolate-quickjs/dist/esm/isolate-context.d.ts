import { QuickJSContext } from 'quickjs-emscripten';
import { ExecutionResult, IsolateContext } from '@tanstack/ai-code-mode';
/**
 * Execution state shared with the tool bindings created in the driver.
 * `deadline === 0` means no execution is active, so any guest job that runs
 * outside execute() is interrupted immediately. `pendingCancels` holds one
 * cancel callback per tool call still awaiting its host promise; a timed-out
 * execution invokes them to settle the guest program so the VM can be
 * disposed safely.
 */
export interface ExecState {
    deadline: number;
    pendingCancels: Set<() => void>;
}
/**
 * IsolateContext implementation using QuickJS WASM
 */
export declare class QuickJSIsolateContext implements IsolateContext {
    private readonly vm;
    private readonly logs;
    private readonly timeout;
    private readonly execState;
    /** Serializes execute() calls so evaluations on this VM never interleave. */
    private execQueue;
    private disposed;
    private executing;
    constructor(vm: QuickJSContext, logs: Array<string>, timeout: number, execState: ExecState);
    execute<T = unknown>(code: string): Promise<ExecutionResult<T>>;
    dispose(): Promise<void>;
}
