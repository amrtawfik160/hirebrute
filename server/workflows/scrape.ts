import type { Job } from "../../shared/types.ts"

export function pairKey(company: string, role: string): string {
  return `${company.trim().toLowerCase()}::${role.trim().toLowerCase()}`
}

export function dedupeJobs(opts: {
  incoming: Job[]
  seen: Job[]
  trackerPairs: { company: string; role: string }[]
}): { fresh: Job[]; skipped: number } {
  const seenUrls = new Set(opts.seen.map((j) => j.url))
  const seenKeys = new Set(opts.seen.map((j) => j.key))
  const seenPairs = new Set(opts.seen.map((j) => pairKey(j.company, j.title)))
  const tracker = new Set(opts.trackerPairs.map((p) => pairKey(p.company, p.role)))
  const fresh: Job[] = []
  let skipped = 0
  const thisRun = new Set<string>()
  for (const job of opts.incoming) {
    const pair = pairKey(job.company, job.title)
    if (seenUrls.has(job.url) || seenKeys.has(job.key) || seenPairs.has(pair) || tracker.has(pair) || thisRun.has(job.url)) {
      skipped += 1
      continue
    }
    thisRun.add(job.url)
    fresh.push(job)
  }
  return { fresh, skipped }
}
