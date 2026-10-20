import type { Job } from "../../shared/types.ts"
import { scrapeAll, type BoardReport } from "../portals/index.ts"
import { addHistory, mutate } from "../store.ts"
import { dedupeJobs } from "./scrape.ts"

export async function scrapeAndStore(opts: { query?: string; portals?: string[]; limit?: number }): Promise<{
  jobs: Job[]
  fresh: Job[]
  skipped: number
  ran: string[]
  failed: { id: string; error: string }[]
  boards: (BoardReport & { fresh: number })[]
}> {
  const { loadStore } = await import("../store.ts")
  const store = loadStore()
  const { jobs, ran, failed, boards } = await scrapeAll(opts)
  const { fresh, skipped } = dedupeJobs({
    incoming: jobs,
    seen: store.jobs,
    trackerPairs: store.applications.map((a) => ({ company: a.company, role: a.role })),
  })
  const withFresh = boards.map((board) => ({
    ...board,
    fresh: fresh.filter((job) => job.portal === board.id).length,
  }))
  mutate((s) => {
    s.jobs = [...fresh, ...s.jobs]
    s.lastScrape = {
      at: new Date().toISOString(),
      query: opts.query || "",
      boards: withFresh,
    }
  })
  addHistory({
    kind: "scrape",
    title: `Scraped ${fresh.length} new jobs`,
    detail: withFresh
      .map((board) => (board.error ? `${board.name} failed: ${board.error}` : `${board.name} ${board.fresh}`))
      .join(". "),
  })
  return { jobs: loadStore().jobs, fresh, skipped, ran, failed, boards: withFresh }
}
