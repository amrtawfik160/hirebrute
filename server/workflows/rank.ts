import {
  bandFor,
  eligibilityGate,
  heuristicScores,
  languageGate,
  locationVerdict,
  overallScore,
} from "../../shared/fit.ts"
import { postingGuard } from "../../shared/postingGuard.ts"
import type { Job, Profile } from "../../shared/types.ts"
import { extractReadable, fetchPage } from "../fetchPage.ts"
import { addHistory, mutate } from "../store.ts"
import { pairKey } from "./scrape.ts"

export interface RankOptions {
  focus?: string
  all?: boolean
  limit?: number
  top?: number
}

async function ensureDescription(job: Job): Promise<Job> {
  if (job.description && job.description.length > 80) return job
  if (!job.url || job.url.includes("example.com")) return job
  try {
    const page = await fetchPage(job.url)
    if (page.status >= 400) {
      return { ...job, status: "unreachable", fetchError: `${page.status} fetching posting` }
    }
    const text = extractReadable(page.html)
    if (!text) return { ...job, status: "unreachable", fetchError: "empty page" }
    if (/no longer available|position has been filled|job closed/i.test(text)) {
      return { ...job, status: "expired", description: text }
    }
    return { ...job, description: text }
  } catch (err) {
    return { ...job, status: "unreachable", fetchError: err instanceof Error ? err.message : String(err) }
  }
}

export function scoreJob(job: Job, profile: Profile): Job {
  const guard = postingGuard(job.description || "", "text")
  const posting = guard.cleaned
  const language = languageGate(posting, profile)
  const eligibility = eligibilityGate(posting, profile)
  const location = locationVerdict(posting, profile)
  const blocked = language.verdict === "FAIL" || eligibility.verdict === "FAIL"
  const scores = blocked ? { technical: 0, experience: 0, behavioral: 0, career: 0 } : heuristicScores(posting, profile)
  const rankScore = blocked ? 0 : overallScore(scores)
  const strengths: string[] = []
  const gaps: string[] = []
  if (blocked) {
    if (language.note) gaps.push(language.note)
    if (eligibility.note) gaps.push(eligibility.note)
  } else {
    if (scores.technical >= 60) strengths.push("Technical overlap with the posting.")
    else gaps.push("Technical skills are a stretch.")
    if (scores.experience >= 60) strengths.push("Recent work maps to the role.")
    else gaps.push("Experience is adjacent rather than direct.")
    if (location.verdict === "FAIL") gaps.push(location.note)
  }
  const quickFit = rankScore >= 70 ? "high" : rankScore >= 45 ? "medium" : "low"
  return {
    ...job,
    status: job.status === "expired" || job.status === "unreachable" ? job.status : "ranked",
    description: posting || job.description,
    languageGate: language.verdict,
    languageNote: language.note,
    locationVerdict: location.verdict,
    scores,
    rankScore,
    strengths,
    gaps,
    guard: guard.verdict,
    quickFit,
  }
}

export async function rankJobs(opts: RankOptions = {}): Promise<{
  ranked: Job[]
  shortlist: Job[]
  deferred: number
  skipped: number
}> {
  const { loadStore } = await import("../store.ts")
  const store = loadStore()
  const tracker = new Set(store.applications.map((a) => pairKey(a.company, a.role)))
  const limit = opts.limit ?? 10
  const top = opts.top ?? 5
  const focus = opts.focus?.toLowerCase()
  const candidates = store.jobs.filter((j) => {
    if (tracker.has(pairKey(j.company, j.title))) return false
    if (j.status === "applied" || j.status === "skipped" || j.status === "expired") return false
    if (!opts.all && j.status === "ranked") return false
    if (focus && !`${j.title} ${j.company} ${j.snippet || ""}`.toLowerCase().includes(focus)) return false
    return j.status === "new" || j.status === "unreachable" || opts.all
  })
  const batch = candidates.slice(0, limit)
  const deferred = Math.max(0, candidates.length - batch.length)
  const ranked: Job[] = []
  let skipped = 0
  for (const job of batch) {
    const fetched = await ensureDescription(job)
    if (fetched.status === "unreachable" || fetched.status === "expired") {
      ranked.push(fetched)
      skipped += 1
      continue
    }
    ranked.push(scoreJob(fetched, store.profile))
  }
  mutate((s) => {
    for (const job of ranked) {
      const idx = s.jobs.findIndex((j) => j.key === job.key)
      if (idx >= 0) s.jobs[idx] = job
    }
  })
  const shortlist = ranked
    .filter((j) => j.status === "ranked")
    .sort((a, b) => (b.rankScore || 0) - (a.rankScore || 0))
    .slice(0, top)
  addHistory({
    kind: "rank",
    title: `Ranked ${ranked.length} jobs`,
    detail: `${shortlist.length} on the shortlist. ${deferred} deferred. ${skipped} expired or unreachable.`,
  })
  return { ranked, shortlist, deferred, skipped }
}

export function bandLabel(score?: number): string {
  return bandFor(score || 0)
}
