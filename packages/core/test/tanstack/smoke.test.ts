import { describe, expect, test } from "bun:test"
import { defineHarness, isHarnessDefinition } from "@tanstack/ai-harness"
import { createQuickJSIsolateDriver } from "@tanstack/ai-isolate-quickjs"
import { createOpenaiChat } from "@tanstack/ai-openai"

describe("TanStack AI packages", () => {
  test("defineHarness builds a frozen harness definition with an adapter", () => {
    const adapter = createOpenaiChat("gpt-5", "test-key")
    const harness = defineHarness({ name: "opencode", adapter })

    expect(harness.kind).toBe("tanstack-ai-harness")
    expect(harness.version).toBe(1)
    expect(harness.name).toBe("opencode")
    expect(harness.adapter).toBe(adapter)
    expect(Object.isFrozen(harness)).toBe(true)
    expect(isHarnessDefinition(harness)).toBe(true)
  })

  test("defineHarness rejects a blank name", () => {
    expect(() => defineHarness({ name: " " })).toThrow("defineHarness requires a non-empty name")
  })

  test("the QuickJS isolate driver runs code in Bun", async () => {
    const context = await createQuickJSIsolateDriver().createContext({ bindings: {} })
    const result = await context.execute("return 6 * 7")
    await context.dispose()

    expect(result.success).toBe(true)
    expect(result.value).toBe(42)
  })
})
