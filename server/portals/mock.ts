import type { Profile } from "../../shared/types.ts"
import type { PortalHit } from "./index.ts"

export function mockJobs(profile: Profile, query: string): PortalHit[] {
  const role = profile.search.roles[0] || "Staff AI Engineer"
  const loc = profile.search.locations[0] || "Remote"
  return [
    {
      title: `${role}, Evaluation`,
      company: "Northstar Robotics",
      location: "San Francisco, CA (hybrid)",
      url: "https://example.com/jobs/northstar-staff-ai-eval",
      postedDate: new Date().toISOString().slice(0, 10),
      description: `Staff AI Engineer, Evaluation at Northstar Robotics. Own graded datasets, online monitors, and launch bars for a warehouse robotics copilot. Requirements: 7+ years applied ML or search, RAG in production, Python and TypeScript, faithfulness evaluation, prompt injection defenses. Nice to have: robotics, Elasticsearch, mentoring. English working language. US work authorization required.`,
      portal: "mock",
    },
    {
      title: "Staff Machine Learning Engineer, Retrieval",
      company: "Harborline",
      location: loc,
      url: "https://example.com/jobs/harborline-retrieval",
      postedDate: new Date().toISOString().slice(0, 10),
      description: `Build hybrid search and RAG for an analytics copilot. Python, Elasticsearch, eval harnesses, TypeScript. Remote US. International applicants welcome if already authorized.`,
      portal: "mock",
    },
    {
      title: "Applied Scientist, Agents",
      company: "Lumenfold",
      location: "New York, NY",
      url: "https://example.com/jobs/lumenfold-agents",
      postedDate: new Date().toISOString().slice(0, 10),
      description: `Agent tooling, traces, and tool-use evals. PyTorch, Python, TypeScript. Fluent German required for the Berlin stakeholder team.`,
      portal: "mock",
    },
    {
      title: `Senior ${query.replace(/\s*engineer\s*$/i, "").trim() || "platform"} engineer`,
      company: "Paperkite",
      location: "Zurich, CH (on-site)",
      url: "https://example.com/jobs/paperkite-backend",
      postedDate: new Date().toISOString().slice(0, 10),
      description: `TypeScript, Postgres, boring product work. No ML. Five days on-site in Zurich, relocation required.`,
      portal: "mock",
    },
  ]
}
