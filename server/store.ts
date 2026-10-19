import fs from "node:fs"
import path from "node:path"
import { PROVIDER_META } from "../shared/constants.ts"
import { emptyProfile } from "../shared/fit.ts"
import type {
  AppSettings,
  Application,
  CompanyResearch,
  DocumentFile,
  HistoryEntry,
  Job,
  PortalConfig,
  Profile,
  ProviderId,
  TemplateConfig,
  UpskillReport,
} from "../shared/types.ts"
import { DEMO_PROFILE } from "./demo.ts"
import { atomicWrite, dataDir, ensureDir, readJson } from "./paths.ts"

export interface StoreData {
  profile: Profile
  settings: AppSettings
  jobs: Job[]
  applications: Application[]
  history: HistoryEntry[]
  documents: DocumentFile[]
  portals: PortalConfig[]
  templates: TemplateConfig[]
  companyResearch: Record<string, CompanyResearch>
  upskill: UpskillReport[]
  gmail: { lastSync: string | null; processedIds: string[] }
}

const DEFAULT_PORTALS: PortalConfig[] = [
  { id: "mock", name: "Demo board", enabled: true, kind: "builtin", market: "offline" },
  {
    id: "remotive",
    name: "Remotive",
    enabled: true,
    kind: "builtin",
    market: "remote",
  },
  {
    id: "arbeitnow",
    name: "Arbeitnow",
    enabled: true,
    kind: "builtin",
    market: "EU / remote",
  },
  {
    id: "remoteok",
    name: "Remote OK",
    enabled: true,
    kind: "builtin",
    market: "remote",
    warning: "Public API, keep volume modest.",
  },
  {
    id: "themuse",
    name: "The Muse",
    enabled: true,
    kind: "builtin",
    market: "US / remote",
  },
  {
    id: "freehire",
    name: "freehire.me",
    enabled: true,
    kind: "builtin",
    market: "tech, multi-market",
  },
]

const DEFAULT_TEMPLATES: TemplateConfig[] = [
  {
    id: "cv-default",
    name: "ATS markdown CV",
    kind: "cv",
    engine: "markdown-pdf",
    sourceExtension: ".md",
    pageLimit: 2,
    styleNotes: "Single column, extractable text, 2 pages target.",
    active: true,
  },
  {
    id: "cover-default",
    name: "Forward-looking cover letter",
    kind: "cover",
    engine: "markdown-pdf",
    sourceExtension: ".md",
    pageLimit: 1,
    styleNotes: "One page, posting language, no em-dashes.",
    active: true,
  },
]

function defaultSettings(): AppSettings {
  const providers = {} as AppSettings["providers"]
  for (const id of Object.keys(PROVIDER_META) as ProviderId[]) {
    providers[id] = {
      enabled: id === "mock",
      model: PROVIDER_META[id].defaultModel,
      bin: id.endsWith("-cli") ? id.replace("-cli", "") : undefined,
    }
  }
  providers.mock.enabled = true
  return {
    activeProvider: "mock",
    providers,
    salaryEnabled: false,
  }
}

let cache: StoreData | null = null

function file(): string {
  return path.join(dataDir(), "store.json")
}

export function loadStore(): StoreData {
  if (cache) return cache
  ensureDir(dataDir())
  ensureDir(path.join(dataDir(), "applications"))
  ensureDir(path.join(dataDir(), "exports"))
  ensureDir(path.join(dataDir(), "documents"))
  const existing = readJson<StoreData | null>(file(), null)
  if (existing) {
    cache = {
      profile: existing.profile || emptyProfile(),
      settings: { ...defaultSettings(), ...existing.settings, providers: { ...defaultSettings().providers, ...existing.settings?.providers } },
      jobs: existing.jobs || [],
      applications: existing.applications || [],
      history: existing.history || [],
      documents: existing.documents || [],
      portals: existing.portals?.length ? existing.portals : DEFAULT_PORTALS,
      templates: existing.templates?.length ? existing.templates : DEFAULT_TEMPLATES,
      companyResearch: existing.companyResearch || {},
      upskill: existing.upskill || [],
      gmail: existing.gmail || { lastSync: null, processedIds: [] },
    }
    return cache
  }
  cache = {
    profile: { ...DEMO_PROFILE },
    settings: defaultSettings(),
    jobs: [],
    applications: [],
    history: [
      {
        id: "hist-seed",
        at: new Date().toISOString(),
        kind: "setup",
        title: "Demo profile loaded",
        detail: "Amira Cole demo profile. Replace it from Setup when you are ready.",
      },
    ],
    documents: [],
    portals: DEFAULT_PORTALS,
    templates: DEFAULT_TEMPLATES,
    companyResearch: {},
    upskill: [],
    gmail: { lastSync: null, processedIds: [] },
  }
  persist()
  return cache
}

export function persist(): void {
  if (!cache) return
  atomicWrite(file(), JSON.stringify(cache, null, 2))
}

export function mutate<T>(fn: (s: StoreData) => T): T {
  const s = loadStore()
  const result = fn(s)
  persist()
  return result
}

export function addHistory(entry: Omit<HistoryEntry, "id" | "at"> & { id?: string; at?: string }): HistoryEntry {
  const full: HistoryEntry = {
    id: entry.id || `hist-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
    at: entry.at || new Date().toISOString(),
    kind: entry.kind,
    title: entry.title,
    detail: entry.detail,
    ref: entry.ref,
  }
  mutate((s) => {
    s.history.unshift(full)
    s.history = s.history.slice(0, 400)
  })
  return full
}

export function resetStore(scope: "profile" | "documents" | "all"): string[] {
  const cleared: string[] = []
  mutate((s) => {
    if (scope === "profile" || scope === "all") {
      s.profile = emptyProfile()
      s.jobs = []
      s.applications = []
      s.companyResearch = {}
      s.upskill = []
      cleared.push("profile", "jobs", "applications", "research", "upskill")
    }
    if (scope === "documents" || scope === "all") {
      s.documents = []
      const docs = path.join(dataDir(), "documents")
      if (fs.existsSync(docs)) fs.rmSync(docs, { recursive: true, force: true })
      ensureDir(docs)
      cleared.push("documents")
    }
  })
  addHistory({
    kind: "reset",
    title: `Reset ${scope}`,
    detail: `Cleared: ${cleared.join(", ")}`,
  })
  return cleared
}

export function clearStoreCache(): void {
  cache = null
}

export function seedDemo(): void {
  mutate((s) => {
    s.profile = { ...DEMO_PROFILE }
  })
  addHistory({ kind: "setup", title: "Demo profile restored", detail: "Amira Cole sample candidate." })
}
