import { VercelGatewayRoutingOptions } from '../text/text-provider-options.js';
export declare function mapGatewayModelOptions(modelOptions: (Record<string, unknown> & {
    gateway?: VercelGatewayRoutingOptions;
}) | undefined): Record<string, unknown>;
