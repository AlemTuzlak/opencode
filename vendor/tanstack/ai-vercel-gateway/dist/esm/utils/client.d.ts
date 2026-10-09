import { ClientOptions } from 'openai';
export interface VercelGatewayClientConfig extends Omit<ClientOptions, 'apiKey'> {
    apiKey: string;
    httpReferer?: string;
    xTitle?: string;
}
export declare function getVercelGatewayApiKeyFromEnv(): string;
export declare function withVercelGatewayDefaults(config: VercelGatewayClientConfig): ClientOptions;
