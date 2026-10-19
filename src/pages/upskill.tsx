import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { api } from "@/lib/api"
import type { UpskillReport } from "../../shared/types"

export function UpskillPage() {
  const [reports, setReports] = useState<UpskillReport[]>([])
  const [target, setTarget] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<{ reports: UpskillReport[] }>("/api/upskill")
      .then((d) => setReports(d.reports))
      .catch(() => undefined)
  }, [])

  async function run(mode: "aggregate" | "targeted") {
    setBusy(true)
    try {
      const report = await api<UpskillReport>("/api/upskill", {
        method: "POST",
        body: JSON.stringify({ mode, target: mode === "targeted" ? target : undefined }),
      })
      setReports((r) => [report, ...r])
      toast.success("Upskill report written locally")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed")
    } finally {
      setBusy(false)
    }
  }

  const latest = reports[0]
  return (
    <>
      <PageHeader
        kicker="upskill"
        title="Upskill"
        description="Recorded gaps beat inferred ones. Skills already on the profile are dropped. Course URLs are omitted unless a provider returns a real http link."
        actions={
          <>
            <Button onClick={() => run("aggregate")} disabled={busy}>
              Aggregate heatmap
            </Button>
            <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Targeted skill" className="w-48" />
            <Button variant="outline" onClick={() => run("targeted")} disabled={busy || !target}>
              Targeted
            </Button>
          </>
        }
      />
      {!latest ? (
        <EmptyState title="No reports yet" body="Rank a few jobs or draft applications so gaps have somewhere to come from." />
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Heatmap</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {latest.heatmap.map((h) => (
                <div key={h.skill} className="border-2 border-black px-3 py-2">
                  <p className="font-head text-sm">{h.skill}</p>
                  <p className="text-xs text-muted-foreground">{h.provenance}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {latest.plan.map((p) => (
                <div key={p.skill}>
                  <p className="font-head">{p.skill}</p>
                  <p>{p.why}</p>
                  <p className="text-muted-foreground">{p.hours} hours</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  )
}
