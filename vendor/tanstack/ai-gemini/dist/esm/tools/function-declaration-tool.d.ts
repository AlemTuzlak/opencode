import { FunctionDeclaration } from '@google/genai';
export type FunctionDeclarationTool = FunctionDeclaration;
export declare function functionDeclarationTools(tools: Array<FunctionDeclarationTool>): {
    functionDeclarations: FunctionDeclaration[];
};
