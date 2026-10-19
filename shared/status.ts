import type { ApplicationStatus } from "./types.ts"

const CANON: Record<string, ApplicationStatus> = {
  drafted: "drafted",
  applied: "applied",
  interview: "interview",
  offer: "offer",
  hired: "hired",
  rejected: "rejected",
  no_response: "no_response",
  "no response": "no_response",
  offer_declined: "offer_declined",
  "offer declined": "offer_declined",
  withdrawn: "withdrawn",
}

export function normalizeStatus(value: string): ApplicationStatus | null {
  const key = value.trim().toLowerCase().replace(/\s+/g, " ")
  return CANON[key] || CANON[key.replace(/ /g, "_")] || null
}

export function csvSafe(value: string): string {
  return value.replace(/[,"\n\r]/g, " ").replace(/\s+/g, " ").trim()
}

export function daysBetween(from: string, to = new Date()): number {
  const start = new Date(from)
  if (Number.isNaN(start.getTime())) return 0
  return Math.floor((to.getTime() - start.getTime()) / 86_400_000)
}

export function lastTouch(app: { date: string; followUps: { date: string }[]; updatedAt: string }): string {
  const dates = [app.date, app.updatedAt, ...app.followUps.map((f) => f.date)].filter(Boolean)
  return dates.sort().at(-1) || app.date
}
