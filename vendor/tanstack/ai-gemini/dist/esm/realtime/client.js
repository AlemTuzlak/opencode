import { ActivityHandling, EndSensitivity, Modality, StartSensitivity, TurnCoverage } from "@google/genai";
import { convertSchemaToJsonSchema } from "@tanstack/ai";
//#region src/realtime/client.ts
/** Build a Gemini FunctionDeclaration from an isomorphic client tool (Zod). */
function clientToolToDeclaration(tool) {
	return {
		name: tool.name,
		description: tool.description,
		parametersJsonSchema: convertSchemaToJsonSchema(tool.inputSchema),
		responseJsonSchema: convertSchemaToJsonSchema(tool.outputSchema)
	};
}
/** Build a Gemini FunctionDeclaration from an already-serialized tool config. */
function toolConfigToDeclaration(tool) {
	return {
		name: tool.name,
		description: tool.description,
		parametersJsonSchema: tool.inputSchema,
		responseJsonSchema: tool.outputSchema
	};
}
/**
* Parses response messages from the Gemini Live API
*/
/**
* Parses ALL response types from a single server message.
* The server can now bundle multiple fields (e.g. audio + transcription)
* in the same message. Returns an array of response objects.
*/
function parseResponseMessages(data) {
	const responses = [];
	const serverContent = data.serverContent;
	const parts = serverContent?.modelTurn?.parts;
	if (data.setupComplete) {
		responses.push({
			type: "setup_complete",
			data: "",
			endOfTurn: false
		});
		return responses;
	}
	if (data.toolCall) {
		responses.push({
			type: "tool_call",
			data: data.toolCall,
			endOfTurn: false
		});
		return responses;
	}
	if (data.sessionResumptionUpdate) responses.push({
		type: "session_resumption_update",
		data: data.sessionResumptionUpdate,
		endOfTurn: false
	});
	if (data.goAway) responses.push({
		type: "go_away",
		data: data.goAway,
		endOfTurn: false
	});
	if (data.usageMetadata) responses.push({
		type: "usage_metadata",
		data: data.usageMetadata,
		endOfTurn: false
	});
	if (parts?.length) {
		for (const part of parts) if (part.inlineData?.data) responses.push({
			type: "audio",
			data: {
				audioData: part.inlineData.data,
				transcript: ""
			},
			endOfTurn: false
		});
		else if (part.text) responses.push({
			type: part.thought ? "thought" : "text",
			data: part.text,
			endOfTurn: false
		});
	}
	if (serverContent?.inputTranscription) responses.push({
		type: "input_transcription",
		data: {
			text: serverContent.inputTranscription.text || "",
			finished: serverContent.inputTranscription.finished || false
		},
		endOfTurn: false
	});
	if (serverContent?.outputTranscription) responses.push({
		type: "output_transcription",
		data: {
			text: serverContent.outputTranscription.text || "",
			finished: serverContent.outputTranscription.finished || false
		},
		endOfTurn: false
	});
	if (serverContent?.interrupted) responses.push({
		type: "interrupted",
		data: "",
		endOfTurn: false
	});
	if (serverContent?.turnComplete) responses.push({
		type: "turn_complete",
		data: "",
		endOfTurn: true
	});
	return responses;
}
var GeminiLiveClient = class {
	token = null;
	model = null;
	responseModalities = [Modality.AUDIO];
	systemInstructions = "";
	googleGrounding = false;
	voiceName = "Puck";
	temperature = 1;
	inputAudioTranscription = false;
	outputAudioTranscription = false;
	contextWindowCompression;
	proactiveAudio = false;
	enableAffectiveDialog = false;
	thinkingConfig;
	speechLanguageCode;
	maxOutputTokens;
	functionDeclarations = [];
	automaticActivityDetection = {
		disabled: false,
		silence_duration_ms: 2e3,
		prefix_padding_ms: 500,
		end_of_speech_sensitivity: EndSensitivity.END_SENSITIVITY_UNSPECIFIED,
		start_of_speech_sensitivity: StartSensitivity.START_SENSITIVITY_UNSPECIFIED
	};
	activityHandling = ActivityHandling.ACTIVITY_HANDLING_UNSPECIFIED;
	webSocket = null;
	lastResumptionUpdate = null;
	setupComplete = false;
	connected = false;
	onReceiveResponse = () => {};
	onOpen = () => {};
	onClose = () => {};
	onError = () => {};
	constructor(token, model, tools) {
		this.token = token;
		this.model = model;
		if (tools) this.functionDeclarations = tools.map(clientToolToDeclaration);
	}
	get isConnected() {
		return this.connected;
	}
	get isSetupComplete() {
		return this.setupComplete;
	}
	/**
	* Connection management
	*/
	connect() {
		return new Promise((resolve, reject) => {
			const socket = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${this.token}`);
			this.webSocket = socket;
			let errored = false;
			socket.onclose = () => {
				this.connected = false;
				this.setupComplete = false;
				if (!errored) this.onClose();
				reject(/* @__PURE__ */ new Error("WebSocket closed before setup completed"));
			};
			socket.onerror = () => {
				errored = true;
				this.connected = false;
				this.setupComplete = false;
				const error = /* @__PURE__ */ new Error("Gemini realtime WebSocket connection error");
				this.onError(error);
				reject(error);
			};
			socket.onopen = () => {
				this.connected = true;
				this.onOpen();
				resolve();
			};
			socket.onmessage = (event) => {
				this.onReceiveMessage(event);
			};
		});
	}
	disconnect() {
		if (this.webSocket) {
			this.webSocket.onclose = null;
			this.webSocket.onerror = null;
			this.webSocket.onopen = null;
			this.webSocket.onmessage = null;
			this.webSocket.close();
			this.webSocket = null;
		}
		this.connected = false;
		this.setupComplete = false;
	}
	/**
	* Session management
	*/
	sendInitialSetupMessage(resume = false) {
		const tools = this.functionDeclarations;
		const setup = {
			model: `models/${this.model}`,
			generationConfig: {
				responseModalities: this.responseModalities,
				temperature: this.temperature,
				speechConfig: {
					languageCode: this.speechLanguageCode,
					voiceConfig: { prebuiltVoiceConfig: { voiceName: this.voiceName } }
				},
				enableAffectiveDialog: this.enableAffectiveDialog,
				maxOutputTokens: this.maxOutputTokens,
				thinkingConfig: this.thinkingConfig
			},
			sessionResumption: {
				transparent: true,
				handle: resume ? this.lastResumptionUpdate?.newHandle : void 0
			},
			contextWindowCompression: this.contextWindowCompression,
			proactivity: { proactiveAudio: this.proactiveAudio },
			systemInstruction: { parts: [{ text: this.systemInstructions }] },
			tools: [{ functionDeclarations: tools }],
			realtimeInputConfig: {
				automaticActivityDetection: {
					disabled: this.automaticActivityDetection.disabled,
					silenceDurationMs: this.automaticActivityDetection.silence_duration_ms,
					prefixPaddingMs: this.automaticActivityDetection.prefix_padding_ms,
					endOfSpeechSensitivity: this.automaticActivityDetection.end_of_speech_sensitivity,
					startOfSpeechSensitivity: this.automaticActivityDetection.start_of_speech_sensitivity
				},
				activityHandling: this.activityHandling,
				turnCoverage: TurnCoverage.TURN_INCLUDES_ONLY_ACTIVITY
			}
		};
		if (this.inputAudioTranscription) setup.inputAudioTranscription = {};
		if (this.outputAudioTranscription) setup.outputAudioTranscription = {};
		if (this.googleGrounding) {
			console.warn("Google Grounding enabled, removing custom function calls if any.");
			setup.tools = [{ googleSearch: {} }];
		}
		this.sendMessage({ setup });
	}
	async restartSession(resume = false) {
		this.disconnect();
		await this.connect();
		this.sendInitialSetupMessage(resume);
	}
	updateToken(token) {
		this.token = token.token;
		const resume = !(token.config.model && this.model != token.config.model);
		if (!resume) this.model = token.config.model;
		this.restartSession(resume).catch((err) => this.onError(err instanceof Error ? err : new Error(String(err))));
	}
	async updateSession(config) {
		if (config.model && !this.setupComplete) this.model = config.model;
		if (config.instructions) this.systemInstructions = config.instructions;
		if (config.tools) this.functionDeclarations = config.tools.map(toolConfigToDeclaration);
		if (config.maxOutputTokens) this.maxOutputTokens = typeof config.maxOutputTokens === "number" ? config.maxOutputTokens : void 0;
		if (config.temperature) this.temperature = config.temperature;
		if (config.voice) this.voiceName = config.voice;
		const providerOptions = config.providerOptions;
		if (providerOptions?.googleGrounding) this.googleGrounding = providerOptions.googleGrounding;
		if (providerOptions?.proactiveAudio) this.proactiveAudio = providerOptions.proactiveAudio;
		if (providerOptions?.enableAffectiveDialog) this.enableAffectiveDialog = providerOptions.enableAffectiveDialog;
		if (providerOptions?.contextWindowCompression) this.contextWindowCompression = providerOptions.contextWindowCompression;
		if (providerOptions?.thinkingConfig) this.thinkingConfig = providerOptions.thinkingConfig;
		if (providerOptions?.languageCode) this.speechLanguageCode = providerOptions.languageCode;
		const includeTranscription = config.outputModalities?.includes("text") || false;
		this.inputAudioTranscription = includeTranscription;
		this.outputAudioTranscription = includeTranscription;
		if (!this.setupComplete) this.sendInitialSetupMessage();
		else return this.restartSession(true);
	}
	/**
	* Message transmission & receiving
	*/
	sendMessage(message) {
		if (this.webSocket?.readyState === WebSocket.OPEN) this.webSocket.send(JSON.stringify(message));
		else this.onError(/* @__PURE__ */ new Error("Cannot send message: Gemini realtime socket is not open"));
	}
	async onReceiveMessage(messageEvent) {
		let jsonData;
		if (messageEvent.data instanceof Blob) jsonData = await messageEvent.data.text();
		else if (messageEvent.data instanceof ArrayBuffer) jsonData = new TextDecoder().decode(messageEvent.data);
		else jsonData = messageEvent.data;
		try {
			const responses = parseResponseMessages(JSON.parse(jsonData));
			for (const response of responses) {
				if (response.type === "session_resumption_update" && response.data.resumable) this.lastResumptionUpdate = response.data;
				if (response.type === "setup_complete") this.setupComplete = true;
				this.onReceiveResponse(response);
			}
		} catch (err) {
			this.onError(err instanceof Error ? err : new Error(String(err)));
		}
	}
	sendRealtimeInputMessage(data, mimeType) {
		const blob = {
			mimeType,
			data
		};
		if (mimeType.startsWith("audio/")) this.sendMessage({ realtimeInput: { audio: blob } });
		else if (mimeType.startsWith("image/") || mimeType.startsWith("video/")) this.sendMessage({ realtimeInput: { video: blob } });
	}
	sendAudioMessage(base64PCM) {
		this.sendRealtimeInputMessage(base64PCM, "audio/pcm");
	}
	sendImageMessage(base64, mimeType = "image/jpeg") {
		this.sendRealtimeInputMessage(base64, mimeType);
	}
	sendTextMessage(text) {
		const message = { realtimeInput: { text } };
		this.sendMessage(message);
	}
	sendToolResponse(functionResponses) {
		const message = { toolResponse: { functionResponses } };
		this.sendMessage(message);
	}
};
//#endregion
export { GeminiLiveClient, parseResponseMessages };

//# sourceMappingURL=client.js.map