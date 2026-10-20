import fs from "node:fs"
import path from "node:path"
import cors from "cors"
import express from "express"
import { APP_NAME, PROVIDER_META } from "../shared/constants.ts"
import { dashboardStats } from "../shared/dashboard.ts"
import { profileReady } from "../shared/fit.ts"
import type { ApplicationStatus, PortalConfig, ProviderId, TemplateConfig } from "../shared/types.ts"
import { REPO_ROOT } from "./paths.ts"
import { detectProviders, generate, maskKey } from "./providers/registry.ts"
import {
  addHistory,
  loadStore,
  mutate,
  resetStore,
} from "./store.ts"
import { persistDraft } from "./workflows/apply.ts"
import { evaluatePosting } from "./workflows/evaluate.ts"
import { acceptExpand, expandFromDocuments } from "./workflows/expand.ts"
import { exportBundle, notionSnapshot, trackerCsv } from "./workflows/export.ts"
import { approveGmail, proposeGmail } from "./workflows/gmail.ts"
import { buildInterviewPack } from "./workflows/interview.ts"
import { scrapeAndStore } from "./workflows/jobs.ts"
import { addFollowUp, draftFollowUpText, quietApplications, recordOutcome, staleApplications } from "./workflows/outcome.ts"
import { rankJobs } from "./workflows/rank.ts"
import { addDocument, ingestDocuments, restoreDemo, saveProfile, startBlank } from "./workflows/setup.ts"
import { buildUpskill } from "./workflows/upskill.ts"

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: "8mb" }))

  app.get("/api/health", (_req, res) => {
    const store = loadStore()
    res.json({
      ok: true,
      name: APP_NAME,
      profile: store.profile.name || null,
      demo: Boolean(store.profile.isDemo),
      ready: profileReady(store.profile),
      provider: store.settings.activeProvider,
    })
  })

  app.get("/api/state", (_req, res) => {
    const store = loadStore()
    res.json(publicState(store))
  })

  app.get("/api/profile", (_req, res) => {
    res.json(loadStore().profile)
  })

  app.put("/api/profile", (req, res) => {
    res.json(saveProfile(req.body || {}))
  })

  app.post("/api/setup/ingest", async (req, res, next) => {
    try {
      const hasText = Boolean(String(req.body?.text || "").trim() || String(req.body?.interviewNotes || "").trim())
      if (!hasText && loadStore().documents.length === 0) {
        res.status(400).json({ error: "Paste a CV or notes before ingest." })
        return
      }
      if (req.body?.text) {
        addDocument({
          folder: req.body.folder || "cv",
          name: req.body.name || "pasted.txt",
          mime: "text/plain",
          text: req.body.text,
        })
      }
      res.json(await ingestDocuments({ interviewNotes: req.body?.interviewNotes }))
    } catch (err) {
      next(err)
    }
  })

  app.post("/api/setup/blank", (_req, res) => {
    res.json(startBlank())
  })

  app.post("/api/setup/demo", (_req, res) => {
    res.json(restoreDemo())
  })

  app.get("/api/providers", async (_req, res, next) => {
    try {
      const store = loadStore()
      const providers = await detectProviders()
      res.json({
        active: store.settings.activeProvider,
        providers: providers.map((p) => ({
          ...p,
          keyPreview: maskKey(store.settings.providers[p.id]?.apiKey),
          model: store.settings.providers[p.id]?.model,
        })),
      })
    } catch (err) {
      next(err)
    }
  })

  app.post("/api/providers/active", (req, res) => {
    const id = req.body?.id as ProviderId
    if (!id || !(id in PROVIDER_META)) {
      res.status(400).json({ error: "Unknown provider." })
      return
    }
    mutate((s) => {
      s.settings.activeProvider = id
    })
    addHistory({ kind: "settings", title: `Active provider: ${id}`, detail: "Keys stay on this machine." })
    res.json({ active: id })
  })

  app.put("/api/settings", (req, res) => {
    const body = req.body || {}
    mutate((s) => {
      if (body.activeProvider) s.settings.activeProvider = body.activeProvider
      if (typeof body.salaryEnabled === "boolean") s.settings.salaryEnabled = body.salaryEnabled
      if (body.notionDatabaseId !== undefined) s.settings.notionDatabaseId = body.notionDatabaseId
      if (body.notionToken) s.settings.notionToken = body.notionToken
      if (body.providers) {
        for (const [id, patch] of Object.entries(body.providers) as [ProviderId, { apiKey?: string; model?: string; bin?: string }][]) {
          s.settings.providers[id] = {
            ...s.settings.providers[id],
            ...patch,
            apiKey:
              patch.apiKey && !patch.apiKey.includes("•")
                ? patch.apiKey
                : s.settings.providers[id].apiKey,
          }
        }
      }
    })
    addHistory({ kind: "settings", title: "Settings saved", detail: "API keys written to data/store.json only." })
    res.json(publicSettings())
  })

  app.get("/api/settings", (_req, res) => {
    res.json(publicSettings())
  })

  app.post("/api/jobs/scrape", async (req, res, next) => {
    try {
      const result = await scrapeAndStore({
        query: req.body?.query,
        portals: req.body?.portals,
        limit: req.body?.limit,
      })
      res.json(result)
    } catch (err) {
      next(err)
    }
  })

  app.get("/api/jobs", (_req, res) => {
    res.json({ jobs: loadStore().jobs })
  })

  app.post("/api/jobs/rank", async (req, res, next) => {
    try {
      res.json(
        await rankJobs({
          focus: req.body?.focus,
          all: Boolean(req.body?.all),
          limit: req.body?.limit,
          top: req.body?.top,
        }),
      )
    } catch (err) {
      next(err)
    }
  })

  app.post("/api/apply/evaluate", async (req, res, next) => {
    try {
      const store = loadStore()
      const result = await evaluatePosting({
        source: req.body?.url ? "url" : "paste",
        text: req.body?.text,
        url: req.body?.url,
        profile: store.profile,
      })
      res.json(result)
    } catch (err) {
      next(err)
    }
  })

  app.post("/api/apply/draft", async (req, res, next) => {
    try {
      const store = loadStore()
      let posting = req.body?.text as string | undefined
      let evaluation = req.body?.evaluation
      if (!posting && req.body?.url) {
        const ev = await evaluatePosting({
          source: "url",
          url: req.body.url,
          profile: store.profile,
        })
        posting = ev.cleanedPosting
        evaluation = ev.evaluation
        if (ev.blocked) {
          res.status(400).json({ error: "Hard gate failed. Not drafting.", ...ev })
          return
        }
      }
      if (!posting) {
        res.status(400).json({ error: "Paste a posting or provide a URL." })
        return
      }
      if (!evaluation) {
        const ev = await evaluatePosting({ source: "paste", text: posting, profile: store.profile })
        evaluation = ev.evaluation
        posting = ev.cleanedPosting
      }
      const gateFailed =
        evaluation?.languageGate?.verdict === "FAIL" || evaluation?.eligibility?.verdict === "FAIL"
      if (gateFailed) {
        res.status(400).json({ error: "Hard gate failed. Not drafting.", evaluation })
        return
      }
      const persisted = await persistDraft({
        profile: store.profile,
        posting,
        company: req.body?.company || evaluation.company,
        role: req.body?.role || evaluation.role,
        evaluation,
        jobKey: req.body?.jobKey,
        source: req.body?.url || "paste",
        sector: req.body?.sector,
      })
      res.json({
        ...persisted.draft,
        application: persisted.application,
        evaluation,
      })
    } catch (err) {
      next(err)
    }
  })

  app.get("/api/applications", (_req, res) => {
    res.json({ applications: loadStore().applications })
  })

  app.post("/api/applications/:id/outcome", (req, res, next) => {
    try {
      res.json(
        recordOutcome({
          id: req.params.id,
          status: req.body?.status as ApplicationStatus,
          notes: req.body?.notes,
          contactPerson: req.body?.contactPerson,
          interview: req.body?.interview,
        }),
      )
    } catch (err) {
      next(err)
    }
  })

  app.post("/api/applications/:id/followup", async (req, res, next) => {
    try {
      let text = req.body?.text as string | undefined
      if (!text) {
        const app = loadStore().applications.find((a) => a.id === req.params.id)
        if (!app) throw new Error("Application not found")
        text = await draftFollowUpText(app)
      }
      res.json({ application: addFollowUp({ id: req.params.id, text, channel: req.body?.channel }), text })
    } catch (err) {
      next(err)
    }
  })

  app.get("/api/applications/quiet", (req, res) => {
    const days = Number(req.query.days || 10)
    res.json({ quiet: quietApplications(days), stale: staleApplications(Number(req.query.stale || 60)) })
  })

  app.post("/api/interview", async (req, res, next) => {
    try {
      res.json(
        await buildInterviewPack({
          applicationId: req.body?.applicationId,
          stage: req.body?.stage,
          format: req.body?.format,
          interviewers: req.body?.interviewers,
        }),
      )
    } catch (err) {
      next(err)
    }
  })

  app.get("/api/dashboard", (_req, res) => {
    const store = loadStore()
    res.json({
      stats: dashboardStats(store.applications),
      recentApplications: store.applications.slice(0, 8),
      recentJobs: store.jobs.slice(0, 8),
      history: store.history.slice(0, 12),
      provider: store.settings.activeProvider,
      ready: profileReady(store.profile),
    })
  })

  app.post("/api/upskill", async (req, res, next) => {
    try {
      res.json(await buildUpskill({ mode: req.body?.mode, target: req.body?.target }))
    } catch (err) {
      next(err)
    }
  })

  app.get("/api/upskill", (_req, res) => {
    res.json({ reports: loadStore().upskill })
  })

  app.post("/api/expand", async (req, res, next) => {
    try {
      res.json(await expandFromDocuments({ github: req.body?.github }))
    } catch (err) {
      next(err)
    }
  })

  app.post("/api/expand/accept", (req, res, next) => {
    try {
      res.json(acceptExpand(req.body || { skills: [], projects: [] }))
    } catch (err) {
      next(err)
    }
  })

  app.post("/api/gmail/propose", async (req, res, next) => {
    try {
      res.json({ proposals: await proposeGmail(req.body?.text || "") })
    } catch (err) {
      next(err)
    }
  })

  app.post("/api/gmail/approve", (req, res, next) => {
    try {
      res.json({ applications: approveGmail(req.body?.ids || [], req.body?.proposals || []) })
    } catch (err) {
      next(err)
    }
  })

  app.post("/api/notion/snapshot", (_req, res) => {
    res.json(notionSnapshot())
  })

  app.get("/api/export/:kind", async (req, res, next) => {
    try {
      const kind = req.params.kind as "json" | "csv" | "html" | "zip"
      if (!["json", "csv", "html", "zip"].includes(kind)) {
        res.status(400).json({ error: "kind must be json, csv, html, or zip" })
        return
      }
      const file = await exportBundle(kind)
      res.download(file.path, file.filename)
    } catch (err) {
      next(err)
    }
  })

  app.get("/api/tracker.csv", (_req, res) => {
    res.type("text/csv").send(trackerCsv(loadStore().applications))
  })

  app.get("/api/history", (_req, res) => {
    res.json({ history: loadStore().history })
  })

  app.get("/api/portals", (_req, res) => {
    res.json({ portals: loadStore().portals })
  })

  app.put("/api/portals", (req, res) => {
    mutate((s) => {
      if (Array.isArray(req.body?.portals)) s.portals = req.body.portals
    })
    addHistory({ kind: "settings", title: "Portals updated", detail: `${loadStore().portals.filter((p) => p.enabled).length} enabled.` })
    res.json({ portals: loadStore().portals })
  })

  app.post("/api/portals", (req, res) => {
    const portal: PortalConfig = {
      id: req.body?.id || `portal-${Date.now().toString(16)}`,
      name: req.body?.name || "Custom feed",
      enabled: true,
      kind: req.body?.kind || "rss",
      endpoint: req.body?.endpoint,
      queryParam: req.body?.queryParam,
      market: req.body?.market,
      warning: req.body?.warning,
      personalUseOnly: Boolean(req.body?.personalUseOnly),
    }
    mutate((s) => {
      s.portals.push(portal)
    })
    addHistory({ kind: "settings", title: `Added portal ${portal.name}`, detail: portal.endpoint || portal.kind })
    res.json(portal)
  })

  app.get("/api/templates", (_req, res) => {
    res.json({ templates: loadStore().templates })
  })

  app.put("/api/templates", (req, res) => {
    mutate((s) => {
      if (Array.isArray(req.body?.templates)) s.templates = req.body.templates
    })
    res.json({ templates: loadStore().templates })
  })

  app.post("/api/templates", (req, res) => {
    const template: TemplateConfig = {
      id: req.body?.id || `tpl-${Date.now().toString(16)}`,
      name: req.body?.name || "Custom template",
      kind: req.body?.kind || "cv",
      engine: req.body?.engine || "markdown-pdf",
      sourceExtension: req.body?.sourceExtension || ".md",
      compileCommand: req.body?.compileCommand,
      pageLimit: req.body?.pageLimit || (req.body?.kind === "cover" ? 1 : 2),
      styleNotes: req.body?.styleNotes || "",
      active: Boolean(req.body?.active),
    }
    mutate((s) => {
      if (template.active) {
        for (const t of s.templates) {
          if (t.kind === template.kind) t.active = false
        }
      }
      s.templates.push(template)
    })
    addHistory({ kind: "settings", title: `Added template ${template.name}`, detail: template.engine })
    res.json(template)
  })

  app.get("/api/documents", (_req, res) => {
    res.json({ documents: loadStore().documents })
  })

  app.post("/api/reset", (req, res) => {
    if (req.body?.confirm !== "RESET") {
      res.status(400).json({ error: "Type RESET in all caps to confirm. Nothing was changed." })
      return
    }
    const scope = req.body?.scope === "profile" || req.body?.scope === "documents" ? req.body.scope : "all"
    res.json({ cleared: resetStore(scope) })
  })

  app.post("/api/generate", async (req, res, next) => {
    try {
      const provider = req.body?.provider
      res.json(
        await generate({
          system: req.body?.system || "",
          prompt: req.body?.prompt || "",
          json: req.body?.json,
          provider: provider && provider in PROVIDER_META ? provider : undefined,
        }),
      )
    } catch (err) {
      next(err)
    }
  })

  const dist = path.join(REPO_ROOT, "dist")
  if (process.env.NODE_ENV === "production" && fs.existsSync(dist)) {
    app.use(express.static(dist))
    app.get(/.*/, (_req, res) => {
      res.sendFile(path.join(dist, "index.html"))
    })
  }

  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const message = err instanceof Error ? err.message : String(err)
    res.status(400).json({ error: message })
  })

  return app
}

function publicSettings() {
  const s = loadStore().settings
  return {
    activeProvider: s.activeProvider,
    salaryEnabled: s.salaryEnabled,
    notionDatabaseId: s.notionDatabaseId || "",
    notionConfigured: Boolean(s.notionToken),
    providers: Object.fromEntries(
      Object.entries(s.providers).map(([id, p]) => [
        id,
        { enabled: p.enabled, model: p.model, bin: p.bin, keyPreview: maskKey(p.apiKey) },
      ]),
    ),
  }
}

function publicState(store: ReturnType<typeof loadStore>) {
  return {
    profile: store.profile,
    jobs: store.jobs,
    applications: store.applications,
    history: store.history,
    portals: store.portals,
    templates: store.templates,
    documents: store.documents,
    upskill: store.upskill,
    settings: publicSettings(),
    stats: dashboardStats(store.applications),
  }
}
