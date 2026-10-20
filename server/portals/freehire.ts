import type { PortalHit } from "./index.ts"

interface FreehireJob {
  title?: string
  company_name?: string
  company?: string | { name?: string }
  location?: string
  city?: string
  url?: string
  slug?: string
  public_slug?: string
  posted_at?: string
  published_at?: string
  description?: string
  description_text?: string
}

export async function searchFreehire(query: string): Promise<PortalHit[]> {
  const base = process.env.FREEHIRE_API_URL || "https://freehire.me"
  const params = new URLSearchParams({
    limit: "20",
    offset: "0",
    description_format: "text",
    posted_within_days: "30",
  })
  if (query.trim()) params.set("q", query.trim())
  const res = await fetch(`${base}/api/v1/agent/jobs/search?${params}`, {
    signal: AbortSignal.timeout(15_000),
    headers: { Accept: "application/json" },
  })
  if (!res.ok) throw new Error(`freehire ${res.status}`)
  const data = (await res.json()) as { results?: FreehireJob[]; jobs?: FreehireJob[]; data?: FreehireJob[] }
  const rows = data.results || data.jobs || data.data || []
  return rows.slice(0, 20).map((j) => ({
    title: j.title || "Role",
    company: companyName(j),
    location: j.location || j.city || "Unspecified",
    url: j.url || `${base}/jobs/${j.public_slug || j.slug || ""}`,
    postedDate: (j.posted_at || j.published_at || "").slice(0, 10) || undefined,
    description: j.description_text || j.description,
    portal: "freehire",
  }))
}

function companyName(job: FreehireJob): string {
  if (typeof job.company === "string" && job.company.trim()) return job.company.trim()
  if (job.company && typeof job.company === "object" && job.company.name) return job.company.name
  return job.company_name || "Unknown"
}
