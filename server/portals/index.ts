import type { Job, PortalConfig, Profile } from "../../shared/types.ts"
import { repairMojibake } from "../../shared/text.ts"
import { jobKey } from "../../shared/jobKey.ts"
import { loadStore } from "../store.ts"
import { mockJobs } from "./mock.ts"
import { searchArbeitnow } from "./arbeitnow.ts"
import { searchFreehire } from "./freehire.ts"
import { searchRemoteOK } from "./remoteok.ts"
import { searchRemotive } from "./remotive.ts"
import { searchTheMuse } from "./themuse.ts"
import { searchRss } from "./rss.ts"

export interface PortalHit {
  title: string
  company: string
  location: string
  url: string
  postedDate?: string
  description?: string
  portal: string
}

export function toJob(hit: PortalHit): Job {
  return {
    key: jobKey({ company: hit.company, title: hit.title, url: hit.url }),
    title: repairMojibake(hit.title),
    company: repairMojibake(hit.company),
    location: repairMojibake(hit.location),
    url: hit.url,
    portal: hit.portal,
    postedDate: hit.postedDate,
    description: repairMojibake(hit.description || ""),
    snippet: repairMojibake((hit.description || "").slice(0, 280)),
    status: "new",
    seenAt: new Date().toISOString(),
  }
}

export function scrapeQuery(query: string, profile: Profile): string {
  const typed = query.trim()
  if (typed) return typed
  return profile.search.keywords.slice(0, 3).join(" ").trim() || profile.search.roles[0]?.trim() || ""
}

export async function searchPortal(
  portal: PortalConfig,
  profile: Profile,
  query: string,
): Promise<PortalHit[]> {
  const q = scrapeQuery(query, profile)
  if (portal.id === "mock") return mockJobs(profile, q || "software engineer")
  if (portal.id === "remotive") return await searchRemotive(q)
  if (portal.id === "arbeitnow") return await searchArbeitnow(q)
  if (portal.id === "remoteok") return await searchRemoteOK(q)
  if (portal.id === "themuse") return await searchTheMuse(q, profile.search.locations[0])
  if (portal.id === "freehire") return await searchFreehire(q)
  if ((portal.kind === "rss" || portal.kind === "json") && portal.endpoint) return await searchRss(portal, q)
  return []
}

export interface BoardReport {
  id: string
  name: string
  fetched: number
  error?: string
}

export async function scrapeAll(opts: { query?: string; portals?: string[]; limit?: number }): Promise<{
  jobs: Job[]
  ran: string[]
  failed: { id: string; error: string }[]
  boards: BoardReport[]
}> {
  const store = loadStore()
  const selected = store.portals.filter((p) => {
    if (opts.portals?.length) return opts.portals.includes(p.id)
    return p.enabled
  })
  const failed: { id: string; error: string }[] = []
  const ran: string[] = []
  const hits: PortalHit[] = []
  const boards: BoardReport[] = []
  await Promise.all(
    selected.map(async (p) => {
      try {
        const found = await searchPortal(p, store.profile, opts.query || "")
        const slice = found.slice(0, opts.limit ?? 20)
        ran.push(p.id)
        hits.push(...slice)
        boards.push({ id: p.id, name: p.name, fetched: slice.length })
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e)
        failed.push({ id: p.id, error })
        boards.push({ id: p.id, name: p.name, fetched: 0, error })
      }
    }),
  )
  boards.sort((a, b) => a.name.localeCompare(b.name))
  const jobs = hits.map(toJob)
  return { jobs, ran, failed, boards }
}

export function portalHosts(): string[] {
  return [
    "remotive.com",
    "arbeitnow.com",
    "remoteok.com",
    "themuse.com",
    "freehire.me",
    "greenhouse.io",
    "lever.co",
    ...loadStore()
      .portals.filter((p) => p.endpoint)
      .map((p) => {
        try {
          return new URL(p.endpoint!).hostname
        } catch {
          return ""
        }
      })
      .filter(Boolean),
  ]
}
