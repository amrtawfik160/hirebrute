import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState, ErrorState, LoadingState } from "@/components/empty-state"
import { JobCard } from "@/components/job-card"
import { PageHeader } from "@/components/page-header"
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
      const result = await api<{ fresh: Job[]; skipped: number; ran: string[]; failed: { id: string; error: string }[] }>(
        "/api/jobs/scrape",
        {
          method: "POST",
          body: JSON.stringify({ query }),
        },
      )
      const failed = result.failed.map((f) => f.id).join(", ")
      if (result.failed.length && result.fresh.length === 0) {
        toast.error(`No new jobs. These boards failed: ${failed}.`)
      } else {
        toast.success(
          `${result.fresh.length} new jobs from ${result.ran.join(", ") || "no boards"}. ${result.skipped} already seen.${failed ? ` Failed: ${failed}.` : ""}`,
        )
      }
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
        kicker="Boards"
        title="Jobs"
        description="Public boards and the offline demo board. LinkedIn is not scraped. Roles already on your tracker are skipped."
        actions={
          <>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search query"
              className="w-full sm:w-56"
            />
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
          body="Scrape the demo board to see ranked examples without a network. Other boards need the internet."
          action={<Button onClick={scrape}>Scrape the demo board</Button>}
        />
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <JobCard
              key={job.key}
              job={job}
              action={
                <Button asChild size="sm" variant="outline">
                  <a href={job.url} target="_blank" rel="noreferrer">
                    Open posting
                  </a>
                </Button>
              }
            />
          ))}
        </div>
      )}
    </>
  )
}
