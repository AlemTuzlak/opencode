//#region src/realtime/utils.ts
/**
* Audio Worklet Processor for capturing and processing audio
*/
var captureWorkletCode = `
class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 512; // 32ms at 16kHz — per Gemini best practices (20-40ms chunks)
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];

    if (input && input.length > 0) {
      const inputChannel = input[0];

      // Buffer the incoming audio
      for (let i = 0; i < inputChannel.length; i++) {
        this.buffer[this.bufferIndex++] = inputChannel[i];

        // When buffer is full, send it to main thread
        if (this.bufferIndex >= this.bufferSize) {
          // Send the buffered audio to the main thread
          this.port.postMessage({
            type: "audio",
            data: this.buffer.slice(),
          });

          // Reset buffer
          this.bufferIndex = 0;
        }
      }
    }

    // Return true to keep the processor alive
    return true;
  }
}

// Register the processor
registerProcessor("audio-capture-processor", AudioCaptureProcessor);`;
/**
* Audio Playback Worklet Processor for playing PCM audio.
* Uses an offset tracker instead of slice() to avoid allocations
* on the real-time audio thread.
*/
var playbackWorkletCode = `
class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.audioQueue = [];
    this.currentOffset = 0; // Track position in current buffer (avoids slice())

    this.port.onmessage = (event) => {
      if (event.data === "interrupt") {
        // Clear the queue on interrupt
        this.audioQueue = [];
        this.currentOffset = 0;
      } else if (event.data instanceof Float32Array) {
        // Add audio data to the queue
        this.audioQueue.push(event.data);
      }
    };
  }

  process(inputs, outputs, parameters) {
    const output = outputs[0];
    if (output.length === 0) return true;

    const channel = output[0];
    let outputIndex = 0;

    // Fill the output buffer from the queue
    while (outputIndex < channel.length && this.audioQueue.length > 0) {
      const currentBuffer = this.audioQueue[0];

      if (!currentBuffer || currentBuffer.length === 0) {
        this.audioQueue.shift();
        this.currentOffset = 0;
        continue;
      }

      const remainingOutput = channel.length - outputIndex;
      const remainingBuffer = currentBuffer.length - this.currentOffset;
      const copyLength = Math.min(remainingOutput, remainingBuffer);

      // Copy audio data to output using offset (no slice allocation)
      for (let i = 0; i < copyLength; i++) {
        channel[outputIndex++] = currentBuffer[this.currentOffset++];
      }

      // If we've consumed the entire buffer, move to the next one
      if (this.currentOffset >= currentBuffer.length) {
        this.audioQueue.shift();
        this.currentOffset = 0;
      }
    }

    // Fill remaining output with silence
    while (outputIndex < channel.length) {
      channel[outputIndex++] = 0;
    }

    return true;
  }
}

registerProcessor("pcm-processor", PCMProcessor);`;
function calculateLevel(analyser) {
	const data = new Uint8Array(analyser.fftSize);
	analyser.getByteTimeDomainData(data);
	let maxDeviation = 0;
	for (const sample of data) {
		const deviation = Math.abs(sample - 128);
		if (deviation > maxDeviation) maxDeviation = deviation;
	}
	const normalized = maxDeviation / 128;
	return Math.min(1, normalized * 1.5);
}
function base64ToArrayBuffer(base64) {
	const binary = atob(base64);
	return Uint8Array.from(binary, (char) => char.charCodeAt(0)).buffer;
}
var emptyFrequencyData = /* @__PURE__ */ new Uint8Array(1024);
var emptyTimeDomainData = (/* @__PURE__ */ new Uint8Array(2048)).fill(128);
var AudioStreamer = class {
	audioContext = null;
	audioWorklet = null;
	mediaStream = null;
	analyser = null;
	isStreaming = false;
	sampleRate = 16e3;
	client = null;
	constructor(client) {
		this.client = client;
	}
	get inputLevel() {
		if (!this.analyser) return 0;
		return calculateLevel(this.analyser);
	}
	get inputFrequencyData() {
		if (!this.analyser) return emptyFrequencyData;
		const data = new Uint8Array(this.analyser.frequencyBinCount);
		this.analyser.getByteFrequencyData(data);
		return data;
	}
	get inputTimeDomainData() {
		if (!this.analyser) return emptyTimeDomainData;
		const data = new Uint8Array(this.analyser.fftSize);
		this.analyser.getByteTimeDomainData(data);
		return data;
	}
	get inputSampleRate() {
		return this.sampleRate;
	}
	async start() {
		try {
			const audioConstraints = {
				sampleRate: this.sampleRate,
				echoCancellation: true,
				noiseSuppression: true,
				autoGainControl: true
			};
			this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
			if ((this.mediaStream.getAudioTracks()[0]?.getSettings())?.autoGainControl) console.warn("Native AGC not supported.");
			this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
			if (this.audioContext.state === "suspended") await this.audioContext.resume();
			const workletBlob = new Blob([captureWorkletCode], { type: "application/javascript" });
			const workletUrl = URL.createObjectURL(workletBlob);
			await this.audioContext.audioWorklet.addModule(workletUrl);
			URL.revokeObjectURL(workletUrl);
			this.audioWorklet = new AudioWorkletNode(this.audioContext, "audio-capture-processor");
			this.audioWorklet.port.onmessage = (event) => {
				if (!this.isStreaming) return;
				if (event.data.type === "audio") {
					const inputData = event.data.data;
					const pcmData = this.convertToPCM16(inputData);
					const base64Audio = this.arrayBufferToBase64(pcmData);
					if (this.client?.isSetupComplete) this.client.sendAudioMessage(base64Audio);
				}
			};
			this.analyser = this.audioContext.createAnalyser();
			this.analyser.fftSize = 2048;
			this.analyser.smoothingTimeConstant = .3;
			this.audioContext.createMediaStreamSource(this.mediaStream).connect(this.analyser);
			this.analyser.connect(this.audioWorklet);
			this.isStreaming = true;
		} catch (error) {
			this.stop();
			throw error;
		}
	}
	stop() {
		this.isStreaming = false;
		if (this.audioWorklet) {
			this.audioWorklet.disconnect();
			this.audioWorklet.port.close();
			this.audioWorklet = null;
		}
		if (this.audioContext) {
			this.audioContext.close();
			this.audioContext = null;
		}
		if (this.mediaStream) {
			this.mediaStream.getTracks().forEach((track) => track.stop());
			this.mediaStream = null;
		}
	}
	startAudioCapture() {
		if (this.mediaStream) for (const track of this.mediaStream.getAudioTracks()) track.enabled = true;
		this.isStreaming = true;
	}
	stopAudioCapture() {
		if (this.mediaStream) for (const track of this.mediaStream.getAudioTracks()) track.enabled = false;
		this.isStreaming = false;
	}
	convertToPCM16(float32Array) {
		const int16Array = new Int16Array(float32Array.length);
		for (let i = 0; i < float32Array.length; i++) {
			const sample = Math.max(-1, Math.min(1, float32Array[i] ?? 0));
			int16Array[i] = sample * 32767;
		}
		return int16Array.buffer;
	}
	arrayBufferToBase64(buffer) {
		const bytes = new Uint8Array(buffer);
		const binary = String.fromCharCode(...bytes);
		return btoa(binary);
	}
};
var AudioPlayer = class {
	audioContext = null;
	workletNode = null;
	gainNode = null;
	analyser = null;
	isInitialized = false;
	volume = 1;
	sampleRate = 24e3;
	get outputLevel() {
		if (!this.analyser) return 0;
		return calculateLevel(this.analyser);
	}
	get outputFrequencyData() {
		if (!this.analyser) return emptyFrequencyData;
		const data = new Uint8Array(this.analyser.frequencyBinCount);
		this.analyser.getByteFrequencyData(data);
		return data;
	}
	get outputTimeDomainData() {
		if (!this.analyser) return emptyTimeDomainData;
		const data = new Uint8Array(this.analyser.fftSize);
		this.analyser.getByteTimeDomainData(data);
		return data;
	}
	get outputSampleRate() {
		return this.sampleRate;
	}
	async init() {
		if (this.isInitialized) return;
		try {
			this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
			const workletBlob = new Blob([playbackWorkletCode], { type: "application/javascript" });
			const workletUrl = URL.createObjectURL(workletBlob);
			await this.audioContext.audioWorklet.addModule(workletUrl);
			URL.revokeObjectURL(workletUrl);
			this.workletNode = new AudioWorkletNode(this.audioContext, "pcm-processor");
			this.gainNode = this.audioContext.createGain();
			this.gainNode.gain.value = this.volume;
			this.analyser = this.audioContext.createAnalyser();
			this.analyser.fftSize = 2048;
			this.analyser.smoothingTimeConstant = .3;
			this.workletNode.connect(this.gainNode);
			this.gainNode.connect(this.analyser);
			this.analyser.connect(this.audioContext.destination);
			this.isInitialized = true;
		} catch (error) {
			this.destroy();
			throw error;
		}
	}
	async play(pcmData) {
		if (!this.isInitialized) await this.init();
		if (this.audioContext?.state === "suspended") await this.audioContext.resume();
		const inputArray = new Int16Array(pcmData);
		const float32Data = new Float32Array(inputArray.length);
		for (let i = 0; i < inputArray.length; i++) float32Data[i] = (inputArray[i] ?? 0) / 32768;
		this.workletNode?.port.postMessage(float32Data);
	}
	interrupt() {
		if (this.workletNode) this.workletNode.port.postMessage("interrupt");
	}
	setVolume(volume) {
		this.volume = Math.max(0, Math.min(1, volume));
		if (this.gainNode) this.gainNode.gain.value = this.volume;
	}
	destroy() {
		if (this.audioContext) {
			this.audioContext.close();
			this.audioContext = null;
		}
		this.isInitialized = false;
	}
};
//#endregion
export { AudioPlayer, AudioStreamer, base64ToArrayBuffer };

//# sourceMappingURL=utils.js.map