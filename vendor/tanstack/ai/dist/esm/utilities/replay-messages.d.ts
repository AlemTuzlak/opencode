import { MessageSource, ModelMessage } from '../types.js';
export type ReplayToolIdRule = (id: string, context: {
    foreign: boolean;
    source: MessageSource | undefined;
    attempt: number;
}) => string;
export interface ReplayMessages {
    messages: Array<ModelMessage>;
    /** Index of each original boundary in the request, including the end boundary. */
    boundaryMap: Array<number>;
}
/** The pi shortHash algorithm, over UTF-16 code units. */
export declare function hashToolCallId(id: string): string;
/** Build a provider request without changing stored history. An absent target only cleans history. */
export declare function transformMessagesForReplay(original: ReadonlyArray<ModelMessage>, target?: MessageSource, toolIdRule?: ReplayToolIdRule): ReplayMessages;
