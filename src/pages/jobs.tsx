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

interface BoardCount {
  id: string
  name: string
  fetched: number
  fresh: number
  error?: string
}

export function JobsPage() {
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [boards, setBoards] = useState<BoardCount[]>([])
  const [query, setQuery] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const started = useState({ current: false })[0]

  async function refresh() {
    const data = await api<{ jobs: Job[]; lastScrape: { boards: BoardCount[] } | null }>("/api/jobs")
    setJobs(data.jobs)
    if (data.lastScrape?.boards) setBoards(data.lastScrape.boards)
    return data
  }

  async function scrape(nextQuery = query) {
    setBusy(true)
    try {
      const result = await api<{ fresh: Job[]; skipped: number; ran: string[]; failed: { id: string; error: string }[]; boards: BoardCount[] }>(
        "/api/jobs/scrape",
        {
          method: "POST",
          body: JSON.stringify({ query: nextQuery }),
        },
      )
      setBoards(result.boards)
      const failed = result.failed.map((f) => `${f.id}: ${f.error}`).join("; ")
      if (result.failed.length && result.fresh.length === 0) {
        toast.error(`No new jobs. ${failed}`)
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

  useEffect(() => {
    refresh()
      .then((data) => {
        if (data.jobs.length > 0 || started.current) return
        if (sessionStorage.getItem("hirebrute-scraped")) return
        started.current = true
        sessionStorage.setItem("hirebrute-scraped", "1")
        void scrape("")
      })
      .catch((e: Error) => setError(e.message))
    // The first visit with an empty store starts one scrape.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (error) return <ErrorState message={error} />
  if (!jobs) return <LoadingState label="Loading jobs" />

  return (
    <>
      <PageHeader
        mark="search"
        kicker="Boards"
        title="Jobs"
        description="Public boards only. LinkedIn is not scraped. Roles already on your tracker are skipped."
        actions={
          <>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search query"
              placeholder="Keywords, optional"
              className="w-full sm:w-56"
            />
            <Button onClick={() => void scrape()} disabled={busy}>
              {busy ? "Scraping…" : "Scrape jobs"}
            </Button>
            <Button asChild variant="secondary">
              <Link to="/rank">Rank new jobs</Link>
            </Button>
          </>
        }
      />
      <BoardStrip jobs={jobs} boards={boards} busy={busy} />
      {jobs.length === 0 ? (
        <EmptyState
          title={busy ? "Scraping live boards" : "No jobs stored yet"}
          body="Leave keywords blank and press Scrape jobs. That pulls recent postings from Remotive, Arbeitnow, Remote OK, The Muse, and freehire. An empty profile does not filter them out. The first visit starts this scrape on its own."
          action={
            <Button onClick={() => void scrape()} disabled={busy}>
              {busy ? "Scraping…" : "Scrape jobs"}
            </Button>
          }
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

function BoardStrip({ jobs, boards, busy }: { jobs: Job[]; boards: BoardCount[]; busy: boolean }) {
  const stored = new Map<string, number>()
  for (const job of jobs) stored.set(job.portal, (stored.get(job.portal) || 0) + 1)
  if (!boards.length && !busy) return null
  const rows = boards.length ? boards : []
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((board) => {
        const count = stored.get(board.id) || 0
        return (
          <div
            key={board.id}
            className={`border-2 border-black px-3 py-2 shadow-sm ${board.error ? "bg-chart-4" : "bg-white"}`}
          >
            <p className="font-head text-sm">{board.name}</p>
            <p className="text-sm">{board.error ? friendlyBoardError(board.error) : `${count} jobs`}</p>
          </div>
        )
      })}
      {busy && !rows.length ? <p className="text-sm">Asking the live boards…</p> : null}
    </div>
  )
}

// Turns a raw portal error like "themuse 403" into a short, human label.
function friendlyBoardError(raw: string): string {
  const code = raw.match(/\b(\d{3})\b/)?.[1]
  if (/timed? ?out|timeout|aborted/i.test(raw)) return "Timed out"
  if (code === "403" || code === "401") return "Blocked by the board"
  if (code === "429") return "Rate limited, try later"
  if (code && code.startsWith("5")) return "Board unavailable"
  if (code) return `Unavailable (${code})`
  return "Unavailable"
}
