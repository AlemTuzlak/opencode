import { VercelGatewayTextAdapter, VercelGatewayTextConfig } from './text.js';
import { VercelGatewayResponsesTextAdapter, VercelGatewayResponsesTextConfig } from './responses-text.js';
import { VercelGatewayChatModel } from '../model-meta.js';
export type VercelGatewayTextApi = 'responses' | 'chat' | 'chat-completions';
/** Config for the branching factory's Responses mode (default, or api: 'responses'). */
export type VercelGatewayResponsesApiConfig = Omit<VercelGatewayResponsesTextConfig, 'apiKey'> & {
    api?: 'responses';
};
/** Config for the branching factory's Chat Completions mode (api required). */
export type VercelGatewayChatApiConfig = Omit<VercelGatewayTextConfig, 'apiKey'> & {
    api: 'chat' | 'chat-completions';
};
export declare function createVercelGatewayText<TModel extends VercelGatewayChatModel>(model: TModel, apiKey: string, config?: VercelGatewayResponsesApiConfig): VercelGatewayResponsesTextAdapter<TModel>;
export declare function createVercelGatewayText<TModel extends VercelGatewayChatModel>(model: TModel, apiKey: string, config: VercelGatewayChatApiConfig): VercelGatewayTextAdapter<TModel>;
export declare function vercelGatewayText<TModel extends VercelGatewayChatModel>(model: TModel, config?: VercelGatewayResponsesApiConfig): VercelGatewayResponsesTextAdapter<TModel>;
export declare function vercelGatewayText<TModel extends VercelGatewayChatModel>(model: TModel, config: VercelGatewayChatApiConfig): VercelGatewayTextAdapter<TModel>;
