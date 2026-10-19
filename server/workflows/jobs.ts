import type { Job } from "../../shared/types.ts"
import { scrapeAll } from "../portals/index.ts"
import { addHistory, mutate } from "../store.ts"
import { dedupeJobs } from "./scrape.ts"

export async function scrapeAndStore(opts: { query?: string; portals?: string[]; limit?: number }): Promise<{
  jobs: Job[]
  fresh: Job[]
  skipped: number
  ran: string[]
  failed: { id: string; error: string }[]
}> {
  const { loadStore } = await import("../store.ts")
  const store = loadStore()
  const { jobs, ran, failed } = await scrapeAll(opts)
  const { fresh, skipped } = dedupeJobs({
    incoming: jobs,
    seen: store.jobs,
    trackerPairs: store.applications.map((a) => ({ company: a.company, role: a.role })),
  })
  mutate((s) => {
    s.jobs = [...fresh, ...s.jobs]
  })
  addHistory({
    kind: "scrape",
    title: `Scraped ${fresh.length} new jobs`,
    detail: `${skipped} skipped as duplicates. Boards: ${ran.join(", ") || "none"}.`,
  })
  return { jobs: store.jobs, fresh, skipped, ran, failed }
}
