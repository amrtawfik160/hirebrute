import type { ReactNode } from "react"
import { StatusBadge } from "@/components/status-badge"
import type { Job } from "../../shared/types"

export function JobCard({ job, action, showGaps = false }: { job: Job; action?: ReactNode; showGaps?: boolean }) {
  const snippet = (job.snippet || job.description || "").replace(/\s+/g, " ").trim()
  return (
    <article className="border-2 border-black bg-card shadow-md">
      <div className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="font-head text-lg leading-tight break-words">{job.title}</h2>
            <p className="mt-1 text-sm break-words">
              {job.company} · {job.location} · {job.portal}
            </p>
          </div>
          {job.rankScore != null ? (
            <p className="font-head text-2xl leading-none">
              {job.rankScore}
              <span className="text-sm">/100</span>
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge value={job.status} />
          {job.languageGate ? <StatusBadge value={job.languageGate} prefix="Language" /> : null}
          {job.locationVerdict ? <StatusBadge value={job.locationVerdict} prefix="Location" /> : null}
        </div>
        {snippet ? <p className="line-clamp-3 text-sm leading-relaxed break-words text-muted-foreground">{snippet}</p> : null}
        {job.languageNote ? <p className="text-sm leading-relaxed break-words">{job.languageNote}</p> : null}
        {showGaps && job.gaps?.length ? (
          <p className="text-sm leading-relaxed break-words">Gaps: {job.gaps.join(" · ")}</p>
        ) : null}
        {action ? <div className="flex flex-wrap gap-2 pt-1">{action}</div> : null}
      </div>
    </article>
  )
}
