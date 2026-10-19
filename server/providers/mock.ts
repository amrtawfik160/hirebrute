import { bandFor, heuristicScores, overallScore } from "../../shared/fit.ts"
import type { FitEvaluation, Profile } from "../../shared/types.ts"
import { extractJson } from "../json.ts"

export function mockGenerate(system: string, prompt: string, json?: boolean): string {
  const lower = `${system}\n${prompt}`.toLowerCase()
  if (lower.includes("fit evaluation") || lower.includes('"scores"') || lower.includes("technical")) {
    return mockEvaluation(prompt)
  }
  if (lower.includes("cover letter")) return mockCover(prompt)
  if (lower.includes("curriculum vitae") || lower.includes("tailor the cv") || lower.includes("cv markdown")) {
    return mockCv(prompt)
  }
  if (lower.includes("reviewer") || lower.includes("structured edits")) return mockReview(prompt)
  if (lower.includes("upskill") || lower.includes("heatmap")) return mockUpskill(prompt)
  if (lower.includes("interview") || lower.includes("star")) return mockInterview(prompt)
  if (lower.includes("expand") || lower.includes("competenc")) return mockExpand()
  if (lower.includes("follow-up") || lower.includes("follow up")) {
    return "Hello,\n\nChecking in on my application for the role. Happy to share more about the evaluation harness work if useful.\n\nBest,\nAmira"
  }
  if (lower.includes("gmail") || lower.includes("classify")) {
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
  const name = /Name:\s*(.+)/i.exec(prompt)?.[1] || "Amira Cole"
  const role = /Role:\s*(.+)/i.exec(prompt)?.[1] || "Staff AI Engineer"
  const company = /Company:\s*(.+)/i.exec(prompt)?.[1] || "Target Company"
  return `# ${name}

**${role} candidate for ${company}**
Oakland, CA · amira.cole@example.com · +1 415 555 0142 · github.com/amira-cole

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
Amira Cole
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

function mockUpskill(_prompt: string): string {
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

function mockExpand(): string {
  return JSON.stringify({
    skills: [{ name: "trace visualization", source: "Traceboard README", evidence: "1.4k star OSS viewer" }],
    projects: [
      {
        name: "Traceboard",
        summary: "LLM trace viewer with span-level evals",
        stack: ["TypeScript", "SQLite"],
        outcomes: ["1.4k stars"],
        source: "github",
      },
    ],
  })
}
