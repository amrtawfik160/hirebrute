import { describe, expect, it } from "vitest"
import { jobKey } from "../shared/jobKey.ts"
import { dedupeJobs } from "../server/workflows/scrape.ts"
import type { Job } from "../shared/types.ts"

function job(partial: Partial<Job> & Pick<Job, "title" | "company" | "url">): Job {
  return {
    key: jobKey({ company: partial.company, title: partial.title, url: partial.url }),
    location: "Remote",
    portal: "mock",
    description: "",
    status: "new",
    seenAt: "2026-10-19T00:00:00.000Z",
    ...partial,
  }
}

describe("dedupeJobs", () => {
  it("drops a posting already in seen_jobs by url even if the key rule changed", () => {
    const seen = [
      job({
        title: "Staff AI Engineer",
        company: "Northstar",
        url: "https://example.com/jobs/1",
        key: "legacy-key",
      }),
    ]
    const incoming = [
      job({
        title: "Staff AI Engineer",
        company: "Northstar",
        url: "https://example.com/jobs/1",
      }),
      job({
        title: "Retrieval Engineer",
        company: "Harborline",
        url: "https://example.com/jobs/2",
      }),
    ]
    const { fresh, skipped } = dedupeJobs({ incoming, seen, trackerPairs: [] })
    expect(fresh.map((j) => j.company)).toEqual(["Harborline"])
    expect(skipped).toBe(1)
  })

  it("drops a company+role already in the application tracker", () => {
    const incoming = [
      job({
        title: "Staff AI Engineer",
        company: "Northstar Robotics",
        url: "https://example.com/jobs/9",
      }),
    ]
    const { fresh } = dedupeJobs({
      incoming,
      seen: [],
      trackerPairs: [{ company: "Northstar Robotics", role: "Staff AI Engineer" }],
    })
    expect(fresh).toEqual([])
  })
})
