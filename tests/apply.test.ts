import { describe, expect, it } from "vitest"
import { DEMO_POSTING, DEMO_PROFILE } from "../server/demo.ts"
import { draftApplication } from "../server/workflows/apply.ts"

describe("draftApplication", () => {
  it("writes a CV that only uses profile facts, and a one-page cover letter without em dashes", async () => {
    const result = await draftApplication({
      profile: DEMO_PROFILE,
      posting: DEMO_POSTING,
      company: "Northstar Robotics",
      role: "Staff AI Engineer, Evaluation",
    })
    expect(result.cvMarkdown).toMatch(/Amira Cole/)
    expect(result.cvMarkdown).toMatch(/Northwind Labs/)
    expect(result.cvMarkdown.toLowerCase()).not.toMatch(/warehouse floor lead/)
    expect(result.coverMarkdown).toMatch(/Northstar/)
    expect(result.coverMarkdown.includes("\u2014")).toBe(false)
    expect(result.coverMarkdown.toLowerCase()).not.toMatch(/passionate about/)
    expect(result.ats.emailFound).toBe(true)
    expect(result.ats.nameFound).toBe(true)
    expect(result.ats.keywordCoverage.some((k) => k.keyword.toLowerCase().includes("python"))).toBe(
      true,
    )
  })
})
