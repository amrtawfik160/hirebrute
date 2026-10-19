import { describe, expect, it } from "vitest"
import { DEMO_PROFILE } from "../server/demo.ts"
import { scoreJob } from "../server/workflows/rank.ts"
import type { Job } from "../shared/types.ts"

function job(description: string): Job {
  return {
    key: "northstar__staff",
    title: "Staff AI Engineer",
    company: "Northstar",
    location: "SF",
    url: "https://example.com/jobs/n",
    portal: "mock",
    description,
    status: "new",
    seenAt: "2026-10-01T00:00:00.000Z",
  }
}

describe("scoreJob", () => {
  it("zeros scores when the language gate fails", () => {
    const ranked = scoreJob(
      job("Staff role in Warsaw. Fluent Polish required. Must communicate with the Warsaw team in Polish."),
      DEMO_PROFILE,
    )
    expect(ranked.languageGate).toBe("FAIL")
    expect(ranked.rankScore).toBe(0)
    expect(ranked.scores?.technical).toBe(0)
  })
})
