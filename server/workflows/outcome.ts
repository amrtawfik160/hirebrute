import { FINAL_STATUSES, OPEN_STATUSES } from "../../shared/constants.ts"
import { csvSafe, daysBetween, lastTouch, normalizeStatus } from "../../shared/status.ts"
import type { Application, ApplicationStatus, FollowUp } from "../../shared/types.ts"
import { generate } from "../providers/registry.ts"
import { addHistory, loadStore, mutate } from "../store.ts"

export function recordOutcome(opts: {
  id: string
  status: ApplicationStatus | string
  notes?: string
  contactPerson?: string
  interview?: { stage: string; date: string; format: string; interviewers: string; notes: string }
}): Application {
  const status = normalizeStatus(String(opts.status))
  if (!status) throw new Error(`Unknown status "${opts.status}"`)
  const updated = mutate((s) => {
    const app = s.applications.find((a) => a.id === opts.id)
    if (!app) throw new Error("Application not found")
    if (app.status === "drafted" && status !== "drafted") {
      app.date = new Date().toISOString().slice(0, 10)
    }
    app.status = status
    if (opts.notes) app.notes = csvSafe([app.notes, opts.notes].filter(Boolean).join(" | "))
    if (opts.contactPerson) app.contactPerson = opts.contactPerson
    if (opts.interview) app.interviews.push(opts.interview)
    app.updatedAt = new Date().toISOString()
    return app
  })
  addHistory({
    kind: "outcome",
    title: `${updated.company}: ${status}`,
    detail: opts.notes || `Status set to ${status}`,
    ref: updated.id,
  })
  return updated
}

export function addFollowUp(opts: { id: string; text: string; channel?: string }): Application {
  const follow: FollowUp = {
    date: new Date().toISOString().slice(0, 10),
    channel: opts.channel || "email",
    text: csvSafe(opts.text),
  }
  const updated = mutate((s) => {
    const app = s.applications.find((a) => a.id === opts.id)
    if (!app) throw new Error("Application not found")
    if (app.status === "drafted") throw new Error("Drafted rows are never followed up. Mark the application sent first.")
    app.followUps.push(follow)
    app.notes = csvSafe([app.notes, `followed up ${follow.date}`].filter(Boolean).join(" | "))
    app.updatedAt = new Date().toISOString()
    return app
  })
  addHistory({
    kind: "outcome",
    title: `Follow-up logged for ${updated.company}`,
    detail: follow.text.slice(0, 180),
    ref: updated.id,
  })
  return updated
}

export function quietApplications(thresholdDays = 10): Application[] {
  return loadStore().applications.filter((app) => {
    if (!OPEN_STATUSES.includes(app.status) || app.status === "drafted") return false
    return daysBetween(lastTouch(app)) >= thresholdDays && app.followUps.length < 2
  })
}

export function staleApplications(thresholdDays = 60): Application[] {
  return loadStore().applications.filter((app) => {
    if (FINAL_STATUSES.includes(app.status) || app.status === "drafted") return false
    return daysBetween(lastTouch(app)) >= thresholdDays
  })
}

export async function draftFollowUpText(app: Application): Promise<string> {
  try {
    const { text } = await generate({
      system: "Write a short follow-up email. Warm, direct, no filler.",
      prompt: `Follow up on ${app.role} at ${app.company}. Applied ${app.date}. Status ${app.status}.`,
    })
    if (text.trim()) return text.trim()
  } catch {
    /* fall through */
  }
  return `Hello,\n\nChecking in on my application for ${app.role} at ${app.company}. Happy to share more if useful.\n\nBest`
}
