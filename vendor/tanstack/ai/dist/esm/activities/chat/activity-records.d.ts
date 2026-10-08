import { ActivityRecord, StreamChunk, UIMessage } from '../../types.js';
export declare function activityRecordToUIMessage(record: ActivityRecord): UIMessage;
/**
 * Insert activity rows into a model-derived UI transcript at each record's
 * stored `index`. Earlier records are inserted first so later indexes stay
 * aligned with the growing list.
 */
export declare function interleaveActivityRecords(modelUI: Array<UIMessage>, records: Array<ActivityRecord>): Array<UIMessage>;
/**
 * Collect inbound `role: 'activity'` messages: a UIMessage with an activity
 * part, or an AG-UI `ActivityMessage`. `index` is the position in the
 * original inbound list so reconstruct can put them back.
 */
export declare function peelInboundActivities(messages: ReadonlyArray<{
    role?: string;
    id?: string;
    parts?: UIMessage['parts'];
    metadata?: unknown;
    activityType?: unknown;
    content?: unknown;
    subagentRunId?: unknown;
}>): Array<ActivityRecord>;
export declare function applyActivitySnapshotToUIMessages(messages: Array<UIMessage>, chunk: Extract<StreamChunk, {
    type: 'ACTIVITY_SNAPSHOT';
}>): Array<UIMessage>;
export declare function applyActivityDeltaToUIMessages(messages: Array<UIMessage>, chunk: Extract<StreamChunk, {
    type: 'ACTIVITY_DELTA';
}>): Array<UIMessage>;
export declare function applyActivitySnapshotToRecords(records: Array<ActivityRecord>, chunk: Extract<StreamChunk, {
    type: 'ACTIVITY_SNAPSHOT';
}>, nextIndex: number): Array<ActivityRecord>;
export declare function applyActivityDeltaToRecords(records: Array<ActivityRecord>, chunk: Extract<StreamChunk, {
    type: 'ACTIVITY_DELTA';
}>): Array<ActivityRecord>;
