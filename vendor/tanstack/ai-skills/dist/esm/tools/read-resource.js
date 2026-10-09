import { assertSafeResourcePath } from "../util.js";
import { toolDefinition } from "@tanstack/ai";
import { z } from "zod";
//#region src/tools/read-resource.ts
/**
* `read_skill_resource` — reads a bundled resource (references/ or assets/) of a
* skill. Shipped but NOT auto-registered: pass it explicitly in `tools`, and
* `withSkills` phrases activation instructions based on its presence. This keeps
* DB/S3/inline sources' resources reachable — they have bytes but no file, so a
* caller-supplied file-read tool would never see them.
*/
var READ_RESOURCE_TOOL_NAME = "read_skill_resource";
function toBase64(bytes) {
	return Buffer.from(bytes).toString("base64");
}
function createResourceTool(source) {
	return toolDefinition({
		name: READ_RESOURCE_TOOL_NAME,
		description: "Read a bundled resource file (from references/ or assets/) of an activated skill, by its path relative to the skill root.",
		inputSchema: z.object({
			skill: z.string(),
			path: z.string()
		}),
		outputSchema: z.object({
			skill: z.string(),
			path: z.string(),
			content: z.string(),
			encoding: z.enum(["utf8", "base64"])
		})
	}).server(async ({ skill, path }) => {
		assertSafeResourcePath(path);
		if (!(await source.list()).some((s) => s.name === skill)) throw new Error(`no skill named "${skill}"`);
		if (source.listResources) {
			if (!(await source.listResources(skill)).includes(path)) throw new Error(`skill "${skill}" has no resource "${path}"`);
		}
		if (!source.readResource) throw new Error("this skill source does not support resources");
		const value = await source.readResource(skill, path);
		if (typeof value === "string") return {
			skill,
			path,
			content: value,
			encoding: "utf8"
		};
		return {
			skill,
			path,
			content: toBase64(value),
			encoding: "base64"
		};
	});
}
//#endregion
export { READ_RESOURCE_TOOL_NAME, createResourceTool };

//# sourceMappingURL=read-resource.js.map