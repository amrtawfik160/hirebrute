import { describe, expect, it } from "vitest"
import { call, SAMPLE_POSTING, CV_PASTE, withApi } from "./support.ts"

describe("api flows", () => {
  it("starts empty and rejects an empty ingest", async () => {
    await withApi(async (base) => {
      const health = await call(base, "/api/health")
      expect(health.status).toBe(200)
      expect(health.json.profile).toBeNull()
      expect(health.json.demo).toBe(false)
      expect(health.json.provider).toBeNull()

      const empty = await call(base, "/api/setup/ingest", { method: "POST", json: { text: "   " } })
      expect(empty.status).toBe(400)
      expect(empty.json.error).toMatch(/Paste a CV/)
    })
  })

  it("saves a profile, ingests a pasted CV, and keeps the new facts", async () => {
    await withApi(async (base) => {
      const saved = await call(base, "/api/profile", {
        method: "PUT",
        json: { headline: "Eval lead" },
      })
      expect(saved.status).toBe(200)
      expect(saved.json.headline).toBe("Eval lead")
      expect(saved.json.isDemo).toBe(false)

      const ingested = await call(base, "/api/setup/ingest", {
        method: "POST",
        json: { text: CV_PASTE, folder: "cv", name: "pasted-cv.txt" },
      })
      expect(ingested.status).toBe(200)
      expect(ingested.json.name).toBe("Jordan Hale")
      expect(ingested.json.email).toBe("jordan.hale@example.com")
      expect(ingested.json.headline).toBe("Platform engineer who keeps deploy bars honest")
      expect(ingested.json.skills.primary).toContain("Go")
      expect(ingested.json.skills.primary).toContain("span sampling")
      expect(ingested.json.skills.primary).not.toContain("Python")

      const docs = await call(base, "/api/documents")
      expect(docs.json.documents.some((d: { name: string }) => d.name === "pasted-cv.txt")).toBe(true)
    })
  })

  it("scrapes the demo board, ranks a language fail to zero, and keeps a location fail scored", async () => {
    await withApi(async (base) => {
      const scraped = await call(base, "/api/jobs/scrape", {
        method: "POST",
        json: { query: "AI engineer", portals: ["mock"], limit: 10 },
      })
      expect(scraped.status).toBe(200)
      expect(scraped.json.ran).toEqual(["mock"])
      expect(scraped.json.fresh.length).toBeGreaterThan(0)
      expect(scraped.json.failed).toEqual([])

      const ranked = await call(base, "/api/jobs/rank", {
        method: "POST",
        json: { all: true, limit: 10, top: 10 },
      })
      expect(ranked.status).toBe(200)
      const lumen = ranked.json.ranked.find((j: { company: string }) => j.company === "Lumenfold")
      const paper = ranked.json.ranked.find((j: { company: string }) => j.company === "Paperkite")
      expect(lumen.languageGate).toBe("FAIL")
      expect(lumen.rankScore).toBe(0)
      expect(lumen.gaps.join(" ")).toMatch(/German/i)
      expect(paper.locationVerdict).toBe("FAIL")
      expect(paper.rankScore).toBeGreaterThan(0)
    })
  })

  it("reports a dead custom board instead of pretending it returned nothing", async () => {
    await withApi(async (base) => {
      const added = await call(base, "/api/portals", {
        method: "POST",
        json: { id: "dead-feed", name: "Dead feed", kind: "rss", endpoint: "http://127.0.0.1:1/feed" },
      })
      expect(added.status).toBe(200)
      const scraped = await call(base, "/api/jobs/scrape", {
        method: "POST",
        json: { portals: ["dead-feed"], query: "engineer" },
      })
      expect(scraped.status).toBe(200)
      expect(scraped.json.fresh).toEqual([])
      expect(scraped.json.failed).toHaveLength(1)
      expect(scraped.json.failed[0].id).toBe("dead-feed")
      expect(scraped.json.ran).not.toContain("dead-feed")
    })
  })

  it("evaluates, blocks a hard gate, then drafts CV, cover, review, and an ATS check", async () => {
    await withApi(async (base) => {
      await call(base, "/api/setup/demo", { method: "POST" })
      const blocked = await call(base, "/api/apply/evaluate", {
        method: "POST",
        json: {
          text: "Backend Engineer\nBerlin GmbH · Berlin\n\nFluent German required. Must speak German with the local team.",
        },
      })
      expect(blocked.status).toBe(200)
      expect(blocked.json.blocked).toBe(true)
      expect(blocked.json.evaluation.overall).toBe(0)

      const refused = await call(base, "/api/apply/draft", {
        method: "POST",
        json: { text: blocked.json.cleanedPosting, evaluation: blocked.json.evaluation },
      })
      expect(refused.status).toBe(400)

      const fit = await call(base, "/api/apply/evaluate", { method: "POST", json: { text: SAMPLE_POSTING } })
      expect(fit.json.blocked).toBe(false)
      expect(fit.json.evaluation.company).toBe("Northstar Robotics")
      expect(fit.json.evaluation.overall).toBeGreaterThan(0)

      const draft = await call(base, "/api/apply/draft", {
        method: "POST",
        json: { text: fit.json.cleanedPosting, evaluation: fit.json.evaluation },
      })
      expect(draft.status).toBe(200)
      expect(draft.json.cvMarkdown).toMatch(/Amira Cole/)
      expect(draft.json.coverMarkdown.toLowerCase()).toMatch(/northstar/)
      expect(draft.json.review.length).toBeGreaterThan(10)
      expect(draft.json.ats.nameFound).toBe(true)
      expect(draft.json.ats.emailFound).toBe(true)
      expect(draft.json.application.status).toBe("drafted")

      const dash = await call(base, "/api/dashboard")
      expect(dash.json.stats.drafted).toBe(1)
      expect(dash.json.stats.sent).toBe(0)
    })
  })

  it("changes status, writes a follow-up, and refuses a follow-up on a draft", async () => {
    await withApi(async (base) => {
      const fit = await call(base, "/api/apply/evaluate", { method: "POST", json: { text: SAMPLE_POSTING } })
      const draft = await call(base, "/api/apply/draft", {
        method: "POST",
        json: { text: fit.json.cleanedPosting, evaluation: fit.json.evaluation },
      })
      const id = draft.json.application.id
      const early = await call(base, `/api/applications/${id}/followup`, { method: "POST", json: {} })
      expect(early.status).toBe(400)
      expect(early.json.error).toMatch(/Drafted/)

      const sent = await call(base, `/api/applications/${id}/outcome`, {
        method: "POST",
        json: { status: "applied", notes: "Sent from the careers page" },
      })
      expect(sent.json.status).toBe("applied")
      expect(sent.json.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)

      const follow = await call(base, `/api/applications/${id}/followup`, { method: "POST", json: {} })
      expect(follow.status).toBe(200)
      expect(follow.json.text).toMatch(/Northstar/)
      expect(follow.json.application.followUps).toHaveLength(1)

      const interview = await call(base, `/api/applications/${id}/outcome`, {
        method: "POST",
        json: { status: "interview" },
      })
      expect(interview.json.status).toBe("interview")

      const unknown = await call(base, `/api/applications/${id}/outcome`, {
        method: "POST",
        json: { status: "maybe" },
      })
      expect(unknown.status).toBe(400)
    })
  })

  it("builds an interview pack, an upskill report, and accepted expand rows", async () => {
    await withApi(async (base) => {
      await call(base, "/api/providers/active", { method: "POST", json: { id: "mock" } })
      await call(base, "/api/setup/ingest", { method: "POST", json: { text: CV_PASTE, folder: "cv", name: "cv.txt" } })
      const fit = await call(base, "/api/apply/evaluate", { method: "POST", json: { text: SAMPLE_POSTING } })
      const draft = await call(base, "/api/apply/draft", {
        method: "POST",
        json: { text: fit.json.cleanedPosting, evaluation: fit.json.evaluation },
      })
      const id = draft.json.application.id
      await call(base, `/api/applications/${id}/outcome`, { method: "POST", json: { status: "applied" } })

      const pack = await call(base, "/api/interview", {
        method: "POST",
        json: { applicationId: id, stage: "onsite" },
      })
      expect(pack.status).toBe(200)
      expect(pack.json.likelyQuestions.length).toBeGreaterThan(0)
      expect(pack.json.questionsToAsk.length).toBeGreaterThan(0)
      expect(pack.json.stage).toBe("onsite")

      const drafted = await call(base, "/api/apply/draft", {
        method: "POST",
        json: { text: fit.json.cleanedPosting, evaluation: fit.json.evaluation, company: "Other Co", role: "IC" },
      })
      const blockedPack = await call(base, "/api/interview", {
        method: "POST",
        json: { applicationId: drafted.json.application.id },
      })
      expect(blockedPack.status).toBe(400)

      const up = await call(base, "/api/upskill", { method: "POST", json: { mode: "targeted", target: "warehouse robotics" } })
      expect(up.json.heatmap[0].skill).toBe("warehouse robotics")
      expect(up.json.plan[0].skill).toBe("warehouse robotics")
      const aggregate = await call(base, "/api/upskill", { method: "POST", json: { mode: "aggregate" } })
      expect(aggregate.json.heatmap[0].skill).toBe("robotics perception")
      expect(aggregate.json.heatmap.some((h: { skill: string }) => /valid json/i.test(h.skill))).toBe(false)

      const proposal = await call(base, "/api/expand", { method: "POST", json: {} })
      expect(proposal.json.skills.map((s: { name: string }) => s.name)).toContain("span sampling")
      expect(proposal.json.projects.map((p: { name: string }) => p.name)).toContain("Nightly Gate")
      const accepted = await call(base, "/api/expand/accept", {
        method: "POST",
        json: { skills: proposal.json.skills, projects: proposal.json.projects },
      })
      expect(accepted.json.skills.primary).toContain("span sampling")
      expect(accepted.json.projects.some((p: { name: string }) => p.name === "Nightly Gate")).toBe(true)
    })
  })

  it("exports HTML, builds a Notion snapshot, and applies an approved Gmail update", async () => {
    await withApi(async (base) => {
      const fit = await call(base, "/api/apply/evaluate", { method: "POST", json: { text: SAMPLE_POSTING } })
      const draft = await call(base, "/api/apply/draft", {
        method: "POST",
        json: { text: fit.json.cleanedPosting, evaluation: fit.json.evaluation },
      })
      const id = draft.json.application.id
      await call(base, `/api/applications/${id}/outcome`, { method: "POST", json: { status: "applied" } })

      const none = await call(base, "/api/gmail/propose", { method: "POST", json: { text: "" } })
      expect(none.json.proposals).toEqual([])

      const proposed = await call(base, "/api/gmail/propose", {
        method: "POST",
        json: {
          text: "From: recruiter@northstar.test\n\nWe are pleased to offer you the Staff AI Engineer role at Northstar Robotics.",
        },
      })
      expect(proposed.json.proposals).toHaveLength(1)
      expect(proposed.json.proposals[0].proposedStatus).toBe("offer")

      const hired = await call(base, "/api/gmail/approve", {
        method: "POST",
        json: {
          ids: ["forged"],
          proposals: [
            {
              id: "forged",
              applicationId: id,
              company: "Northstar Robotics",
              role: "Staff AI Engineer, Evaluation",
              proposedStatus: "hired",
              reason: "forged",
              sourceExcerpt: "hired",
              confidence: "high",
              needsManual: false,
            },
          ],
        },
      })
      expect(hired.json.applications).toEqual([])
      const still = await call(base, "/api/applications")
      expect(still.json.applications.find((a: { id: string }) => a.id === id).status).toBe("applied")

      const approved = await call(base, "/api/gmail/approve", {
        method: "POST",
        json: { ids: [proposed.json.proposals[0].id], proposals: proposed.json.proposals },
      })
      expect(approved.json.applications[0].status).toBe("offer")

      const html = await call(base, "/api/export/html")
      expect(html.status).toBe(200)
      expect(html.headers.get("content-type")).toMatch(/html/)
      expect(html.text).toMatch(/Northstar Robotics/)
      expect(html.text).toMatch(/<html/i)

      const csv = await call(base, "/api/export/csv")
      expect(csv.text).toMatch(/Northstar Robotics/)

      const zip = await fetch(`${base}/api/export/zip`)
      expect(zip.status).toBe(200)
      const bytes = new Uint8Array(await zip.arrayBuffer())
      expect(String.fromCharCode(bytes[0], bytes[1])).toBe("PK")

      const notion = await call(base, "/api/notion/snapshot", { method: "POST" })
      expect(notion.json.pages.some((p: { company: string; status: string }) => p.company === "Northstar Robotics" && p.status === "offer")).toBe(true)
      expect(notion.json.warning).toMatch(/one-way/)

      const dash = await call(base, "/api/dashboard")
      expect(dash.json.stats.sent).toBe(1)
      expect(dash.json.stats.offer).toBe(1)
      expect(dash.json.stats.drafted).toBe(0)
    })
  })

  it("refuses Gmail when the tracker is empty", async () => {
    await withApi(async (base) => {
      const res = await call(base, "/api/gmail/propose", {
        method: "POST",
        json: { text: "From: a@example.com\n\nWe are pleased to offer you the role at Nowhere Inc." },
      })
      expect(res.status).toBe(400)
      expect(res.json.error).toMatch(/never originates/)
    })
  })

  it("adds a portal and a template, then resets only when the word is RESET", async () => {
    await withApi(async (base) => {
      const portal = await call(base, "/api/portals", {
        method: "POST",
        json: { name: "Example jobs", endpoint: "https://example.com/jobs.rss", kind: "rss" },
      })
      expect(portal.json.name).toBe("Example jobs")
      const template = await call(base, "/api/templates", {
        method: "POST",
        json: { name: "Compact CV", kind: "cv", engine: "markdown-pdf", active: true },
      })
      expect(template.json.name).toBe("Compact CV")
      const listed = await call(base, "/api/templates")
      expect(listed.json.templates.filter((t: { kind: string; active: boolean }) => t.kind === "cv" && t.active)).toHaveLength(1)

      await call(base, "/api/jobs/scrape", { method: "POST", json: { portals: ["mock"] } })
      const nope = await call(base, "/api/reset", { method: "POST", json: { confirm: "reset", scope: "all" } })
      expect(nope.status).toBe(400)
      const jobs = await call(base, "/api/jobs")
      expect(jobs.json.jobs.length).toBeGreaterThan(0)

      const cleared = await call(base, "/api/reset", { method: "POST", json: { confirm: "RESET", scope: "all" } })
      expect(cleared.json.cleared).toContain("jobs")
      const after = await call(base, "/api/jobs")
      expect(after.json.jobs).toEqual([])
      const profile = await call(base, "/api/profile")
      expect(profile.json.name).toBe("")
      const history = await call(base, "/api/history")
      expect(history.json.history[0].title).toMatch(/Reset all/)
    })
  })

  it("scrapes at least one live public board", async () => {
    await withApi(async (base) => {
      const scraped = await call(base, "/api/jobs/scrape", {
        method: "POST",
        json: { query: "engineer", portals: ["remotive"], limit: 5 },
      })
      expect(scraped.status).toBe(200)
      expect(scraped.json.failed).toEqual([])
      expect(scraped.json.ran).toContain("remotive")
      expect(scraped.json.fresh.length).toBeGreaterThan(0)
      expect(scraped.json.fresh[0].url).toMatch(/^https?:\/\//)
      expect(scraped.json.fresh[0].portal).toBe("remotive")
    })
  }, 30_000)
})
