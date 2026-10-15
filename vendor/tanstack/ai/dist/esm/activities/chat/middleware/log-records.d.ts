/**
 * Appends records to the durable session log of this run. A host with a
 * session log provides it, for example a durable harness session. The host
 * checks the records, writes them at once, and folds them into the context.
 */
export interface LogRecordsWriter {
    append: (records: ReadonlyArray<{
        type: string;
    } & Record<string, unknown>>) => Promise<void>;
}
export declare const LogRecordsCapability: import('./capabilities.js').Capability<LogRecordsWriter, "log-records">;
export declare const getLogRecords: import('./capabilities.js').CapabilityGetter<LogRecordsWriter>, provideLogRecords: import('./capabilities.js').CapabilityProvider<LogRecordsWriter>;
