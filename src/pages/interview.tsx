import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { EmptyState, ErrorState, LoadingState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { api } from "@/lib/api"
import type { Application, InterviewPack } from "../../shared/types"

export function InterviewPage() {
  const [apps, setApps] = useState<Application[] | null>(null)
  const [selected, setSelected] = useState("")
  const [stage, setStage] = useState("screen")
  const [pack, setPack] = useState<InterviewPack | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api<{ applications: Application[] }>("/api/applications")
      .then((d) => {
        setApps(d.applications)
        const live = d.applications.find((a) => a.status !== "drafted")
        if (live) setSelected(live.id)
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  if (error) return <ErrorState message={error} />
  if (!apps) return <LoadingState label="Loading applications" />

  const live = apps.filter((a) => a.status !== "drafted")

  return (
    <>
      <PageHeader
        kicker="interview"
        title="Interview"
        description="Live processes only. Drafted rows never qualify. No claim in the room that is not on the paper."
      />
      {live.length === 0 ? (
        <EmptyState title="No live processes" body="Mark an application applied or interview before generating a pack." />
      ) : (
        <Card>
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-end">
            <label className="grid flex-1 gap-1 text-sm">
              Application
              <select className="h-9 border-2 bg-input px-2" value={selected} onChange={(e) => setSelected(e.target.value)}>
                {live.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.company} · {a.role} · {a.status}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Stage
              <Input value={stage} onChange={(e) => setStage(e.target.value)} className="w-40" />
            </label>
            <Button
              onClick={async () => {
                try {
                  setPack(
                    await api("/api/interview", {
                      method: "POST",
                      body: JSON.stringify({ applicationId: selected, stage }),
                    }),
                  )
                  toast.success("Interview pack ready")
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed")
                }
              }}
            >
              Build pack
            </Button>
          </CardContent>
        </Card>
      )}
      {pack ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Likely questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {pack.likelyQuestions.map((q) => (
                <div key={q.question}>
                  <p className="font-head">{q.question}</p>
                  <p>{q.answer}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Ask them</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 text-sm">
                {pack.questionsToAsk.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Tough questions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {pack.toughQuestions.map((q) => (
                <div key={q.question}>
                  <p className="font-head">{q.question}</p>
                  <p>{q.answer}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Consistency</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-5 text-sm">
                {pack.consistency.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">{pack.logistics}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </>
  )
}
