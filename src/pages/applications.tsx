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
        kicker="outcome"
        title="Applications"
        description="drafted means nothing was sent, so follow-ups are never due. Leaving drafted overwrites the applied-on date."
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
            <Card key={app.id}>
              <CardContent className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-head">{app.company}</p>
                  <p className="text-sm">
                    {app.role} · applied {app.status === "drafted" ? "(not sent)" : app.date}
                  </p>
                  <p className="text-xs text-muted-foreground">{app.notes || "No notes"}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge value={app.status} />
                  <Select
                    value={app.status}
                    onValueChange={async (status) => {
                      await api(`/api/applications/${app.id}/outcome`, {
                        method: "POST",
                        body: JSON.stringify({ status }),
                      })
                      toast.success(`${app.company} → ${status}`)
                      await refresh()
                    }}
                  >
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={app.status === "drafted"}
                    onClick={async () => {
                      const result = await api<{ text: string }>(`/api/applications/${app.id}/followup`, {
                        method: "POST",
                        body: JSON.stringify({}),
                      })
                      toast.success("Follow-up logged")
                      navigator.clipboard?.writeText(result.text).catch(() => undefined)
                      await refresh()
                    }}
                  >
                    Follow up
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
