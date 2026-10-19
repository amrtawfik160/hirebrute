import {
  bandFor,
  classifyHost,
  eligibilityGate,
  heuristicScores,
  languageGate,
  locationVerdict,
  overallScore,
} from "../../shared/fit.ts"
import { postingGuard } from "../../shared/postingGuard.ts"
import type { FitEvaluation, Profile } from "../../shared/types.ts"
import { extractMeta, extractReadable, fetchPage } from "../fetchPage.ts"
import { portalHosts } from "../portals/index.ts"

export interface EvaluateInput {
  source: "paste" | "url"
  text?: string
  url?: string
  profile: Profile
}

export interface EvaluateResult {
  evaluation: FitEvaluation
  cleanedPosting: string
  blocked: boolean
}

export function extractPostingMeta(text: string): { company: string; role: string; location?: string } {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  const role = lines[0]?.replace(/^#+\s*/, "") || "Unknown role"
  const companyLine = lines[1] || ""
  const company =
    companyLine.split(/[·|]/)[0]?.trim() ||
    /at ([A-Z][A-Za-z0-9&.\- ]{2,40})/.exec(text)?.[1]?.trim() ||
    "Unknown company"
  const location = /([A-Za-z .]+,\s*[A-Z]{2})/.exec(text)?.[1]
  return { company, role, location }
}

export async function evaluatePosting(input: EvaluateInput): Promise<EvaluateResult> {
  let raw = input.text || ""
  let fetchedMeta: { title?: string; company?: string } | null = null
  if (input.source === "url" && input.url) {
    const page = await fetchPage(input.url)
    fetchedMeta = extractMeta(page.html, input.url)
    raw = extractReadable(page.html) || input.text || ""
  }
  const guard = postingGuard(raw, input.source === "url" ? "html" : "text")
  const posting = guard.cleaned
  const meta = extractPostingMeta(posting)
  if (fetchedMeta?.company && /unknown/i.test(meta.company)) meta.company = fetchedMeta.company
  if (fetchedMeta?.title && /unknown/i.test(meta.role)) meta.role = fetchedMeta.title
  const profile = input.profile
  const eligibility = eligibilityGate(posting, profile)
  const language = languageGate(posting, profile)
  const location = locationVerdict(posting, profile)
  const blocked = language.verdict === "FAIL" || eligibility.verdict === "FAIL"
  const scores = blocked
    ? { technical: 0, experience: 0, behavioral: 0, career: 0 }
    : heuristicScores(posting, profile)
  const overall = blocked ? 0 : overallScore(scores)
  const host = classifyHost(input.url || "https://example.com/jobs/paste", portalHosts())

  const strengths: string[] = []
  const gaps: string[] = []
  if (!blocked) {
    if (scores.technical >= 60) strengths.push("Technical skills overlap the posting.")
    else gaps.push("Technical skills are a stretch for this posting.")
    if (scores.experience >= 60) strengths.push("Recent work maps to the role.")
    else gaps.push("Experience is adjacent rather than direct.")
  } else if (language.note) {
    gaps.push(language.note)
  }

  const evaluation: FitEvaluation = {
    company: meta.company,
    role: meta.role,
    city: meta.location,
    postingLanguage: /[æøå]/i.test(posting) ? "Danish" : "English",
    integrity: {
      verdict: guard.verdict,
      findings: guard.findings.map((f) => `${f.kind}: ${f.excerpt}`),
    },
    sourceHost: host,
    eligibility,
    languageGate: language,
    scores,
    location,
    overall,
    verdict: blocked ? "poor" : bandFor(overall),
    strengths,
    gaps,
    recommendation: blocked
      ? "Do not draft. A hard gate failed."
      : overall >= 60
        ? "Apply. Confirm the gaps first."
        : "Apply only with eyes open on the gaps.",
  }

  return { evaluation, cleanedPosting: posting, blocked }
}
