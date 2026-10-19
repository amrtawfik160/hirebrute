import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { api, download } from "@/lib/api"
import type { GmailProposal } from "../../shared/types"

export function SyncPage() {
  const [text, setText] = useState("")
  const [proposals, setProposals] = useState<GmailProposal[]>([])
  const [picked, setPicked] = useState<string[]>([])
  const [notion, setNotion] = useState<{ pages: { company: string; role: string; status: string }[]; warning: string } | null>(
    null,
  )

  return (
    <>
      <PageHeader
        kicker="Inbox"
        title="Sync"
        description="Gmail is paste-then-approve. It never originates applications and never proposes hired or offer_declined. Notion is a one-way snapshot."
      />
      <Card>
        <CardHeader>
          <CardTitle>Paste recruiter threads</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste full email bodies. Subject-only snippets are not enough."
          />
          <Button
            onClick={async () => {
              const data = await api<{ proposals: GmailProposal[] }>("/api/gmail/propose", {
                method: "POST",
                body: JSON.stringify({ text }),
              })
              setProposals(data.proposals)
              setPicked(data.proposals.filter((p) => !p.needsManual).map((p) => p.id))
              toast.success(`${data.proposals.length} proposals. Nothing written yet.`)
            }}
          >
            Propose updates
          </Button>
          {proposals.map((p) => (
            <label key={p.id} className="flex items-start gap-2 border-2 border-black p-3 text-sm">
              <Checkbox
                checked={picked.includes(p.id)}
                onCheckedChange={(v) => setPicked((cur) => (v ? [...cur, p.id] : cur.filter((id) => id !== p.id)))}
              />
              <span>
                <span className="font-head">
                  {p.company} → {p.proposedStatus}
                </span>
                <StatusBadge value={p.confidence} />
                <span className="block text-muted-foreground">{p.reason}</span>
                <span className="block text-xs">{p.sourceExcerpt}</span>
              </span>
            </label>
          ))}
          {proposals.length ? (
            <Button
              variant="secondary"
              onClick={async () => {
                await api("/api/gmail/approve", {
                  method: "POST",
                  body: JSON.stringify({ ids: picked, proposals }),
                })
                toast.success("Approved rows written to the tracker")
                setProposals([])
              }}
            >
              Approve selected
            </Button>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Notion snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>The repo stays the system of record. Nothing syncs back from Notion.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                setNotion(await api("/api/notion/snapshot", { method: "POST" }))
              }}
            >
              Build snapshot
            </Button>
            <Button variant="outline" onClick={() => download("/api/export/html")}>
              HTML dashboard
            </Button>
            <Button variant="outline" onClick={() => download("/api/export/csv")}>
              Tracker CSV
            </Button>
            <Button variant="outline" onClick={() => download("/api/export/zip")}>
              Zip bundle
            </Button>
          </div>
          {notion ? (
            <div>
              <p>{notion.warning}</p>
              <ul className="mt-2 list-disc pl-5">
                {notion.pages.map((p) => (
                  <li key={`${p.company}-${p.role}`}>
                    {p.company} · {p.role} · {p.status}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </>
  )
}
