import { describe, expect, it } from "vitest"
import { archiveSlug, jobKey } from "../shared/jobKey.ts"

describe("jobKey", () => {
  it("is stable for the same company, title, and url", () => {
    const a = jobKey({
      company: "Northstar Robotics",
      title: "Staff AI Engineer, Evaluation",
      url: "https://example.com/jobs/northstar-staff-ai-eval",
    })
    const b = jobKey({
      company: "Northstar Robotics",
      title: "Staff AI Engineer, Evaluation",
      url: "https://example.com/jobs/northstar-staff-ai-eval",
    })
    expect(a).toBe(b)
  })

  it("does not collide two long titles that share a prefix", () => {
    const a = jobKey({
      company: "Acme",
      title: "Senior Staff Platform Reliability Engineer for Global Edge Services Alpha",
    })
    const b = jobKey({
      company: "Acme",
      title: "Senior Staff Platform Reliability Engineer for Global Edge Services Beta",
    })
    expect(a).not.toBe(b)
  })

  it("archiveSlug never splits on a slash in the company name", () => {
    const slug = archiveSlug("Acme/Corp", "ML Engineer")
    expect(slug.includes("/")).toBe(false)
    expect(slug.length).toBeGreaterThan(0)
  })

  it("archiveSlug is empty when company and role are both empty", () => {
    expect(archiveSlug("", "")).toBe("")
  })
})
