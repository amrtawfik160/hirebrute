import { describe, expect, it } from "vitest"
import { generate } from "../server/providers/registry.ts"
import { loadStore, mutate } from "../server/store.ts"

describe("mock provider", () => {
  it("returns text without needing keys or a network", async () => {
    mutate((s) => {
      s.settings.activeProvider = "mock"
    })
    const { text, provider } = await generate({
      system: "You write cover letters.",
      prompt: "Role: Staff AI Engineer\nCompany: Northstar Robotics\nWrite a cover letter.",
    })
    expect(provider).toBe("mock")
    expect(text.length).toBeGreaterThan(40)
    expect(text.toLowerCase()).toMatch(/northstar|evaluation|harness/)
    void loadStore
  })
})
