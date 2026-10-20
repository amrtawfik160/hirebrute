import fs from "node:fs"
import path from "node:path"
import { archiveSlug } from "../../shared/jobKey.ts"
import type { Application, AtsReport, FitEvaluation, Profile } from "../../shared/types.ts"
import { csvSafe } from "../../shared/status.ts"
import { atsCheck, writePdf } from "../pdf.ts"
import { safeJson } from "../json.ts"
import { dataDir, ensureDir } from "../paths.ts"
import { generate } from "../providers/registry.ts"
import { addHistory, mutate } from "../store.ts"
import { evaluatePosting } from "./evaluate.ts"

export interface DraftInput {
  profile: Profile
  posting: string
  company: string
  role: string
}

export interface DraftResult {
  cvMarkdown: string
  coverMarkdown: string
  ats: AtsReport
  review: string
}

function profileFacts(profile: Profile): string {
  return [
    `Name: ${profile.name}`,
    `Email: ${profile.email}`,
    `Phone: ${profile.phone}`,
    `Location: ${profile.location}`,
    `Headline: ${profile.headline}`,
    `Authorization: ${profile.workAuthorization || profile.citizenship || ""}`,
    `Skills: ${[...profile.skills.primary, ...profile.skills.secondary].join(", ")}`,
    ...profile.experience.map(
      (e) => `${e.title}, ${e.company} (${e.start}–${e.end})\n${e.bullets.map((b) => `- ${b}`).join("\n")}`,
    ),
    ...profile.education.map((e) => `${e.degree} ${e.field}, ${e.institution} (${e.end})`),
    ...profile.projects.map((p) => `${p.name}: ${p.summary} ${p.outcomes.join("; ")}`),
  ].join("\n")
}

function groundedCv(profile: Profile, company: string, role: string): string {
  const links = [profile.github, profile.linkedin, profile.website].filter(Boolean).join(" · ")
  const skills = [...profile.skills.primary, ...profile.skills.secondary].join(", ")
  const exp = profile.experience
    .map((e) => {
      const bullets = e.bullets.map((b) => `- ${b}`).join("\n")
      return `### ${e.title}, ${e.company} (${e.start}–${e.end})\n${e.location}\n${bullets}`
    })
    .join("\n\n")
  const edu = profile.education
    .map((e) => `${e.degree} ${e.field}, ${e.institution} (${e.start}–${e.end})${e.thesis ? `. Thesis: ${e.thesis}` : ""}`)
    .join("\n")
  const projects = profile.projects
    .map((p) => `### ${p.name}\n${p.summary} Stack: ${p.stack.join(", ")}. ${p.outcomes.join("; ")}`)
    .join("\n\n")
  return `# ${profile.name}

**${role} candidate for ${company}**
${profile.location} · ${profile.email} · ${profile.phone}${links ? ` · ${links}` : ""}

## Profile
${profile.headline}. ${profile.status}

## Skills
${skills}

## Experience
${exp}

## Education
${edu}

${projects ? `## Projects\n${projects}\n` : ""}`
}

function groundedCover(profile: Profile, company: string, role: string, posting: string): string {
  const star = profile.starExamples[0]
  const first = profile.firstName || profile.name.split(" ")[0] || profile.name
  const why = /evaluat|retriev|rag|search/i.test(posting)
    ? "The posting asks for someone who owns a quality bar, not a demo. That is the work I already do."
    : "I am applying because the role matches the applied-AI work I already ship."
  const result = star
    ? `${star.result}`
    : profile.experience[0]?.bullets[0] || "I ship measured systems, not slides."
  return `Dear Hiring Manager,

I am applying for ${role} at ${company}. ${why}

## Why this team
${posting.split("\n").slice(0, 4).join(" ").slice(0, 280)}

## What I would solve first
${star ? `- ${star.action}` : `- Map the launch bar to the work described in the posting.`}
- Put the quality number somewhere the team can read it every day.
- Be honest about gaps instead of stretching the CV.

${result}

I would welcome a conversation about how you currently decide a model or system is ready.

Sincerely,
${first} ${profile.lastName || ""}
`.replace(/\u2014/g, "-")
}

function sanitizeCover(text: string): string {
  return text
    .replace(/\u2014/g, "-")
    .replace(/\u2013/g, "-")
    .replace(/passionate about/gi, "focused on")
    .replace(/I am passionate/gi, "I care")
}

function inventsFacts(text: string, profile: Profile): boolean {
  const corpus = profileFacts(profile).toLowerCase()
  const invented = ["warehouse floor lead", "invented award", "fake startup"]
  if (invented.some((p) => text.toLowerCase().includes(p) && !corpus.includes(p))) return true
  if (!text.toLowerCase().includes(profile.name.toLowerCase())) return true
  return false
}

export async function draftApplication(input: DraftInput): Promise<DraftResult> {
  const baseCv = groundedCv(input.profile, input.company, input.role)
  const baseCover = sanitizeCover(groundedCover(input.profile, input.company, input.role, input.posting))
  let cvMarkdown = baseCv
  let coverMarkdown = baseCover
  let review = "Grounded local draft. Live providers can rewrite phrasing; they cannot add facts."

  try {
    const facts = profileFacts(input.profile)
    const generated = await generate({
      system:
        "You tailor a curriculum vitae. Use only facts from the profile. Never invent titles, companies, or metrics. Return markdown only.",
      prompt: `Role: ${input.role}\nCompany: ${input.company}\n\nPROFILE\n${facts}\n\nPOSTING\n${input.posting}\n\nWrite the CV markdown.`,
    })
    if (generated.text.length > 80 && !inventsFacts(generated.text, input.profile)) {
      cvMarkdown = generated.text
    }
    const coverGen = await generate({
      system:
        "You write one-page cover letters. No em dashes. No 'passionate about'. Use posting language. Facts only from the profile.",
      prompt: `Role: ${input.role}\nCompany: ${input.company}\nName: ${input.profile.name}\n\nPROFILE\n${facts}\n\nPOSTING\n${input.posting}\n\nWrite the cover letter.`,
    })
    const cleaned = sanitizeCover(coverGen.text)
    if (cleaned.length > 80 && !cleaned.toLowerCase().includes("warehouse floor lead")) {
      coverMarkdown = cleaned
    }
    const reviewGen = await generate({
      system: "You are the reviewer. Return structured edits as JSON.",
      prompt: `Reviewer pass for ${input.company} ${input.role}.\nCV:\n${cvMarkdown}\n\nCOVER:\n${coverMarkdown}`,
      json: true,
    })
    const parsed = safeJson<{ comments?: string[] }>(reviewGen.text, {})
    if (parsed.comments?.length) review = parsed.comments.join(" ")
    else review = reviewGen.text.slice(0, 600)
  } catch (e) {
    // No model available, or the provider call failed. Keep the grounded local
    // draft, but say so plainly instead of pretending a model ran.
    const reason = e instanceof Error ? e.message : String(e)
    review = `Local draft only — no model rewrite. ${reason}`.slice(0, 600)
  }

  const ats = atsCheck(cvMarkdown, input.profile, input.posting)
  return { cvMarkdown, coverMarkdown, ats, review }
}

export async function persistDraft(opts: {
  profile: Profile
  posting: string
  company: string
  role: string
  evaluation?: FitEvaluation
  jobKey?: string
  source?: string
  sector?: string
}): Promise<{ application: Application; draft: DraftResult }> {
  const draft = await draftApplication({
    profile: opts.profile,
    posting: opts.posting,
    company: opts.company,
    role: opts.role,
  })
  const slug = archiveSlug(opts.company, opts.role) || `draft-${Date.now()}`
  const folder = path.join(dataDir(), "applications", slug)
  ensureDir(folder)
  const cvName = `cv_${slug}.md`
  const coverName = `cover_${slug}.md`
  fs.writeFileSync(path.join(folder, cvName), draft.cvMarkdown)
  fs.writeFileSync(path.join(folder, coverName), draft.coverMarkdown)
  fs.writeFileSync(path.join(folder, "posting.txt"), opts.posting)
  await writePdf(draft.cvMarkdown, path.join(folder, `cv_${slug}.pdf`))
  await writePdf(draft.coverMarkdown, path.join(folder, `cover_${slug}.pdf`))
  const now = new Date().toISOString()
  const application: Application = {
    id: `app-${Date.now().toString(16)}`,
    date: now.slice(0, 10),
    company: opts.company,
    sector: opts.sector || opts.evaluation?.company || "",
    role: opts.role,
    roleType: /staff|principal/i.test(opts.role) ? "staff" : "ic",
    channel: "online",
    status: "drafted",
    contactPerson: "",
    fitRating: opts.evaluation?.overall ?? null,
    notes: csvSafe(opts.evaluation?.recommendation || ""),
    cvFile: cvName,
    coverLetterFile: coverName,
    source: opts.source || "",
    deadline: opts.evaluation?.deadline || "",
    jobKey: opts.jobKey,
    slug,
    followUps: [],
    interviews: [],
    archive: {
      posting: opts.posting,
      cvMarkdown: draft.cvMarkdown,
      coverMarkdown: draft.coverMarkdown,
      evaluation: opts.evaluation,
      review: draft.review,
      ats: draft.ats,
    },
    createdAt: now,
    updatedAt: now,
  }
  mutate((s) => {
    s.applications.unshift(application)
    if (opts.jobKey) {
      const job = s.jobs.find((j) => j.key === opts.jobKey)
      if (job) job.status = "applied"
    }
  })
  addHistory({
    kind: "apply",
    title: `Drafted ${opts.role} at ${opts.company}`,
    detail: `ATS coverage ${draft.ats.coverageScore}%. Status is drafted until you mark it sent.`,
    ref: application.id,
  })
  return { application, draft }
}

export async function evaluateAndMaybeDraft(opts: {
  text?: string
  url?: string
  jobKey?: string
  draft?: boolean
}): Promise<{
  evaluation: FitEvaluation
  cleanedPosting: string
  blocked: boolean
  draft?: DraftResult
  application?: Application
}> {
  const { loadStore } = await import("../store.ts")
  const store = loadStore()
  const evaluated = await evaluatePosting({
    source: opts.url ? "url" : "paste",
    text: opts.text,
    url: opts.url,
    profile: store.profile,
  })
  if (!opts.draft || evaluated.blocked) {
    return evaluated
  }
  const persisted = await persistDraft({
    profile: store.profile,
    posting: evaluated.cleanedPosting,
    company: evaluated.evaluation.company,
    role: evaluated.evaluation.role,
    evaluation: evaluated.evaluation,
    jobKey: opts.jobKey,
    source: opts.url || "paste",
  })
  return {
    ...evaluated,
    draft: persisted.draft,
    application: persisted.application,
  }
}
