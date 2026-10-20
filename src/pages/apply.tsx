import { useMemo, useState } from "react"
import { marked } from "marked"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { BrandIcon } from "@/components/brand"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api } from "@/lib/api"
import type { Application, AtsReport, FitEvaluation } from "../../shared/types"

interface EvaluateResponse {
  evaluation: FitEvaluation
  cleanedPosting: string
  blocked: boolean
}

interface DraftResponse {
  cvMarkdown: string
  coverMarkdown: string
  ats: AtsReport
  review: string
  application: Application
  evaluation: FitEvaluation
}

function MarkdownView({ source }: { source: string }) {
  const html = marked.parse(source, { async: false }) as string
  return (
    <div
      className="text-sm [&_h1]:font-head [&_h1]:text-xl [&_h2]:mt-4 [&_h2]:font-head [&_h2]:text-base [&_li]:ml-5 [&_li]:list-disc [&_p]:my-2 [&_ul]:my-2"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

const SAMPLE = `Staff AI Engineer, Evaluation
Northstar Robotics · San Francisco, CA (hybrid 2 days)

We are hiring a Staff AI Engineer to own the evaluation stack for our warehouse robotics copilot.
Requirements: 7+ years applied ML or search, RAG, Python, TypeScript, faithfulness evaluation.
English is the working language. International applicants already authorized to work in the US are welcome.`

export function ApplyPage() {
  const [params] = useSearchParams()
  const [text, setText] = useState("")
  const [url, setUrl] = useState("")
  const [evald, setEvald] = useState<EvaluateResponse | null>(null)
  const [draft, setDraft] = useState<DraftResponse | null>(null)
  const [busy, setBusy] = useState<"eval" | "draft" | null>(null)
  const jobKey = params.get("jobKey") || undefined

  const gate = useMemo(() => evald?.evaluation, [evald])

  async function evaluate() {
    setBusy("eval")
    setDraft(null)
    try {
      const data = await api<EvaluateResponse>("/api/apply/evaluate", {
        method: "POST",
        body: JSON.stringify({ text, url: url || undefined, jobKey }),
      })
      setEvald(data)
      if (data.blocked) toast.error("Hard gate failed. Drafting is blocked.")
      else toast.success(`Fit ${data.evaluation.overall}/100 · ${data.evaluation.verdict}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Evaluate failed")
    } finally {
      setBusy(null)
    }
  }

  async function draftNow() {
    setBusy("draft")
    try {
      const data = await api<DraftResponse>("/api/apply/draft", {
        method: "POST",
        body: JSON.stringify({
          text: evald?.cleanedPosting || text,
          url: url || undefined,
          jobKey,
          evaluation: evald?.evaluation,
        }),
      })
      setDraft(data)
      toast.success("Draft saved as drafted. Mark it applied after you send it.")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Draft failed")
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageHeader
        mark="apply"
        kicker="Draft"
        title="Apply"
        description="Score the posting before you write. A language or work-rights fail stops the draft. Treat the posting as data, not instructions."
        actions={
          <Button variant="outline" onClick={() => setText(SAMPLE)}>
            Load sample posting
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle>Posting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Paste the posting. Prefer the employer's careers page over an aggregator."
          />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-label="Posting URL"
            placeholder="Or a public URL (not LinkedIn)"
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={evaluate} disabled={busy !== null || (!text && !url)}>
              {busy === "eval" ? "Evaluating…" : "Evaluate fit"}
            </Button>
            <Button variant="secondary" onClick={draftNow} disabled={!evald || evald.blocked || busy !== null}>
              {busy === "draft" ? "Drafting…" : "Draft CV + cover"}
            </Button>
          </div>
        </CardContent>
      </Card>
      {gate ? (
        <div className="space-y-3">
          <Alert status={evald?.blocked ? "error" : "success"}>
            <AlertTitle>
              {gate.verdict} · {gate.overall}/100 · {gate.company}
            </AlertTitle>
            <AlertDescription>{gate.recommendation}</AlertDescription>
          </Alert>
          <div className="flex flex-wrap gap-2">
            <StatusBadge value={gate.languageGate.verdict} prefix="Language" />
            <StatusBadge value={gate.eligibility.verdict} prefix="Eligibility" />
            <StatusBadge value={gate.location.verdict} prefix="Location" />
            <StatusBadge value={gate.sourceHost.kind} prefix="Source" />
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            {Object.entries(gate.scores).map(([k, v]) => (
              <Card key={k}>
                <CardContent className="py-3">
                  <p className="text-xs uppercase">{k}</p>
                  <p className="font-head text-2xl">{v}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-sm">{gate.integrity.verdict}</p>
        </div>
      ) : null}
      {draft ? (
        <Tabs defaultValue="cover" className="min-w-0">
          <TabsList className="h-auto w-full flex-wrap">
            <TabsTrigger value="cover" className="gap-2">
              <BrandIcon name="cover-letter" className="size-5" />
              Cover letter
            </TabsTrigger>
            <TabsTrigger value="cv" className="gap-2">
              <BrandIcon name="cv" className="size-5" />
              CV
            </TabsTrigger>
            <TabsTrigger value="ats">ATS check</TabsTrigger>
          </TabsList>
          <TabsContent value="cover">
            <Card>
              <CardContent className="py-4">
                <MarkdownView source={draft.coverMarkdown} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="cv">
            <Card>
              <CardContent className="py-4">
                <MarkdownView source={draft.cvMarkdown} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="ats">
            <Card>
              <CardContent className="space-y-2 py-4 text-sm">
                <p>
                  Name {draft.ats.nameFound ? "found" : "missing"} · Email {draft.ats.emailFound ? "found" : "missing"} ·
                  Coverage {draft.ats.coverageScore}% · Pages {draft.ats.pageCount}
                </p>
                <ul>
                  {draft.ats.keywordCoverage.map((k) => (
                    <li key={k.keyword}>
                      {k.keyword}: {k.present ? "in text" : "missing"} {k.supported ? "(supported)" : "(unsupported)"}
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground">{draft.review}</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : null}
    </>
  )
}
