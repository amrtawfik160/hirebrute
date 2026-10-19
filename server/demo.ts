import type { Profile } from "../shared/types.ts"

export const DEMO_PROFILE: Profile = {
  isDemo: true,
  name: "Amira Cole",
  firstName: "Amira",
  lastName: "Cole",
  email: "amira.cole@example.com",
  phone: "+1 415 555 0142",
  address: "Oakland, CA",
  location: "Oakland, California",
  country: "United States",
  commute: "Bay Area hybrid, remote-friendly, no relocation",
  linkedin: "https://linkedin.com/in/amira-cole",
  github: "https://github.com/amira-cole",
  website: "https://amiracole.dev",
  headline: "Staff AI engineer who ships evaluation harnesses and retrieval systems",
  status: "Open to staff / principal applied AI roles",
  cvLanguage: "English",
  citizenship: "US citizen",
  workAuthorization: "US citizen, no sponsorship required",
  languages: [
    { name: "English", level: "Native" },
    { name: "Spanish", level: "B2" },
  ],
  education: [
    {
      degree: "M.S.",
      field: "Computer Science",
      institution: "University of Washington",
      start: "2014",
      end: "2016",
      thesis: "Retrieval-augmented generation for technical support corpora",
      topics: ["information retrieval", "NLP", "evaluation"],
    },
    {
      degree: "B.S.",
      field: "Physics",
      institution: "Reed College",
      start: "2010",
      end: "2014",
      topics: ["computational physics", "linear algebra"],
    },
  ],
  experience: [
    {
      title: "Staff Machine Learning Engineer",
      company: "Northwind Labs",
      location: "San Francisco, CA",
      start: "2022",
      end: "Present",
      bullets: [
        "Led a 6-person applied AI team shipping a retrieval-augmented copilot used by 4,200 support agents, cutting median handle time 18%.",
        "Built an evaluation harness with 1,100 graded cases, golden traces, and nightly regression on faithfulness, tool-use, and latency.",
        "Migrated ranking from keyword to hybrid dense+BM25, lifting nDCG@10 from 0.61 to 0.78 on the production set.",
        "Partnered with legal and security on a red-team suite for prompt injection in retrieved documents.",
      ],
    },
    {
      title: "Senior Software Engineer, Search",
      company: "Harbor Metrics",
      location: "Seattle, WA",
      start: "2018",
      end: "2022",
      bullets: [
        "Owned the query understanding stack (Python, FastAPI, Elasticsearch) serving 12M searches/day.",
        "Introduced offline evaluation and a shadow traffic pipeline so ranking changes shipped with a known quality bar.",
        "Mentored four engineers; two later became tech leads.",
      ],
    },
    {
      title: "Software Engineer",
      company: "Kite Systems",
      location: "Portland, OR",
      start: "2016",
      end: "2018",
      bullets: [
        "Shipped ETL jobs and a TypeScript dashboard for experimental physics data (Airflow, Postgres, React).",
        "Reduced a 4-hour nightly job to 22 minutes by rewriting the hot path in vectorized NumPy.",
      ],
    },
  ],
  skills: {
    primary: [
      "Python",
      "TypeScript",
      "retrieval-augmented generation",
      "evaluation harnesses",
      "information retrieval",
      "LLM agents",
      "FastAPI",
    ],
    secondary: ["Go", "Postgres", "Elasticsearch", "PyTorch", "React", "Airflow"],
    domain: ["applied AI", "search", "customer support automation", "MLOps"],
    software: ["Claude", "OpenAI API", "LangChain", "Docker", "Kubernetes", "GitHub Actions"],
  },
  certifications: [{ name: "AWS Machine Learning Specialty", date: "2023" }],
  publications: [
    "Cole, A. et al. (2021). Hybrid ranking for noisy support corpora. SIGIR industry track.",
  ],
  awards: ["Harbor Metrics engineering excellence award (2020)"],
  projects: [
    {
      name: "Traceboard",
      summary: "Open-source viewer for LLM traces with span-level evals.",
      stack: ["TypeScript", "SQLite", "Vite"],
      outcomes: ["1.4k GitHub stars", "used internally at two startups"],
      source: "github",
    },
  ],
  behavioral: {
    traits: [
      { name: "Collaborator", description: "Default is shared ownership, not heroics." },
      { name: "Precision", description: "Wants a measurable quality bar before a launch." },
    ],
    strengths: ["evaluation design", "cross-functional translation", "calm incident lead"],
    growthAreas: ["executive narrative under time pressure"],
    thrivesIn: ["small applied research-to-product teams", "high ownership", "written culture"],
    writingVoice: "Warm, direct, specific. No filler, no swagger.",
  },
  energizingTasks: [
    "designing evals",
    "debugging retrieval failures",
    "pairing with domain experts",
    "writing design docs",
  ],
  drainingTasks: ["status theater", "unmeasured model swaps", "on-call without a quality signal"],
  passions: ["making LLM systems honest", "search quality", "teaching evaluation literacy"],
  targetSectors: [
    { sector: "AI infrastructure", companies: ["Anthropic", "OpenAI", "Cohere"] },
    { sector: "Applied AI product", companies: ["Notion", "Linear", "Stripe"] },
  ],
  dealBreakers: [
    "pure on-site five days a week outside the Bay Area",
    "roles with no evaluation culture",
    "crypto / token schemes",
  ],
  careerGoals: [
    "Principal-track applied AI with authority over evals and launch bars",
    "Ship systems that operators trust, not demos",
    "Grow a small team of retrieval/eval specialists",
  ],
  financialContext: "Stable runway, optimizing for role quality over speed.",
  scheduleConstraints: "Hybrid Bay Area or remote US time zones.",
  growthPriorities: ["agent evaluation", "multimodal retrieval"],
  starExamples: [
    {
      title: "Eval harness that stopped a bad launch",
      situation: "A vendor model looked great on a 20-example demo.",
      task: "Decide whether to replace the production ranker.",
      action:
        "I built a 1,100-case graded set covering faithfulness, tool routing, and latency, then ran both models nightly.",
      result: "The vendor failed 14% of faithfulness cases. We kept the current model and used the harness as the launch gate.",
      useFor: ["conflict with a stakeholder", "quality over speed", "eval design"],
    },
    {
      title: "Injection in retrieved docs",
      situation: "Support articles contained hidden HTML comments.",
      task: "Keep the copilot from following retrieved instructions.",
      action:
        "I added a posting-style integrity gate: strip hidden markup, flag instruction-shaped lines, never fetch URLs from retrieved bodies.",
      result: "Red-team success rate dropped from 41% to 4% on the held-out set.",
      useFor: ["security", "prompt injection", "untrusted data"],
    },
  ],
  search: {
    roles: [
      "Staff AI Engineer",
      "Staff Machine Learning Engineer",
      "Applied Scientist",
      "LLM Platform Engineer",
    ],
    keywords: ["RAG", "evaluation", "retrieval", "agents", "search"],
    locations: ["San Francisco", "Remote", "New York", "Seattle"],
    remote: true,
  },
}

export const DEMO_POSTING = `Staff AI Engineer, Evaluation
Northstar Robotics · San Francisco, CA (hybrid 2 days) · Posted 2026-10-12

About the role
We are hiring a Staff AI Engineer to own the evaluation stack for our warehouse robotics copilot. You will design graded datasets, online monitors, and launch bars that decide when a new model reaches the floor.

Requirements
- 7+ years in applied ML or search
- Hands-on retrieval-augmented generation (RAG) in production
- Python and TypeScript
- Experience with faithfulness / groundedness evaluation
- Comfort working with untrusted retrieved documents (prompt injection)

Nice to have
- Robotics or industrial IoT domain
- Elasticsearch or similar
- Mentoring senior engineers

We welcome international applicants already authorized to work in the US. English is the working language.

To apply, send a CV and a short note on a launch you stopped because the evals were not ready.`
