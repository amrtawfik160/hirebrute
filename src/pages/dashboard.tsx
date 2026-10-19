import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
  return (
    <>
      <PageHeader
        kicker="html-report"
        title="Dashboard"
        description="Sent counts exclude drafts. offer_declined and withdrawn are closed, not rejections."
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Sent" value={stats.sent} />
        <Stat label="Drafted" value={stats.drafted} />
        <Stat label="Interview" value={stats.interview} />
        <Stat label="Offer" value={stats.offer} />
        <Stat label="Rejection rate" value={pct(stats.rejectionRate)} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Funnel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.funnel.map((f) => {
            const max = Math.max(1, stats.funnel[0]?.count || 1)
            return (
              <div key={f.stage}>
                <div className="mb-1 flex justify-between font-head text-sm">
                  <span>{f.stage}</span>
                  <span>{f.count}</span>
                </div>
                <div className="h-4 border-2 border-black bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${Math.round((f.count / max) * 100)}%` }} />
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent applications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentApplications.length ? (
              data.recentApplications.map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-3 border-2 border-black bg-muted/40 px-3 py-2">
                  <div>
                    <p className="font-head text-sm">{a.company}</p>
                    <p className="text-xs text-muted-foreground">{a.role}</p>
                  </div>
                  <StatusBadge value={a.status} />
                </div>
              ))
            ) : (
              <EmptyState title="No applications yet" body="Evaluate a posting and draft. Drafts stay out of Sent until you mark them applied." />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.history.length ? (
              data.history.map((h) => (
                <div key={h.id}>
                  <p className="font-head text-sm">{h.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {when(h.at)} · {h.detail}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs tracking-wide uppercase">{label}</p>
        <p className="font-head text-3xl">{value}</p>
      </CardContent>
    </Card>
  )
}
