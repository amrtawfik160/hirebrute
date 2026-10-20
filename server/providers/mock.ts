import { bandFor, heuristicScores, overallScore } from "../../shared/fit.ts"
import type { FitEvaluation, Profile } from "../../shared/types.ts"
import { extractJson } from "../json.ts"

export function mockGenerate(system: string, prompt: string, json?: boolean): string {
  const lower = `${system}\n${prompt}`.toLowerCase()
  if (lower.includes("extract a candidate profile")) return mockIngest(prompt)
  if (lower.includes("extract new skills")) return mockExpand(prompt)
  if (lower.includes("curriculum vitae") || lower.includes("tailor the cv") || lower.includes("cv markdown")) {
    return mockCv(prompt)
  }
  if (lower.includes("cover letter")) return mockCover(prompt)
  if (lower.includes("reviewer") || lower.includes("structured edits")) return mockReview(prompt)
  if (lower.includes("upskill") || lower.includes("heatmap")) return mockUpskill(prompt)
  if (lower.includes("interview pack")) return mockInterview(prompt)
  if (lower.includes("fit evaluation") || lower.includes('"scores"')) return mockEvaluation(prompt)
  if (lower.includes("follow-up") || lower.includes("follow up")) {
    const role = /Follow up on (.+?) at /i.exec(prompt)?.[1] || "the role"
    const company = /Follow up on .+? at ([^.]+)/i.exec(prompt)?.[1] || "the team"
    return `Hello,\n\nChecking in on my application for ${role} at ${company}. Happy to share more about the evaluation harness work if useful.\n\nBest,\nAmira`
  }
  if (lower.includes("classify job emails")) {
    return JSON.stringify({
      proposals: [],
    })
  }
  if (json) {
    return JSON.stringify({ ok: true, text: "mock" })
  }
  return "Mock provider response. Configure a live provider in Settings for model-written copy."
}

function mockEvaluation(prompt: string): string {
  try {
    const parsed = extractJson<{ posting: string; profile: Profile }>(prompt)
    const scores = heuristicScores(parsed.posting || prompt, parsed.profile)
    const overall = overallScore(scores)
    const ev: Partial<FitEvaluation> = {
      scores,
      overall,
      verdict: bandFor(overall),
      strengths: [
        "Production RAG and evaluation harness experience maps to the core of the role.",
        "Staff-level ownership of launch bars, not just model calls.",
      ],
      gaps: [
        "Robotics / warehouse domain is adjacent, not direct.",
        "No industrial IoT deployment on the profile.",
      ],
      recommendation:
        overall >= 60
          ? "Apply. The eval and retrieval work is the job. Be honest about the robotics gap."
          : "Apply only if you want the domain stretch. Do not reframe physics work as robotics.",
    }
    return JSON.stringify(ev)
  } catch {
    return JSON.stringify({
      scores: { technical: 72, experience: 68, behavioral: 70, career: 74 },
      overall: 71,
      verdict: "good",
      strengths: ["Strong applied AI overlap"],
      gaps: ["Domain stretch"],
      recommendation: "Apply with an honest robotics gap.",
    })
  }
}

function mockCv(prompt: string): string {
  const name = /Name:\s*(.+)/i.exec(prompt)?.[1]?.trim() || "Amira Cole"
  const email = /Email:\s*(\S+)/i.exec(prompt)?.[1] || "amira.cole@example.com"
  const phone = /Phone:\s*(.+)/i.exec(prompt)?.[1]?.trim() || "+1 415 555 0142"
  const role = /Role:\s*(.+)/i.exec(prompt)?.[1] || "Staff AI Engineer"
  const company = /Company:\s*(.+)/i.exec(prompt)?.[1] || "Target Company"
  return `# ${name}

**${role} candidate for ${company}**
Oakland, CA · ${email} · ${phone} · github.com/amira-cole

## Profile
Staff applied-AI engineer who ships retrieval systems with a launch bar. I design graded evaluations, keep untrusted documents from steering the model, and own the quality number that decides whether a copilot reaches production.

## Skills
Python, TypeScript, RAG, evaluation harnesses, information retrieval, FastAPI, Elasticsearch, Postgres, LLM agents

## Experience
### Staff Machine Learning Engineer, Northwind Labs (2022–Present)
- Led a 6-person applied AI team shipping a retrieval-augmented copilot used by 4,200 support agents, cutting median handle time 18%.
- Built an evaluation harness with 1,100 graded cases covering faithfulness, tool-use, and latency.
- Lifted nDCG@10 from 0.61 to 0.78 with hybrid dense+BM25 ranking.
- Added an integrity gate for retrieved documents after a prompt-injection red team (41% → 4% attack success).

### Senior Software Engineer, Search, Harbor Metrics (2018–2022)
- Owned query understanding (Python, FastAPI, Elasticsearch) at 12M searches/day.
- Introduced offline evaluation and shadow traffic so ranking changes shipped with a known quality bar.

### Software Engineer, Kite Systems (2016–2018)
- Shipped ETL and a TypeScript dashboard for experimental physics data.

## Education
M.S. Computer Science, University of Washington (2016). Thesis on retrieval-augmented generation for technical support corpora.
`
}

function mockCover(prompt: string): string {
  const role = /Role:\s*(.+)/i.exec(prompt)?.[1] || "the role"
  const company = /Company:\s*(.+)/i.exec(prompt)?.[1] || "your team"
  const name = /Name:\s*(.+)/i.exec(prompt)?.[1]?.trim() || "Amira Cole"
  return `Dear Hiring Manager,

I am applying for ${role} at ${company}. I spend most of my week deciding whether an LLM system is allowed to launch, which is the job as I read it.

## Why this team
Your posting asks for someone to own graded datasets, online monitors, and launch bars for a copilot that sits next to operators. That is the work I already do for a support copilot used by 4,200 agents.

## What I would solve first
- Stand up a graded set that treats retrieved warehouse documents as untrusted input, the same way I treat support articles.
- Put faithfulness, tool routing, and latency on one nightly number the floor team can read.
- Write the launch bar before the next model swap, not after.

I stopped a vendor replacement last year because it failed 14% of faithfulness cases. I would rather bring that habit than a demo.

I would welcome a conversation about how you currently decide a model is ready for the floor.

Sincerely,
${name}
`
}

function mockReview(_prompt: string): string {
  return JSON.stringify({
    edits: [
      {
        file: "cover",
        old_string: "I would welcome a conversation about how you currently decide a model is ready for the floor.",
        new_string:
          "I would welcome a conversation about how you currently decide a model is ready for the floor, and where the eval gaps hurt most.",
        reason: "company angle",
      },
    ],
    comments: [
      "Opening is specific. Keep the 14% faithfulness number; it is grounded.",
      "Do not claim robotics experience. The adjacent-physics work stays in the CV only if asked.",
    ],
    companyResearch: {
      mission: "Warehouse robotics copilot (from posting; verify on the company site before sending).",
      news: [],
      culture: "Operator-adjacent product team",
      sources: [],
    },
  })
}

function mockIngest(prompt: string): string {
  const sources = prompt.split(/SOURCES:/i)[1] || ""
  const line = (label: string) => new RegExp(`^${label}:\\s*(.+)$`, "im").exec(sources)?.[1]?.trim()
  const out: Record<string, unknown> = {}
  const name = line("Name")
  const email = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.exec(sources)?.[0]
  const location = line("Location")
  const headline = line("Headline")
  const phone = line("Phone")
  const skills = line("Skills")
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (name) out.name = name
  if (email) out.email = email
  if (location) out.location = location
  if (headline) out.headline = headline
  if (phone) out.phone = phone
  if (skills?.length) out.skills = { primary: skills }
  return JSON.stringify(out)
}

function mockUpskill(prompt: string): string {
  const target = /^Target:[ \t]*(\S.*)$/im.exec(prompt)?.[1]?.trim()
  if (target) {
    return JSON.stringify({
      heatmap: [{ skill: target, score: 1, jobs: 1, provenance: "required" }],
      domainGaps: [target],
      softGaps: [],
      plan: [{ skill: target, why: "You asked for this skill.", hours: 12, resources: [] }],
    })
  }
  return JSON.stringify({
    heatmap: [
      { skill: "robotics perception", score: 2.4, jobs: 4, provenance: "recorded gap" },
      { skill: "online eval monitors", score: 1.8, jobs: 6, provenance: "inferred" },
      { skill: "PLC / industrial IoT", score: 1.1, jobs: 3, provenance: "recorded gap" },
    ],
    domainGaps: ["warehouse operations vocabulary"],
    softGaps: ["shift-handoff communication with floor supervisors"],
    plan: [
      {
        skill: "online evaluation monitors",
        why: "Most ranked postings want a live quality number, not only a nightly set.",
        hours: 20,
        resources: [
          { title: "Evals for production LLM systems (Anthropic cookbook)", url: "https://docs.anthropic.com/" },
        ],
      },
    ],
  })
}

function mockInterview(_prompt: string): string {
  return JSON.stringify({
    likelyQuestions: [
      {
        question: "Tell me about a launch you stopped.",
        source: "posting",
        starId: "eval-harness",
        answer:
          "Situation: vendor demo looked strong. Task: decide on a ranker swap. Action: 1,100-case harness. Result: 14% faithfulness miss, launch stopped.",
      },
    ],
    consistency: [
      "18% handle-time cut at Northwind",
      "nDCG@10 0.61 → 0.78",
      "red-team 41% → 4%",
    ],
    toughQuestions: [
      {
        question: "You have not worked in robotics. Why this role?",
        answer:
          "The job is evaluation ownership for an operator copilot. I have done that in support. I do not pretend I have shipped robots. I will need a floor partner for domain labels.",
      },
    ],
    questionsToAsk: [
      "What number currently decides a model may reach the floor?",
      "Who labels the golden set: operators or researchers?",
      "When did the last launch get rolled back, and why?",
    ],
    companyHooks: ["Posting emphasizes launch bars over model novelty."],
  })
}

function mockExpand(prompt: string): string {
  const docs = prompt.split(/DOCUMENTS:/i)[1] || ""
  const skill = /^Skill:\s*(.+)$/im.exec(docs)?.[1]?.trim()
  const project = /^Project:\s*(.+)$/im.exec(docs)?.[1]?.trim()
  return JSON.stringify({
    skills: skill
      ? [{ name: skill, source: "cv", evidence: "Named in the pasted CV", bucket: "primary" }]
      : [],
    projects: project
      ? [
          {
            name: project,
            summary: "Named in the pasted CV",
            stack: ["TypeScript"],
            outcomes: ["listed by the candidate"],
            source: "cv",
          },
        ]
      : [],
  })
}
