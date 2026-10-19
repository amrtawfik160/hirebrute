import type { PortalHit } from "./index.ts"

interface FreehireJob {
  title?: string
  company_name?: string
  company?: { name?: string }
  location?: string
  city?: string
  url?: string
  slug?: string
  posted_at?: string
  published_at?: string
  description?: string
  description_text?: string
}

export async function searchFreehire(query: string): Promise<PortalHit[]> {
  const base = process.env.FREEHIRE_API_URL || "https://freehire.me"
  const params = new URLSearchParams({
    q: query,
    limit: "20",
    offset: "0",
    description_format: "text",
    posted_within_days: "14",
  })
  const res = await fetch(`${base}/api/v1/agent/jobs/search?${params}`, {
    signal: AbortSignal.timeout(15_000),
    headers: { Accept: "application/json" },
  })
  if (!res.ok) throw new Error(`freehire ${res.status}`)
  const data = (await res.json()) as { results?: FreehireJob[]; jobs?: FreehireJob[]; data?: FreehireJob[] }
  const rows = data.results || data.jobs || data.data || []
  return rows.slice(0, 20).map((j) => ({
    title: j.title || "Role",
    company: j.company_name || j.company?.name || "Unknown",
    location: j.location || j.city || "Unspecified",
    url: j.url || `${base}/jobs/${j.slug || ""}`,
    postedDate: (j.posted_at || j.published_at || "").slice(0, 10) || undefined,
    description: j.description_text || j.description,
    portal: "freehire",
  }))
}
