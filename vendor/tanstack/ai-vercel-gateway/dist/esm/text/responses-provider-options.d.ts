import { VercelGatewayBaseOptions, VercelGatewayCommonOptions } from './text-provider-options.js';
export type VercelGatewayResponsesProviderOptions = VercelGatewayCommonOptions & Pick<VercelGatewayBaseOptions, 'temperature' | 'top_p' | 'max_output_tokens'>;
export type ExternalResponsesProviderOptions = VercelGatewayResponsesProviderOptions;
