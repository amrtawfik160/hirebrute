import type { Application, InterviewPack, Profile } from "../../shared/types.ts"
import { postingGuard } from "../../shared/postingGuard.ts"
import { safeJson } from "../json.ts"
import { generate } from "../providers/registry.ts"
import { addHistory, loadStore, mutate } from "../store.ts"

export function interviewEligible(app: Application): boolean {
  if (app.status === "drafted") return false
  return ["interview", "offer", "applied", "hired"].includes(app.status) || app.interviews.length > 0
}

export async function buildInterviewPack(opts: {
  applicationId: string
  stage?: string
  format?: string
  interviewers?: string
}): Promise<InterviewPack> {
  const store = loadStore()
  const app = store.applications.find((a) => a.id === opts.applicationId)
  if (!app) throw new Error("Application not found")
  if (!interviewEligible(app)) {
    throw new Error("Drafted applications are not live processes. Mark the application sent first.")
  }
  const posting = postingGuard(app.archive.posting || "", "text").cleaned
  const profile = store.profile
  const stage = opts.stage || app.interviews.at(-1)?.stage || "screen"
  let pack: InterviewPack = fallbackPack(app, profile, stage, opts.format || "video", opts.interviewers || "")
  try {
    const { text } = await generate({
      system: "Build an interview pack. JSON only. Never invent experience. Map STARs from the profile.",
      prompt: `Interview pack.\nStage: ${stage}\nRole: ${app.role}\nCompany: ${app.company}\nPOSTING:\n${posting}\nSTARS:\n${JSON.stringify(profile.starExamples)}\nGAPS:\n${JSON.stringify(app.archive.evaluation?.gaps || [])}`,
      json: true,
    })
    const parsed = safeJson<Partial<InterviewPack>>(text, {})
    pack = {
      ...pack,
      ...parsed,
      applicationId: app.id,
      stage,
      format: opts.format || pack.format,
      interviewers: opts.interviewers || pack.interviewers,
    }
  } catch {
    /* keep fallback */
  }
  mutate((s) => {
    const target = s.applications.find((a) => a.id === app.id)
    if (!target) return
    if (!target.interviews.some((i) => i.stage === stage)) {
      target.interviews.push({
        stage,
        date: new Date().toISOString().slice(0, 10),
        format: pack.format,
        interviewers: pack.interviewers,
        notes: "prep generated",
      })
    }
    if (target.status === "applied") target.status = "interview"
    target.updatedAt = new Date().toISOString()
  })
  addHistory({
    kind: "interview",
    title: `Interview pack: ${app.company} / ${stage}`,
    detail: `${pack.likelyQuestions.length} likely questions, ${pack.questionsToAsk.length} to ask.`,
    ref: app.id,
  })
  return pack
}

function fallbackPack(
  app: Application,
  profile: Profile,
  stage: string,
  format: string,
  interviewers: string,
): InterviewPack {
  const star = profile.starExamples[0]
  return {
    applicationId: app.id,
    stage,
    format,
    interviewers,
    likelyQuestions: [
      {
        question: "Walk me through a launch you stopped.",
        source: "posting",
        starId: star?.title,
        answer: star
          ? `${star.situation} ${star.task} ${star.action} ${star.result}`
          : "Use a measured quality bar from a shipped system. Do not invent a robotics story.",
      },
      {
        question: "Where are you weak for this role?",
        source: "gaps",
        answer: (app.archive.evaluation?.gaps || ["Name a real gap from the evaluation."]).join(" "),
      },
    ],
    consistency: profile.experience[0]?.bullets.slice(0, 3) || [],
    toughQuestions: [
      {
        question: "Why this company if the domain is new?",
        answer:
          "The job is the evaluation or retrieval work, not a claim that I have already shipped their domain. I will need a domain partner for labels.",
      },
    ],
    questionsToAsk: [
      "What number currently decides a candidate or model may proceed?",
      "Who labels the golden set?",
      "When did the last launch get rolled back, and why?",
      "What does the first 90 days look like if this hire works?",
    ],
    logistics: `${format} interview for ${stage}. Confirm time zone and the names on the panel.`,
    companyHooks: app.archive.evaluation?.strengths || [],
  }
}
