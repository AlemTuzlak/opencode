import { FunctionResponse, LiveClientMessage, LiveServerGoAway, LiveServerMessage, LiveServerSessionResumptionUpdate, LiveServerToolCall, UsageMetadata } from '@google/genai';
import { AnyClientTool, RealtimeSessionConfig, RealtimeToken } from '@tanstack/ai';
import { GeminiRealtimeModel } from './types.js';
interface LiveResponsePayloads {
    text: string;
    thought: string;
    audio: {
        audioData: string;
        transcript: string;
    };
    setup_complete: string;
    interrupted: string;
    turn_complete: string;
    tool_call: LiveServerToolCall;
    session_resumption_update: LiveServerSessionResumptionUpdate;
    go_away: LiveServerGoAway;
    usage_metadata: UsageMetadata;
    error: string;
    input_transcription: {
        text: string;
        finished: boolean;
    };
    output_transcription: {
        text: string;
        finished: boolean;
    };
}
export type MultimodalLiveResponseType = keyof LiveResponsePayloads;
export type LiveResponse = {
    [K in MultimodalLiveResponseType]: {
        type: K;
        data: LiveResponsePayloads[K];
        endOfTurn: boolean;
    };
}[MultimodalLiveResponseType];
/**
 * Parses response messages from the Gemini Live API
 */
/**
 * Parses ALL response types from a single server message.
 * The server can now bundle multiple fields (e.g. audio + transcription)
 * in the same message. Returns an array of response objects.
 */
export declare function parseResponseMessages(data: LiveServerMessage): Array<LiveResponse>;
export declare class GeminiLiveClient {
    private token;
    private model;
    private readonly responseModalities;
    private systemInstructions;
    private googleGrounding;
    private voiceName;
    private temperature;
    private inputAudioTranscription;
    private outputAudioTranscription;
    private contextWindowCompression;
    private proactiveAudio;
    private enableAffectiveDialog;
    private thinkingConfig;
    private speechLanguageCode;
    private maxOutputTokens;
    private functionDeclarations;
    private readonly automaticActivityDetection;
    private readonly activityHandling;
    private webSocket;
    private lastResumptionUpdate;
    private setupComplete;
    private connected;
    onReceiveResponse: (response: LiveResponse) => void;
    onOpen: () => void;
    onClose: () => void;
    onError: (error: Error) => void;
    constructor(token: string, model: GeminiRealtimeModel, tools?: ReadonlyArray<AnyClientTool>);
    get isConnected(): boolean;
    get isSetupComplete(): boolean;
    /**
     * Connection management
     */
    connect(): Promise<void>;
    disconnect(): void;
    /**
     * Session management
     */
    sendInitialSetupMessage(resume?: boolean): void;
    restartSession(resume?: boolean): Promise<void>;
    updateToken(token: RealtimeToken): void;
    updateSession(config: Partial<RealtimeSessionConfig>): Promise<void>;
    /**
     * Message transmission & receiving
     */
    sendMessage(message: LiveClientMessage): void;
    onReceiveMessage(messageEvent: MessageEvent): Promise<void>;
    sendRealtimeInputMessage(data: string, mimeType: string): void;
    sendAudioMessage(base64PCM: string): void;
    sendImageMessage(base64: string, mimeType?: string): void;
    sendTextMessage(text: string): void;
    sendToolResponse(functionResponses: Array<FunctionResponse>): void;
}
export {};
