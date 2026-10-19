import { STATUS_BUCKET } from "./constants.ts"
import type { Application, DashboardStats } from "./types.ts"

function reachedInterview(app: Application): boolean {
  if (["interview", "offer", "hired"].includes(app.status)) return true
  return app.interviews.length > 0
}

function reachedOffer(app: Application): boolean {
  if (["offer", "hired", "offer_declined"].includes(app.status)) return true
  return app.interviews.some((i) => /offer/i.test(i.stage))
}

export function dashboardStats(applications: Application[]): DashboardStats {
  const submitted = applications.filter((a) => a.status !== "drafted")
  const byStatus: Record<string, number> = {}
  const bySector: Record<string, number> = {}
  const byChannel: Record<string, number> = {}
  for (const app of applications) {
    const bucket = STATUS_BUCKET[app.status] || "Rejected/Closed"
    byStatus[bucket] = (byStatus[bucket] || 0) + 1
  }
  for (const app of submitted) {
    bySector[app.sector || "Unspecified"] = (bySector[app.sector || "Unspecified"] || 0) + 1
    byChannel[app.channel || "other"] = (byChannel[app.channel || "other"] || 0) + 1
  }
  const drafted = applications.filter((a) => a.status === "drafted").length
  const active = submitted.filter((a) => a.status === "applied").length
  const interview = submitted.filter((a) => a.status === "interview").length
  const offer = submitted.filter((a) => a.status === "offer").length
  const closed = submitted.filter((a) =>
    ["hired", "rejected", "no_response", "offer_declined", "withdrawn"].includes(a.status),
  ).length
  const final = submitted.filter((a) =>
    ["hired", "rejected", "no_response", "offer_declined", "withdrawn"].includes(a.status),
  )
  const rejections = final.filter((a) => a.status === "rejected" || a.status === "no_response").length
  const rejectionRate = final.length ? rejections / final.length : null
  return {
    sent: submitted.length,
    drafted,
    active,
    interview,
    offer,
    closed,
    byStatus,
    bySector,
    byChannel,
    funnel: [
      { stage: "Sent", count: submitted.length },
      { stage: "Interview", count: submitted.filter(reachedInterview).length },
      { stage: "Offer", count: submitted.filter(reachedOffer).length },
      { stage: "Hired", count: submitted.filter((a) => a.status === "hired").length },
    ],
    rejectionRate,
    generatedAt: new Date().toISOString(),
  }
}
