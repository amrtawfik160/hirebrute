import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EmptyState, ErrorState, LoadingState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { api } from "@/lib/api"
import type { Application, ApplicationStatus } from "../../shared/types"

const STATUSES: ApplicationStatus[] = [
  "drafted",
  "applied",
  "interview",
  "offer",
  "hired",
  "rejected",
  "no_response",
  "offer_declined",
  "withdrawn",
]

export function ApplicationsPage() {
  const [apps, setApps] = useState<Application[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [quiet, setQuiet] = useState<Application[]>([])

  async function refresh() {
    const data = await api<{ applications: Application[] }>("/api/applications")
    setApps(data.applications)
    const q = await api<{ quiet: Application[] }>("/api/applications/quiet")
    setQuiet(q.quiet)
  }

  useEffect(() => {
    refresh().catch((e: Error) => setError(e.message))
  }, [])

  if (error) return <ErrorState message={error} />
  if (!apps) return <LoadingState label="Loading applications" />

  return (
    <>
      <PageHeader
        kicker="Tracker"
        title="Applications"
        description="Drafted means you have not sent it, so a follow-up is never due. Marking it sent records today's date as the day you applied."
      />
      {quiet.length ? (
        <Card className="bg-primary">
          <CardContent className="py-4 text-sm">
            {quiet.length} open applications have gone quiet. Drafted rows are not in this list.
          </CardContent>
        </Card>
      ) : null}
      {apps.length === 0 ? (
        <EmptyState title="Tracker is empty" body="Draft from Apply. Status stays drafted until you actually send the packet." />
      ) : (
        <div className="space-y-3">
          {apps.map((app) => (
            <article key={app.id} className="space-y-3 border-2 border-black bg-card p-4 shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-head text-lg leading-tight break-words">{app.company}</h2>
                  <p className="text-sm break-words">
                    {app.role} · {app.status === "drafted" ? "not sent" : `applied ${app.date}`}
                  </p>
                </div>
                <StatusBadge value={app.status} />
              </div>
              <p className="line-clamp-3 text-sm leading-relaxed break-words text-muted-foreground">{app.notes || "No notes yet."}</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <Select
                  value={app.status}
                  onValueChange={async (status) => {
                    await api(`/api/applications/${app.id}/outcome`, {
                      method: "POST",
                      body: JSON.stringify({ status }),
                    })
                    toast.success(`${app.company} is now ${status.replace(/_/g, " ")}`)
                    await refresh()
                  }}
                >
                  <SelectTrigger className="w-full sm:w-48" aria-label={`Status for ${app.company}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {app.status === "drafted" ? (
                  <Button
                    onClick={async () => {
                      await api(`/api/applications/${app.id}/outcome`, {
                        method: "POST",
                        body: JSON.stringify({ status: "applied" }),
                      })
                      toast.success(`${app.company} marked sent`)
                      await refresh()
                    }}
                  >
                    Mark sent
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const result = await api<{ text: string }>(`/api/applications/${app.id}/followup`, {
                        method: "POST",
                        body: JSON.stringify({}),
                      })
                      toast.success("Follow-up copied and logged")
                      navigator.clipboard?.writeText(result.text).catch(() => undefined)
                      await refresh()
                    }}
                  >
                    Write follow-up
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
