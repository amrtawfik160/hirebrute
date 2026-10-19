import { describe, expect, it } from "vitest"
import { resolveProvider } from "../server/providers/resolve.ts"

describe("resolveProvider", () => {
  it("returns a discriminated credential object", () => {
    expect(resolveProvider("mock").kind).toBe("mock")
    expect(resolveProvider("claude-cli", { enabled: true, bin: "claude" }).kind).toBe("cli")
    const api = resolveProvider("anthropic", { enabled: true, apiKey: "sk-test", model: "claude-sonnet-4-5" })
    expect(api.kind).toBe("api")
    if (api.kind === "api") expect(api.apiKey).toBe("sk-test")
  })
})
