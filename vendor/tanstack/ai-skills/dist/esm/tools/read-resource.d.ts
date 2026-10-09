import { Tool } from '@tanstack/ai';
import { SkillSource } from '../types.js';
export declare const READ_RESOURCE_TOOL_NAME = "read_skill_resource";
export declare function createResourceTool(source: SkillSource): Tool;
