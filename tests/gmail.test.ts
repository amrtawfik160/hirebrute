import { describe, expect, it } from "vitest"
import { proposeGmail } from "../server/workflows/gmail.ts"
import { mutate } from "../server/store.ts"
import type { Application } from "../shared/types.ts"

function app(partial: Partial<Application>): Application {
  return {
    id: "app-1",
    date: "2026-10-01",
    company: "Northstar Robotics",
    sector: "AI",
    role: "Staff AI Engineer",
    roleType: "staff",
    channel: "online",
    status: "applied",
    contactPerson: "",
    fitRating: 70,
    notes: "",
    cvFile: "",
    coverLetterFile: "",
    source: "",
    deadline: "",
    slug: "northstar_staff",
    followUps: [],
    interviews: [],
    archive: { posting: "", cvMarkdown: "", coverMarkdown: "" },
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...partial,
  }
}

describe("gmail propose", () => {
  it("never proposes hired or offer_declined, and never invents applications", async () => {
    mutate((s) => {
      s.applications = [app({ status: "applied" })]
    })
    const proposals = await proposeGmail(
      "From recruiter@northstar.test\n\nWe are pleased to offer you the Staff AI Engineer role at Northstar Robotics.\n\nSeparately: unfortunately we are not moving forward at Harborline.",
    )
    expect(proposals.some((p) => p.proposedStatus === "hired")).toBe(false)
    expect(proposals.some((p) => p.proposedStatus === "offer_declined")).toBe(false)
    expect(proposals.every((p) => p.company === "Northstar Robotics")).toBe(true)
    expect(proposals.some((p) => p.proposedStatus === "offer")).toBe(true)
  })
})
