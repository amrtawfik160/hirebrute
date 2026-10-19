import type { PortalHit } from "./index.ts"

interface RemotiveJob {
  id: number
  url: string
  title: string
  company_name: string
  candidate_required_location?: string
  publication_date?: string
  description?: string
}

export async function searchRemotive(query: string): Promise<PortalHit[]> {
  const url = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(query)}&limit=20`
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`remotive ${res.status}`)
  const data = (await res.json()) as { jobs?: RemotiveJob[] }
  return (data.jobs || []).slice(0, 20).map((j) => ({
    title: j.title,
    company: j.company_name,
    location: j.candidate_required_location || "Remote",
    url: j.url,
    postedDate: j.publication_date?.slice(0, 10),
    description: strip(j.description || ""),
    portal: "remotive",
  }))
}

function strip(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}
