import { ModelMessage, TokenUsage } from '@tanstack/ai';
import { CompactionReason } from './index.js';
/** The log record type of a durable compaction. */
export declare const COMPACTION_RECORD_TYPE = "tanstack.compaction";
/**
 * One durable compaction, as a host log record. Fold it into the model
 * context with {@link projectCompaction}. It is a type, not an interface, so
 * it fits the record shape of `LogRecordsWriter.append`.
 */
export type CompactionRecord = {
    type: typeof COMPACTION_RECORD_TYPE;
    reason: CompactionReason;
    tokensBefore: number;
    tokensAfter: number;
    usage?: TokenUsage;
    /** The messages before `from` were replaced by `head`. */
    head: Array<ModelMessage>;
    from: number;
    /** The id of the first kept message, when it has one. Checked before `from`. */
    firstKeptId?: string;
};
/**
 * The record of a compaction from `before` to `after`: the new head, and the
 * index in `before` where the kept tail starts. When `after` does not end with
 * the tail of `before`, the head is all of `after`, and `from` is the end of
 * `before`.
 */
export declare function compactionRecord(input: {
    reason: CompactionReason;
    before: ReadonlyArray<ModelMessage>;
    after: Array<ModelMessage>;
    tokensBefore: number;
    tokensAfter: number;
    usage?: TokenUsage;
}): CompactionRecord;
/**
 * Fold a compaction record into the model context. Give it to the host:
 * `createHarnessHost({ project: { record: projectCompaction } })`. Returns
 * `undefined` for a record of another type, and for a record that this fold
 * cannot use. Pure: the same log always folds to the same context.
 */
export declare function projectCompaction(input: {
    messages: ReadonlyArray<ModelMessage>;
    record: {
        type: string;
        [key: string]: unknown;
    };
}): Array<ModelMessage> | undefined;
