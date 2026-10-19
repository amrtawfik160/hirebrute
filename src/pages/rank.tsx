import { useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/empty-state"
import { JobCard } from "@/components/job-card"
import { PageHeader } from "@/components/page-header"
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

  const rows = result ? (result.shortlist.length ? result.shortlist : result.ranked) : []

  return (
    <>
      <PageHeader
        kicker="Shortlist"
        title="Rank"
        description="Triage scores from the posting and your profile. Apply still re-scores the one you choose. Roles already tracked are left out."
        actions={
          <>
            <Input
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="Optional focus"
              aria-label="Focus"
              className="w-full sm:w-56"
            />
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
          body="Scrape first, then rank. A language or eligibility fail sets the score to zero and says why."
          action={
            <Button asChild variant="secondary">
              <Link to="/jobs">Go to jobs</Link>
            </Button>
          }
        />
      ) : rows.length === 0 ? (
        <EmptyState title="No jobs matched" body={`${result.deferred} stayed in the backlog. Scrape again or clear the focus.`} />
      ) : (
        <div className="grid gap-4">
          <p className="text-sm text-muted-foreground">{result.deferred} left for a later batch.</p>
          {rows.map((job) => (
            <JobCard
              key={job.key}
              job={job}
              showGaps
              action={
                <Button asChild size="sm">
                  <Link to={`/apply?jobKey=${encodeURIComponent(job.key)}`}>Evaluate and draft</Link>
                </Button>
              }
            />
          ))}
        </div>
      )}
    </>
  )
}
