import { ServerSurface } from './introspect.js';
export interface EmitInput {
    [serverName: string]: {
        prefix?: string;
        surface: ServerSurface;
    };
}
export declare function emitDescriptors(input: EmitInput): Promise<string>;
