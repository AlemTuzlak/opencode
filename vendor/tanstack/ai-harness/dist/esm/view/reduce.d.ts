import { Interrupt, ModelMessage } from '@tanstack/ai';
import { SessionDescription, SessionSnapshot } from '../session.js';
import { SessionEvent } from '../types.js';
import { Approval, ClientToolCall, MediaPart, NoticeKind, SessionViewState, ToolCallPart, ViewAgent, ViewMessage, ViewQuestion } from './types.js';
/** Makes the items that carry actions. The view owns the actions. */
export interface ItemFactory {
    approval: (interrupt: Interrupt, call: ToolCallPart | undefined) => Approval;
    clientTool: (interrupt: Interrupt, call: ToolCallPart | undefined) => ClientToolCall;
    question: (question: SessionSnapshot['pendingQuestions'][number]) => ViewQuestion;
    agent: (operation: {
        id: string;
        name: string;
    }) => ViewAgent;
}
/** The state of a view before it reads anything from its session. */
export declare function emptyState(): SessionViewState;
/** The fields of a media part that come from its record. */
type MediaInfo = Omit<MediaPart, 'type' | 'url' | 'load'>;
/** The notice text for a refused input. */
export declare const notAccepted: (reason: unknown) => string;
/** Add a notice line at the end of the messages. */
export declare function withNotice(state: SessionViewState, kind: NoticeKind, text: string): SessionViewState;
/** Add a user message, with the files the user sent, at the end of the messages. */
export declare function withUserMessage(state: SessionViewState, text: string, media?: ReadonlyArray<MediaInfo>): SessionViewState;
/** Fold one session event into the state. Returns `state` when nothing changes. */
export declare function applyEvent(state: SessionViewState, entry: SessionEvent): SessionViewState;
/** `old` when `next` holds the same items, so selectors see no change. */
export declare function keep<T>(old: Array<T>, next: Array<T>): Array<T>;
/**
 * Take status, approvals, client tools, questions, background agents, and
 * waiting inputs from a snapshot. Plugin state is taken only for the first
 * snapshot. Later changes come as `STATE_SNAPSHOT` events. Returns `state`
 * when nothing changes.
 */
export declare function applySnapshot(state: SessionViewState, snapshot: SessionSnapshot, factory: ItemFactory, options?: {
    initial?: boolean;
}): SessionViewState;
/** Take the commands, config entries, and tools from a session description. */
export declare function applyDescription(state: SessionViewState, description: SessionDescription): SessionViewState;
/**
 * Messages for a saved transcript. Tool results fill in their tool calls.
 * The media a turn made (`metadata.harness.media`) goes at the end of its
 * assistant message.
 */
export declare function messagesFromTranscript(messages: ReadonlyArray<ModelMessage>): Array<ViewMessage>;
export {};
