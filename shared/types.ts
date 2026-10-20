export type ProviderId =
  | "claude-cli"
  | "codex-cli"
  | "grok-cli"
  | "anthropic"
  | "openai"
  | "xai"
  | "gemini"
  | "openrouter"
  | "mock"

export type ProviderKind = "cli" | "api" | "mock"

export type ApplicationStatus =
  | "drafted"
  | "applied"
  | "interview"
  | "offer"
  | "hired"
  | "rejected"
  | "no_response"
  | "offer_declined"
  | "withdrawn"

export type JobStatus =
  | "new"
  | "ranked"
  | "expired"
  | "unreachable"
  | "skipped"
  | "applied"

export type GateVerdict = "PASS" | "FAIL" | "FLAG" | "UNVERIFIED"
export type LocationVerdict = "PASS" | "FAIL" | "FLAG"
export type FitBand = "strong" | "good" | "moderate" | "weak" | "poor"
export type QuickFit = "high" | "medium" | "low"

export interface Language {
  name: string
  level: string
}

export interface Experience {
  title: string
  company: string
  location: string
  start: string
  end: string
  bullets: string[]
}

export interface Education {
  degree: string
  field: string
  institution: string
  start: string
  end: string
  thesis?: string
  topics?: string[]
  gpa?: string
}

export interface StarExample {
  title: string
  situation: string
  task: string
  action: string
  result: string
  useFor: string[]
}

export interface ProfileProject {
  name: string
  summary: string
  stack: string[]
  outcomes: string[]
  source?: string
}

export interface Profile {
  name: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address?: string
  location: string
  country: string
  commute: string
  linkedin?: string
  github?: string
  website?: string
  kaggle?: string
  scholar?: string
  headline: string
  status: string
  cvLanguage: string
  citizenship?: string
  workAuthorization?: string
  languages: Language[]
  education: Education[]
  experience: Experience[]
  skills: {
    primary: string[]
    secondary: string[]
    domain: string[]
    software: string[]
  }
  certifications: { name: string; hours?: string; date?: string }[]
  publications: string[]
  awards: string[]
  projects: ProfileProject[]
  behavioral: {
    traits: { name: string; description: string }[]
    strengths: string[]
    growthAreas: string[]
    thrivesIn: string[]
    writingVoice: string
  }
  energizingTasks: string[]
  drainingTasks: string[]
  passions: string[]
  targetSectors: { sector: string; companies: string[] }[]
  dealBreakers: string[]
  careerGoals: string[]
  financialContext?: string
  scheduleConstraints?: string
  growthPriorities?: string[]
  starExamples: StarExample[]
  search: {
    roles: string[]
    keywords: string[]
    locations: string[]
    remote: boolean
    minSalary?: string
  }
  isDemo?: boolean
}

export interface FitScores {
  technical: number
  experience: number
  behavioral: number
  career: number
}

export interface FitEvaluation {
  company: string
  role: string
  department?: string
  city?: string
  deadline?: string
  postingLanguage: string
  integrity: { verdict: string; findings: string[] }
  sourceHost: { kind: "portal" | "ats" | "unverified"; host: string }
  eligibility: { verdict: GateVerdict; quote?: string; note?: string }
  languageGate: { verdict: GateVerdict; note?: string }
  scores: FitScores
  location: { verdict: LocationVerdict; note: string }
  overall: number
  verdict: FitBand
  strengths: string[]
  gaps: string[]
  recommendation: string
  salary?: { metric: string; value: string }[]
  companyResearch?: CompanyResearch
}

export interface CompanyResearch {
  company: string
  fetchedAt: string
  website?: string
  mission?: string
  news: string[]
  culture?: string
  sources: { claim: string; url: string }[]
}

export interface AtsReport {
  contactPresent: boolean
  emailFound: boolean
  phoneFound: boolean
  nameFound: boolean
  garbledGlyphs: boolean
  readingOrderOk: boolean
  keywordCoverage: { keyword: string; present: boolean; supported: boolean }[]
  coverageScore: number
  pageCount: number
  notes: string[]
}

export interface Job {
  key: string
  title: string
  company: string
  location: string
  url: string
  portal: string
  postedDate?: string
  deadline?: string
  description: string
  snippet?: string
  status: JobStatus
  quickFit?: QuickFit
  languageGate?: GateVerdict
  languageNote?: string
  rankScore?: number
  scores?: FitScores
  strengths?: string[]
  gaps?: string[]
  locationVerdict?: LocationVerdict
  guard?: string
  fetchError?: string
  seenAt: string
}

export interface FollowUp {
  date: string
  channel: string
  text: string
}

export interface InterviewRecord {
  stage: string
  date: string
  format: string
  interviewers: string
  notes: string
}

export interface Application {
  id: string
  date: string
  company: string
  sector: string
  role: string
  roleType: string
  channel: string
  status: ApplicationStatus
  contactPerson: string
  fitRating: number | null
  notes: string
  cvFile: string
  coverLetterFile: string
  source: string
  deadline: string
  jobKey?: string
  slug: string
  followUps: FollowUp[]
  interviews: InterviewRecord[]
  archive: {
    posting: string
    cvMarkdown: string
    coverMarkdown: string
    evaluation?: FitEvaluation
    review?: string
    ats?: AtsReport
  }
  createdAt: string
  updatedAt: string
}

export interface HistoryEntry {
  id: string
  at: string
  kind:
    | "setup"
    | "scrape"
    | "rank"
    | "apply"
    | "outcome"
    | "interview"
    | "upskill"
    | "expand"
    | "sync"
    | "reset"
    | "export"
    | "settings"
  title: string
  detail: string
  ref?: string
}

export interface DocumentFile {
  id: string
  folder:
    | "cv"
    | "linkedin"
    | "diplomas"
    | "references"
    | "projects"
    | "applications"
    | "postings"
  name: string
  mime: string
  text: string
  uploadedAt: string
}

export interface PortalConfig {
  id: string
  name: string
  enabled: boolean
  kind: "builtin" | "rss" | "json"
  market?: string
  warning?: string
  endpoint?: string
  queryParam?: string
  personalUseOnly?: boolean
}

export interface TemplateConfig {
  id: string
  name: string
  kind: "cv" | "cover"
  engine: "markdown-pdf" | "latex" | "typst" | "custom"
  sourceExtension: string
  compileCommand?: string
  pageLimit: number
  styleNotes: string
  active: boolean
}

export interface ProviderSettings {
  enabled: boolean
  apiKey?: string
  model?: string
  bin?: string
  extraArgs?: string[]
}

export interface AppSettings {
  activeProvider: ProviderId | null
  dataDir?: string
  providers: Record<ProviderId, ProviderSettings>
  notionToken?: string
  notionDatabaseId?: string
  salaryEnabled: boolean
}

export interface ProviderStatus {
  id: ProviderId
  label: string
  kind: ProviderKind
  available: boolean
  configured: boolean
  detail: string
  models: string[]
}

export interface UpskillReport {
  id: string
  at: string
  mode: "aggregate" | "targeted"
  target?: string
  heatmap: { skill: string; score: number; jobs: number; provenance: string }[]
  domainGaps: string[]
  softGaps: string[]
  plan: { skill: string; why: string; hours: number; resources: { title: string; url: string }[] }[]
}

export interface InterviewPack {
  applicationId: string
  stage: string
  format: string
  interviewers: string
  likelyQuestions: { question: string; source: string; starId?: string; answer: string }[]
  consistency: string[]
  toughQuestions: { question: string; answer: string }[]
  questionsToAsk: string[]
  logistics: string
  companyHooks: string[]
  mockTranscript?: { role: "interviewer" | "candidate" | "coach"; text: string }[]
}

export interface GmailProposal {
  id: string
  applicationId: string
  company: string
  role: string
  proposedStatus: ApplicationStatus
  reason: string
  sourceExcerpt: string
  confidence: "high" | "medium" | "low"
  needsManual: boolean
}

export interface DashboardStats {
  sent: number
  drafted: number
  active: number
  interview: number
  offer: number
  closed: number
  byStatus: Record<string, number>
  bySector: Record<string, number>
  byChannel: Record<string, number>
  funnel: { stage: string; count: number }[]
  rejectionRate: number | null
  generatedAt: string
}
