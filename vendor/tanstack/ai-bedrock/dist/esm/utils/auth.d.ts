import { AwsCredentialIdentityProvider } from '@smithy/types';
export type BedrockEndpoint = 'runtime' | 'mantle';
/** SigV4 service name differs per endpoint. */
export declare function sigv4Service(endpoint: BedrockEndpoint): string;
export type ResolvedBedrockAuth = {
    kind: 'bearer';
    token: string;
} | {
    kind: 'sigv4';
    region: string;
    service: string;
    credentials: AwsCredentialIdentityProvider;
};
export interface BedrockAuthConfig {
    apiKey?: string;
    region?: string;
    auth?: 'apikey' | 'sigv4' | 'auto';
}
/** apiKey -> BEDROCK_API_KEY -> AWS_BEARER_TOKEN_BEDROCK -> SigV4 (credential chain). */
export declare function resolveBedrockAuth(config: BedrockAuthConfig, endpoint: BedrockEndpoint): ResolvedBedrockAuth;
