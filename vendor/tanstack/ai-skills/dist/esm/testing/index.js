import { describe, expect, it } from "vitest";
//#region src/testing/index.ts
/**
* `runSkillSourceConformance` — the real deliverable for third-party adapters.
* Since adapter code is frequently LLM-generated, this suite (not prose) is what
* makes a new `SkillSource` safe to ship.
*
* The factory must return a source seeded with this fixed fixture contract:
*
*   - skill `alpha`: description non-empty; resource `references/note.md` whose
*     contents are exactly `hello`; script `scripts/run.py` whose bytes decode
*     to `print(1)` (only if the source supports scripts).
*   - skill `beta`: description non-empty; no resources required.
*
* Sources that cannot represent a tier (resources/scripts) simply omit the
* corresponding methods — those cases are skipped, not failed.
*/
var dec = (v) => typeof v === "string" ? v : new TextDecoder().decode(v);
function runSkillSourceConformance(factory, label = "SkillSource") {
	describe(`conformance: ${label}`, () => {
		it("lists skills with a name and description", async () => {
			const skills = await (await factory()).list();
			const names = skills.map((s) => s.name);
			expect(names).toContain("alpha");
			expect(names).toContain("beta");
			for (const s of skills) {
				expect(s.name).toBeTruthy();
				expect(s.description).toBeTruthy();
			}
		});
		it("loads a known skill body", async () => {
			const body = await (await factory()).load("alpha");
			expect(typeof body).toBe("string");
			expect(body.length).toBeGreaterThan(0);
		});
		it("throws (not returns empty) for a missing skill name", async () => {
			const source = await factory();
			await expect(source.load("does-not-exist")).rejects.toThrow();
		});
		it("has a stable revision across identical content", async () => {
			const rev = (await factory()).revision;
			if (!rev) return;
			const a = await rev();
			const b = await rev();
			expect(a).toBe(b);
			const other = await factory();
			if (other.revision) expect(await other.revision()).toBe(a);
		});
		it("serves concurrent list() consistently", async () => {
			const source = await factory();
			const [a, b] = await Promise.all([source.list(), source.list()]);
			expect(a.map((s) => s.name).sort()).toEqual(b.map((s) => s.name).sort());
		});
		it("reads a bundled resource and rejects path traversal", async () => {
			const { listResources, readResource } = await factory();
			if (!listResources || !readResource) return;
			const resources = await listResources("alpha");
			expect(resources).toContain("references/note.md");
			const value = await readResource("alpha", "references/note.md");
			expect(dec(value).trimEnd()).toBe("hello");
			await expect(readResource("alpha", "../../etc/passwd")).rejects.toThrow();
		});
		it("returns script bytes correctly", async () => {
			const source = await factory();
			if (!source.listScripts || !source.readScript) return;
			const ref = (await source.listScripts("alpha")).find((s) => s.path === "scripts/run.py");
			if (!ref) return;
			expect(ref.executable).toBe(false);
			const bytes = await source.readScript("alpha", "scripts/run.py");
			expect(bytes).toBeInstanceOf(Uint8Array);
			expect(dec(bytes)).toContain("print(1)");
		});
	});
}
//#endregion
export { runSkillSourceConformance };

//# sourceMappingURL=index.js.map