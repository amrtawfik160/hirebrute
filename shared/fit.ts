import { ATS_HOSTS } from "./constants.ts"
import type {
  FitBand,
  FitEvaluation,
  FitScores,
  GateVerdict,
  LocationVerdict,
  Profile,
} from "./types.ts"

export function classifyHost(
  url: string,
  portalHosts: string[],
): { kind: "portal" | "ats" | "unverified"; host: string } {
  let host = ""
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return { kind: "unverified", host: url || "unknown" }
  }
  if (portalHosts.some((h) => host === h || host.endsWith(`.${h}`))) {
    return { kind: "portal", host }
  }
  for (const apex of ATS_HOSTS) {
    if (host === apex || host.endsWith(`.${apex}`)) {
      if (host.endsWith(`.${apex}`) || host === apex) return { kind: "ats", host }
    }
  }
  return { kind: "unverified", host }
}

function langNorm(value: string): string {
  return value.toLowerCase().replace(/[^a-z]+/g, " ").trim()
}

export function languageGate(
  posting: string,
  profile: Profile,
): { verdict: GateVerdict; note?: string } {
  const required: { name: string; bar: string; quote: string }[] = []
  const re =
    /(?:fluent|native|business-level|professional|conversational|c[12]\+?|b[12])?\s*(english|danish|german|french|spanish|portuguese|dutch|swedish|norwegian|finnish|italian|polish|russian|arabic|mandarin|chinese|japanese|korean|hindi)\s*(?:required|must|needed)?/gi
  let m: RegExpExecArray | null
  const text = posting
  const jobCondition =
    /must (?:speak|communicate|write)|(?:fluent|native|c1|c2).{0,20}required|language(?:s)?\s*(?:required|requirements)/i.test(
      text,
    )
  if (!jobCondition) return { verdict: "PASS" }

  while ((m = re.exec(text))) {
    required.push({
      name: m[1],
      bar: m[0],
      quote: m[0],
    })
  }
  if (!required.length) return { verdict: "PASS" }

  const declared = profile.languages.map((l) => ({
    name: langNorm(l.name),
    level: l.level.toLowerCase(),
  }))

  for (const req of required) {
    const name = langNorm(req.name)
    const hit = declared.find((d) => d.name.includes(name) || name.includes(d.name))
    if (!hit) {
      return {
        verdict: "FAIL",
        note: `Posting requires ${req.quote.trim()}, which is not in your Languages table.`,
      }
    }
    const highBar = /fluent|native|c1|c2|business-level/.test(req.bar.toLowerCase())
    const modest = /b1|b2|conversational|elementary|limited/.test(hit.level)
    if (highBar && modest) {
      return {
        verdict: "FLAG",
        note: `Posting asks for "${req.quote.trim()}"; you declared ${hit.name} at ${hit.level}.`,
      }
    }
  }
  return { verdict: "PASS" }
}

export function eligibilityGate(
  posting: string,
  profile: Profile,
): { verdict: GateVerdict; quote?: string; note?: string } {
  const citizen = /must be a (citizen|permanent resident)|citizenship required|PR required|full working rights/i.exec(
    posting,
  )
  if (citizen && !/citizen|permanent/i.test(profile.workAuthorization || profile.citizenship || "")) {
    return {
      verdict: "FAIL",
      quote: citizen[0],
      note: "Hard eligibility requirement. Not scored.",
    }
  }
  if (/security clearance/i.test(posting) && !/clearance/i.test(profile.workAuthorization || "")) {
    return {
      verdict: "FAIL",
      quote: "security clearance",
      note: "Clearance is typically citizenship-gated. Verify the scheme before applying.",
    }
  }
  if (/visa (holders )?considered|we sponsor|international applicants welcome/i.test(posting)) {
    return { verdict: "PASS", note: "Posting explicitly welcomes international applicants." }
  }
  if (!/citizen|visa|sponsor|work(ing)? rights|permit/i.test(posting)) {
    return {
      verdict: "UNVERIFIED",
      note: "Posting is silent on work rights. Check the employer careers page.",
    }
  }
  return { verdict: "PASS" }
}

export function locationVerdict(posting: string, profile: Profile): { verdict: LocationVerdict; note: string } {
  const reloc = /must relocate|relocation required|on-?site only|five days in (the )?office/i.test(posting)
  const remote = /remote|hybrid|work from home/i.test(posting)
  const commuteAllowsRelo =
    /relocat/i.test(profile.commute || "") && !/no relocat/i.test(profile.commute || "")
  if (reloc && !commuteAllowsRelo) {
    return { verdict: "FAIL", note: "Posting requires relocation or full-time on-site." }
  }
  if (/frequent (international )?travel/i.test(posting)) {
    return { verdict: "FLAG", note: "Frequent travel mentioned. Confirm against your constraints." }
  }
  if (remote || profile.search.remote) {
    return { verdict: "PASS", note: "Remote or hybrid language present, or you accept remote." }
  }
  return { verdict: "PASS", note: "No relocation deal-breaker detected." }
}

export function bandFor(score: number): FitBand {
  if (score >= 80) return "strong"
  if (score >= 65) return "good"
  if (score >= 50) return "moderate"
  if (score >= 35) return "weak"
  return "poor"
}

export function overallScore(scores: FitScores): number {
  return Math.round(
    scores.technical * 0.35 +
      scores.experience * 0.3 +
      scores.behavioral * 0.15 +
      scores.career * 0.2,
  )
}

export function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((t) => t.length > 2)
}

export function overlapScore(haystack: string, needles: string[]): number {
  if (!needles.length) return 50
  const hay = new Set(tokenize(haystack))
  let hits = 0
  for (const n of needles) {
    const parts = tokenize(n)
    if (parts.some((p) => hay.has(p))) hits += 1
  }
  return Math.round((hits / needles.length) * 100)
}

export function heuristicScores(posting: string, profile: Profile): FitScores {
  const blob = [
    ...profile.skills.primary,
    ...profile.skills.secondary,
    ...profile.skills.domain,
    ...profile.skills.software,
    ...profile.experience.flatMap((e) => [e.title, e.company, ...e.bullets]),
  ].join(" ")
  const technical = Math.min(
    100,
    Math.round(
      overlapScore(posting, profile.skills.primary) * 0.7 +
        overlapScore(posting, profile.skills.secondary) * 0.3,
    ),
  )
  const experience = overlapScore(
    posting,
    profile.experience.map((e) => `${e.title} ${e.bullets.join(" ")}`),
  )
  const thrive = overlapScore(posting, profile.behavioral.thrivesIn)
  const drain = overlapScore(posting, profile.drainingTasks)
  const behavioral = Math.max(0, Math.min(100, thrive - Math.round(drain * 0.3)))
  const career = overlapScore(posting, [...profile.careerGoals, ...profile.passions, ...profile.energizingTasks])
  void blob
  return {
    technical: Number.isFinite(technical) ? technical : 50,
    experience: Number.isFinite(experience) ? experience : 50,
    behavioral: Number.isFinite(behavioral) ? behavioral : 55,
    career: Number.isFinite(career) ? career : 55,
  }
}

export function emptyProfile(): Profile {
  return {
    name: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    location: "",
    country: "",
    commute: "",
    headline: "",
    status: "",
    cvLanguage: "English",
    languages: [],
    education: [],
    experience: [],
    skills: { primary: [], secondary: [], domain: [], software: [] },
    certifications: [],
    publications: [],
    awards: [],
    projects: [],
    behavioral: {
      traits: [],
      strengths: [],
      growthAreas: [],
      thrivesIn: [],
      writingVoice: "",
    },
    energizingTasks: [],
    drainingTasks: [],
    passions: [],
    targetSectors: [],
    dealBreakers: [],
    careerGoals: [],
    starExamples: [],
    search: { roles: [], keywords: [], locations: [], remote: true },
  }
}

export function profileReady(profile: Profile): boolean {
  return Boolean(profile.name && profile.experience.length && profile.skills.primary.length)
}

export function evaluationHeadline(ev: FitEvaluation): string {
  const label =
    ev.verdict === "strong"
      ? "Strong Fit"
      : ev.verdict === "good"
        ? "Good Fit"
        : ev.verdict === "moderate"
          ? "Moderate Fit"
          : ev.verdict === "weak"
            ? "Weak Fit"
            : "Poor Fit"
  return `${label} · ${ev.overall}/100`
}
