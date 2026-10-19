import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { api } from "@/lib/api"
import type { Job } from "../../shared/types"

export function RankPage() {
  const [focus, setFocus] = useState("")
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ranked: Job[]; shortlist: Job[]; deferred: number } | null>(null)

  async function run(all = false) {
    setBusy(true)
    try {
      const data = await api<{ ranked: Job[]; shortlist: Job[]; deferred: number }>("/api/jobs/rank", {
        method: "POST",
        body: JSON.stringify({ focus, all, limit: 10, top: 5 }),
      })
      setResult(data)
      toast.success(`Ranked ${data.ranked.length}. ${data.shortlist.length} on the shortlist.`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rank failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader
        kicker="rank"
        title="Rank"
        description="Triage scores from posting text and your profile. Apply still re-evaluates in depth. Jobs already on the tracker are excluded."
        actions={
          <>
            <Input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="Optional focus" className="w-48" />
            <Button onClick={() => run(false)} disabled={busy}>
              {busy ? "Scoring…" : "Rank new jobs"}
            </Button>
            <Button variant="outline" onClick={() => run(true)} disabled={busy}>
              Re-rank all
            </Button>
          </>
        }
      />
      {!result ? (
        <EmptyState
          title="Nothing ranked this session"
          body="Scrape first, then rank. Language and eligibility FAILs zero the score instead of hiding the gate."
          action={
            <Button asChild variant="secondary">
              <Link to="/jobs">Go to jobs</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{result.deferred} deferred past this batch.</p>
          {(result.shortlist.length ? result.shortlist : result.ranked).map((job) => (
            <Card key={job.key}>
              <CardContent className="space-y-2 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-head">{job.title}</p>
                  <StatusBadge value={job.status} />
                  <StatusBadge value={job.languageGate} />
                  <StatusBadge value={job.locationVerdict} />
                </div>
                <p className="text-sm">
                  {job.company} · {job.rankScore ?? "—"}/100
                </p>
                {job.gaps?.length ? <p className="text-sm">Gaps: {job.gaps.join(" · ")}</p> : null}
                <Button asChild size="sm">
                  <Link to={`/apply?jobKey=${encodeURIComponent(job.key)}`}>Evaluate & draft</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
