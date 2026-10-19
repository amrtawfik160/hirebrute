import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState, ErrorState, LoadingState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { api } from "@/lib/api"
import { when } from "@/lib/format"
import type { HistoryEntry } from "../../shared/types"

export function HistoryPage() {
  const [history, setHistory] = useState<HistoryEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    api<{ history: HistoryEntry[] }>("/api/history")
      .then((d) => setHistory(d.history))
      .catch((e: Error) => setError(e.message))
  }, [])
  if (error) return <ErrorState message={error} />
  if (!history) return <LoadingState label="Loading history" />
  return (
    <>
      <PageHeader kicker="history" title="History" description="Local activity log. Nothing here left this machine." />
      {history.length === 0 ? (
        <EmptyState title="Quiet so far" body="Scrape, rank, and apply write entries here." />
      ) : (
        <div className="space-y-2">
          {history.map((h) => (
            <Card key={h.id}>
              <CardContent className="py-3">
                <p className="font-head text-sm">{h.title}</p>
                <p className="text-xs text-muted-foreground">
                  {when(h.at)} · {h.kind}
                </p>
                <p className="text-sm">{h.detail}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
