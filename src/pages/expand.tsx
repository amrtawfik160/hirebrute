import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { EmptyState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { api } from "@/lib/api"

interface Proposal {
  skills: { name: string; source: string; evidence: string; bucket: string }[]
  projects: { name: string; summary: string; stack: string[]; outcomes: string[] }[]
}

export function ExpandPage() {
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [pickedSkills, setPickedSkills] = useState<string[]>([])
  const [pickedProjects, setPickedProjects] = useState<string[]>([])

  return (
    <>
      <PageHeader
        kicker="Profile gaps"
        title="Expand"
        description="Reads uploaded CV, LinkedIn, diplomas, and references. Does not scan application archives. Nothing is written until you accept."
        actions={
          <Button
            onClick={async () => {
              try {
                const data = await api<Proposal>("/api/expand", { method: "POST", body: "{}" })
                setProposal(data)
                setPickedSkills(data.skills.map((s) => s.name))
                setPickedProjects(data.projects.map((p) => p.name))
                toast.success("Proposals ready. Review before accepting.")
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Expand failed")
              }
            }}
          >
            Propose additions
          </Button>
        }
      />
      {!proposal ? (
        <EmptyState title="No proposals yet" body="Ingest documents on Profile, then run expand. Public GitHub repos only for projects." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {proposal.skills.length === 0 ? <p className="text-sm">Nothing new.</p> : null}
              {proposal.skills.map((s) => (
                <label key={s.name} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={pickedSkills.includes(s.name)}
                    onCheckedChange={(v) =>
                      setPickedSkills((cur) => (v ? [...cur, s.name] : cur.filter((x) => x !== s.name)))
                    }
                  />
                  <span>
                    <span className="font-head">{s.name}</span> · {s.source} · {s.evidence}
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Projects</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {proposal.projects.length === 0 ? <p className="text-sm">No new public projects.</p> : null}
              {proposal.projects.map((p) => (
                <label key={p.name} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={pickedProjects.includes(p.name)}
                    onCheckedChange={(v) =>
                      setPickedProjects((cur) => (v ? [...cur, p.name] : cur.filter((x) => x !== p.name)))
                    }
                  />
                  <span>
                    <span className="font-head">{p.name}</span> · {p.summary}
                  </span>
                </label>
              ))}
            </CardContent>
          </Card>
          <Button
            onClick={async () => {
              try {
                await api("/api/expand/accept", {
                  method: "POST",
                  body: JSON.stringify({
                    skills: proposal.skills.filter((s) => pickedSkills.includes(s.name)),
                    projects: proposal.projects.filter((p) => pickedProjects.includes(p.name)),
                  }),
                })
                toast.success("Accepted additions were appended to the profile")
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Accept failed")
              }
            }}
          >
            Accept selected
          </Button>
        </div>
      )}
    </>
  )
}
