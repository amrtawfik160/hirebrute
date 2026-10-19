import { describe, expect, it } from "vitest"
import { DEMO_POSTING, DEMO_PROFILE } from "../server/demo.ts"
import { evaluatePosting } from "../server/workflows/evaluate.ts"

describe("evaluatePosting", () => {
  it("scores a matching posting without drafting, and keeps the full posting text", async () => {
    const result = await evaluatePosting({
      source: "paste",
      text: DEMO_POSTING,
      profile: DEMO_PROFILE,
    })
    expect(result.evaluation.role.toLowerCase()).toMatch(/staff ai/)
    expect(result.evaluation.company.toLowerCase()).toMatch(/northstar/)
    expect(result.evaluation.overall).toBeGreaterThanOrEqual(50)
    expect(result.evaluation.verdict).not.toBe("poor")
    expect(result.cleanedPosting).toContain("warehouse robotics copilot")
    expect(result.evaluation.integrity.verdict).toBe("clean")
  })

  it("hard-stops on a language-gate FAIL and does not invent scores to hide it", async () => {
    const result = await evaluatePosting({
      source: "paste",
      text: "Staff role at Warsaw Bank. Fluent Polish required. Must communicate with the Warsaw team in Polish. Python a plus.",
      profile: DEMO_PROFILE,
    })
    expect(result.evaluation.languageGate.verdict).toBe("FAIL")
    expect(result.blocked).toBe(true)
  })
})
