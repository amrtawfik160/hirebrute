import type { Job, Profile, UpskillReport } from "../../shared/types.ts"
import { addHistory, loadStore, mutate } from "../store.ts"
import { generate } from "../providers/registry.ts"
import { safeJson } from "../json.ts"

function alreadyHas(profile: Profile, skill: string): boolean {
  const blob = [
    ...profile.skills.primary,
    ...profile.skills.secondary,
    ...profile.skills.domain,
    ...profile.skills.software,
  ]
    .join(" ")
    .toLowerCase()
  return blob.includes(skill.toLowerCase())
}

function collectGaps(jobs: Job[], applications: { company: string; role: string; fitRating: number | null; archive: { evaluation?: { gaps?: string[] } } }[]) {
  const heatmap = new Map<string, { skill: string; score: number; jobs: number; recorded: number; inferred: number }>
  const bump = (skill: string, weight: number, provenance: "recorded" | "inferred") => {
    const key = skill.toLowerCase()
    const cur = heatmap.get(key) || { skill, score: 0, jobs: 0, recorded: 0, inferred: 0 }
    cur.score += weight
    cur.jobs += 1
    if (provenance === "recorded") cur.recorded += 1
    else cur.inferred += 1
    heatmap.set(key, cur)
  }
  for (const app of applications) {
    const gaps = app.archive.evaluation?.gaps || []
    if (!gaps.length || app.fitRating == null) continue
    const weight = (100 - app.fitRating) / 100
    for (const gap of gaps) bump(gap, weight, "recorded")
  }
  for (const job of jobs) {
    if (job.status !== "ranked" || (job.rankScore ?? 0) < 45) continue
    if (!job.gaps?.length) continue
    const weight = (100 - (job.rankScore || 0)) / 100
    for (const gap of job.gaps) bump(gap, weight, "recorded")
  }
  return [...heatmap.values()]
    .sort((a, b) => b.score - a.score)
    .map((h) => ({
      skill: h.skill,
      score: Number(h.score.toFixed(2)),
      jobs: h.jobs,
      provenance: `${h.jobs} jobs (${h.recorded} recorded gaps, ${h.inferred} inferred), score ${h.score.toFixed(1)}`,
    }))
}

export async function buildUpskill(opts: { mode?: "aggregate" | "targeted"; target?: string }): Promise<UpskillReport> {
  const store = loadStore()
  const mode = opts.mode || (opts.target ? "targeted" : "aggregate")
  const jobs = mode === "targeted" ? [] : store.jobs
  const apps = mode === "targeted" ? [] : store.applications
  let heatmap = collectGaps(jobs, apps).filter((h) => !alreadyHas(store.profile, h.skill))
  if (mode === "targeted" && opts.target) {
    heatmap = [
      {
        skill: opts.target,
        score: 1,
        jobs: 1,
        provenance: "required",
      },
    ]
  }
  let domainGaps: string[] = heatmap.slice(0, 3).map((h) => h.skill)
  let softGaps: string[] = []
  let plan: UpskillReport["plan"] = heatmap.slice(0, 4).map((h) => ({
    skill: h.skill,
    why: "Recurring gap on ranked roles or tracker rows.",
    hours: 16,
    resources: [],
  }))
  try {
    const { text } = await generate({
      system: "Build an upskill plan. JSON with heatmap, domainGaps, softGaps, plan. Never invent course URLs.",
      prompt: `Upskill ${mode}. Heatmap: ${JSON.stringify(heatmap)}\nTarget: ${opts.target || ""}`,
      json: true,
    })
    const parsed = safeJson<Partial<UpskillReport>>(text, {})
    if (parsed.heatmap?.length) heatmap = parsed.heatmap
    if (parsed.domainGaps) domainGaps = parsed.domainGaps
    if (parsed.softGaps) softGaps = parsed.softGaps
    if (parsed.plan?.length) {
      plan = parsed.plan.map((p) => ({
        ...p,
        resources: (p.resources || []).filter((r) => /^https?:\/\//.test(r.url)),
      }))
    }
  } catch {
    /* keep heuristic */
  }
  const report: UpskillReport = {
    id: `up-${Date.now().toString(16)}`,
    at: new Date().toISOString(),
    mode,
    target: opts.target,
    heatmap,
    domainGaps,
    softGaps,
    plan,
  }
  mutate((s) => {
    s.upskill.unshift(report)
  })
  addHistory({
    kind: "upskill",
    title: mode === "targeted" ? `Upskill: ${opts.target}` : "Aggregate upskill report",
    detail: `${heatmap.length} heatmap rows.`,
    ref: report.id,
  })
  return report
}
