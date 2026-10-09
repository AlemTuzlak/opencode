import { SchemaInput } from '../../../types.js';
/** Check final tool input. Raw JSON Schema arguments use a copy. */
export declare function validateToolInput(schema: SchemaInput | boolean | undefined, received: unknown, toolName: string): Promise<unknown>;
