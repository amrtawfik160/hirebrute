import { describe, expect, it } from "vitest"
import { dashboardStats } from "../shared/dashboard.ts"
import type { Application } from "../shared/types.ts"

function app(partial: Partial<Application> & Pick<Application, "status">): Application {
  return {
    id: partial.id || "a1",
    date: "2026-10-01",
    company: "Acme",
    sector: "AI",
    role: "Engineer",
    roleType: "staff",
    channel: "online",
    contactPerson: "",
    fitRating: 70,
    notes: "",
    cvFile: "",
    coverLetterFile: "",
    source: "",
    deadline: "",
    slug: "acme_engineer",
    followUps: [],
    interviews: [],
    archive: { posting: "", cvMarkdown: "", coverMarkdown: "" },
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...partial,
  }
}

describe("dashboardStats", () => {
  it("excludes drafted rows from sent and from funnel denominators", () => {
    const stats = dashboardStats([
      app({ id: "1", status: "drafted" }),
      app({ id: "2", status: "applied" }),
      app({ id: "3", status: "interview" }),
      app({ id: "4", status: "rejected", interviews: [{ stage: "phone", date: "2026-10-02", format: "phone", interviewers: "", notes: "" }] }),
    ])
    expect(stats.drafted).toBe(1)
    expect(stats.sent).toBe(3)
    expect(stats.active).toBe(1)
    expect(stats.interview).toBe(1)
    expect(stats.funnel.find((f) => f.stage === "Interview")?.count).toBe(2)
  })

  it("does not count offer_declined as a rejection", () => {
    const stats = dashboardStats([
      app({ id: "1", status: "rejected" }),
      app({ id: "2", status: "offer_declined" }),
      app({ id: "3", status: "hired" }),
    ])
    expect(stats.rejectionRate).toBeCloseTo(1 / 3)
  })
})
