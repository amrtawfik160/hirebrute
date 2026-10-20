import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyRobot } from "@/components/brand"
import { EmptyState, ErrorState, LoadingState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { api } from "@/lib/api"
import { pct, when } from "@/lib/format"
import type { Application, DashboardStats, HistoryEntry, Job } from "../../shared/types"

interface Dash {
  stats: DashboardStats
  recentApplications: Application[]
  recentJobs: Job[]
  history: HistoryEntry[]
  provider: string | null
  ready: boolean
}

export function DashboardPage() {
  const [data, setData] = useState<Dash | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    api<Dash>("/api/dashboard")
      .then(setData)
      .catch((e: Error) => setError(e.message))
  }, [])
  if (error) return <ErrorState message={error} />
  if (!data) return <LoadingState label="Loading dashboard" />
  const { stats } = data
  const max = Math.max(1, ...stats.funnel.map((f) => f.count))
  return (
    <>
      <PageHeader
        mark={<EmptyRobot className="h-24 sm:h-28" />}
        kicker="Today"
        title="Dashboard"
        description="Sent applications only. Drafts stay in their own count until you mark them sent. Declined offers and withdrawals are closed, not rejections."
        actions={
          <>
            <Button asChild>
              <Link to="/jobs">Scrape jobs</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/apply">Evaluate a posting</Link>
            </Button>
          </>
        }
      />
      {data.provider ? null : (
        <Card className="bg-primary">
          <CardContent className="py-4 text-sm">
            This workspace starts empty. Scrapes use the live boards. Choose a provider in Settings before you ask for a draft, an interview pack, or an upskill plan.
          </CardContent>
        </Card>
      )}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Sent" value={stats.sent} emphasis />
        <Stat label="Drafted" value={stats.drafted} />
        <Stat label="Interview" value={stats.interview} />
        <Stat label="Offer" value={stats.offer} />
        <Stat label="Rejection rate" value={pct(stats.rejectionRate)} />
      </div>
      <section className="space-y-4 border-2 border-black bg-card p-4 shadow-md">
        <h2 className="font-head text-lg">Funnel</h2>
        <div className="space-y-3">
          {stats.funnel.map((f) => (
            <div key={f.stage} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3">
              <span className="text-sm font-semibold">{f.stage}</span>
              <div className="h-4 border-2 border-black bg-white">
                <div
                  className="h-full bg-primary"
                  style={{ width: f.count ? `${Math.round((f.count / max) * 100)}%` : "0%" }}
                />
              </div>
              <span className="text-right font-head text-sm">{f.count}</span>
            </div>
          ))}
        </div>
      </section>
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className="space-y-3 border-2 border-black bg-card p-4 shadow-md">
          <h2 className="font-head text-lg">Recent applications</h2>
          {data.recentApplications.length ? (
            data.recentApplications.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 border-2 border-black bg-white px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate font-head text-sm">{a.company}</p>
                  <p className="truncate text-sm text-muted-foreground">{a.role}</p>
                </div>
                <StatusBadge value={a.status} />
              </div>
            ))
          ) : (
            <EmptyState art={false} title="No applications yet" body="Evaluate a posting and draft. Drafts stay out of Sent until you mark them sent." />
          )}
        </section>
        <section className="space-y-3 border-2 border-black bg-card p-4 shadow-md">
          <h2 className="font-head text-lg">Recent activity</h2>
          {data.history.length ? (
            data.history.map((h) => (
              <div key={h.id} className="min-w-0 border-b-2 border-black pb-3 last:border-0 last:pb-0">
                <p className="font-head text-sm leading-snug break-words">{h.title}</p>
                <p className="text-xs text-muted-foreground">{when(h.at)}</p>
                <p className="line-clamp-2 text-sm leading-relaxed break-words">{h.detail}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
          )}
        </section>
      </div>
    </>
  )
}

function Stat({ label, value, emphasis }: { label: string; value: string | number; emphasis?: boolean }) {
  return (
    <div className={`border-2 border-black p-4 shadow-md ${emphasis ? "bg-primary" : "bg-card"}`}>
      <p className="text-xs font-semibold tracking-wide uppercase">{label}</p>
      <p className="mt-2 font-head text-3xl leading-none break-words">{value}</p>
    </div>
  )
}
