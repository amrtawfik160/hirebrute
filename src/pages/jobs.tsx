import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EmptyState, ErrorState, LoadingState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { api } from "@/lib/api"
import type { Job } from "../../shared/types"

export function JobsPage() {
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [query, setQuery] = useState("AI engineer")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function refresh() {
    const data = await api<{ jobs: Job[] }>("/api/jobs")
    setJobs(data.jobs)
  }

  useEffect(() => {
    refresh().catch((e: Error) => setError(e.message))
  }, [])

  async function scrape() {
    setBusy(true)
    try {
      const result = await api<{ fresh: Job[]; skipped: number; ran: string[] }>("/api/jobs/scrape", {
        method: "POST",
        body: JSON.stringify({ query }),
      })
      toast.success(`${result.fresh.length} new jobs from ${result.ran.join(", ") || "nowhere"}. ${result.skipped} skipped.`)
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Scrape failed")
    } finally {
      setBusy(false)
    }
  }

  if (error) return <ErrorState message={error} />
  if (!jobs) return <LoadingState label="Loading jobs" />

  return (
    <>
      <PageHeader
        kicker="scrape"
        title="Jobs"
        description="Public boards only. LinkedIn is not scraped. Tracker company+role pairs are skipped on the next run."
        actions={
          <>
            <Input value={query} onChange={(e) => setQuery(e.target.value)} className="w-52" />
            <Button onClick={scrape} disabled={busy}>
              {busy ? "Scraping…" : "Scrape boards"}
            </Button>
            <Button asChild variant="secondary">
              <Link to="/rank">Rank new jobs</Link>
            </Button>
          </>
        }
      />
      {jobs.length === 0 ? (
        <EmptyState
          title="No jobs stored yet"
          body="Run scrape. The demo board works offline. Other boards need the network."
          action={<Button onClick={scrape}>Scrape the demo board</Button>}
        />
      ) : (
        <div className="grid gap-3">
          {jobs.map((job) => (
            <Card key={job.key}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-head">{job.title}</p>
                  <p className="text-sm">
                    {job.company} · {job.location} · {job.portal}
                  </p>
                  <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{job.snippet || job.description.slice(0, 220)}</p>
                </div>
                <div className="flex flex-col items-start gap-2 sm:items-end">
                  <div className="flex flex-wrap gap-1">
                    <StatusBadge value={job.status} />
                    <StatusBadge value={job.languageGate} />
                    <StatusBadge value={job.locationVerdict} />
                  </div>
                  {job.rankScore != null ? <p className="font-head text-sm">{job.rankScore}/100</p> : null}
                  {job.languageNote ? <p className="max-w-xs text-xs">{job.languageNote}</p> : null}
                  <Button asChild size="sm" variant="outline">
                    <a href={job.url} target="_blank" rel="noreferrer">
                      Open posting
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
