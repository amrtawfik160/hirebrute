import { FINAL_STATUSES } from "../../shared/constants.ts"
import type { Application, ApplicationStatus, GmailProposal } from "../../shared/types.ts"
import { csvSafe, normalizeStatus } from "../../shared/status.ts"
import { addHistory, loadStore, mutate } from "../store.ts"
import { generate } from "../providers/registry.ts"
import { safeJson } from "../json.ts"

function classifyExcerpt(text: string, current: ApplicationStatus): { status: ApplicationStatus; reason: string; confidence: GmailProposal["confidence"] } | null {
  const t = text.toLowerCase()
  if (/we('re| are) pleased to offer|offer of employment/.test(t)) {
    return { status: "offer", reason: "Offer language", confidence: "high" }
  }
  if (/interview|schedule a call|phone screen|meet the team/.test(t)) {
    return { status: "interview", reason: "Interview invitation", confidence: "high" }
  }
  if (/unfortunately|other candidates|not moving forward|will not be progressing|decided not to/.test(t)) {
    return { status: "rejected", reason: "Rejection language", confidence: "high" }
  }
  if (/thank you for (your )?applying|we received your application|application has been received/.test(t)) {
    if (current === "drafted") return { status: "applied", reason: "Application acknowledgement", confidence: "medium" }
    return null
  }
  return null
}

export async function proposeGmail(pasted: string): Promise<GmailProposal[]> {
  const store = loadStore()
  if (!store.applications.length) {
    throw new Error("No applications in the tracker. Gmail sync never originates new rows.")
  }
  const chunks = pasted
    .split(/\n{2,}From:|\n-{5,}\n|---\n/)
    .map((c) => c.trim())
    .filter((c) => c.length > 20)
  const usable = chunks.length ? chunks : pasted.trim() ? [pasted.trim()] : []
  const proposals: GmailProposal[] = []
  for (const chunk of usable) {
    const app = store.applications.find((a) => chunk.toLowerCase().includes(a.company.toLowerCase()))
    if (!app) continue
    const hit = classifyExcerpt(chunk, app.status)
    if (!hit) continue
    if (hit.status === "hired" || hit.status === "offer_declined") continue
    if (FINAL_STATUSES.includes(app.status) && hit.status !== app.status) continue
    proposals.push({
      id: `gm-${proposals.length + 1}-${app.id}`,
      applicationId: app.id,
      company: app.company,
      role: app.role,
      proposedStatus: hit.status,
      reason: hit.reason,
      sourceExcerpt: chunk.slice(0, 280),
      confidence: hit.confidence,
      needsManual: hit.confidence === "low",
    })
  }
  if (!proposals.length && usable.length) {
    try {
      const { text } = await generate({
        system:
          "Classify job emails into tracker updates. Never propose hired or offer_declined. Never create new applications. JSON {proposals:[]}.",
        prompt: `TRACKER:\n${JSON.stringify(store.applications.map((a) => ({ id: a.id, company: a.company, role: a.role, status: a.status })))}\n\nEMAILS:\n${pasted}`,
        json: true,
      })
      const parsed = safeJson<{ proposals: GmailProposal[] }>(text, { proposals: [] })
      for (const p of parsed.proposals || []) {
        if (p.proposedStatus === "hired" || p.proposedStatus === "offer_declined") continue
        if (!store.applications.some((a) => a.id === p.applicationId)) continue
        proposals.push({ ...p, needsManual: p.needsManual || p.confidence === "low" })
      }
    } catch {
      /* none */
    }
  }
  addHistory({
    kind: "sync",
    title: "Gmail proposals ready",
    detail: `${proposals.length} proposed updates. Nothing written until you approve.`,
  })
  return proposals
}

export function approveGmail(ids: string[], proposals: GmailProposal[]): Application[] {
  const store = loadStore()
  const chosen = proposals.filter((p) => ids.includes(p.id))
  const updated: Application[] = []
  mutate((s) => {
    for (const p of chosen) {
      const app = s.applications.find((a) => a.id === p.applicationId)
      if (!app) continue
      const status = normalizeStatus(p.proposedStatus)
      if (!status || status === "hired" || status === "offer_declined") continue
      if (app.status === "drafted" && status === "applied") {
        app.date = new Date().toISOString().slice(0, 10)
      }
      app.status = status
      app.notes = csvSafe([app.notes, p.reason].filter(Boolean).join(" | "))
      app.updatedAt = new Date().toISOString()
      s.gmail.processedIds.push(p.id)
      s.gmail.lastSync = new Date().toISOString()
      updated.push(app)
    }
  })
  addHistory({
    kind: "sync",
    title: `Approved ${updated.length} Gmail updates`,
    detail: updated.map((a) => `${a.company} → ${a.status}`).join("; ") || "none",
  })
  void store
  return updated
}
