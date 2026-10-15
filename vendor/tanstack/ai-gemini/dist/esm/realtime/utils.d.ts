import { GeminiLiveClient } from './client.js';
export declare function base64ToArrayBuffer(base64: string): ArrayBuffer;
export declare class AudioStreamer {
    private audioContext;
    private audioWorklet;
    private mediaStream;
    private analyser;
    private isStreaming;
    private readonly sampleRate;
    private readonly client;
    constructor(client: GeminiLiveClient);
    get inputLevel(): number;
    get inputFrequencyData(): Uint8Array<ArrayBuffer>;
    get inputTimeDomainData(): Uint8Array<ArrayBuffer>;
    get inputSampleRate(): number;
    start(): Promise<void>;
    stop(): void;
    startAudioCapture(): void;
    stopAudioCapture(): void;
    private convertToPCM16;
    private arrayBufferToBase64;
}
export declare class AudioPlayer {
    private audioContext;
    private workletNode;
    private gainNode;
    private analyser;
    private isInitialized;
    private volume;
    private readonly sampleRate;
    get outputLevel(): number;
    get outputFrequencyData(): Uint8Array<ArrayBuffer>;
    get outputTimeDomainData(): Uint8Array<ArrayBuffer>;
    get outputSampleRate(): number;
    init(): Promise<void>;
    play(pcmData: ArrayBuffer): Promise<void>;
    interrupt(): void;
    setVolume(volume: number): void;
    destroy(): void;
}
