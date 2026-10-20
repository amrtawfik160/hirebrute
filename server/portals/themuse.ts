import type { PortalHit } from "./index.ts"

interface MuseJob {
  name: string
  company?: { name?: string }
  locations?: { name?: string }[]
  refs?: { landing_page?: string }
  publication_date?: string
  contents?: string
}

export async function searchTheMuse(query: string, location?: string): Promise<PortalHit[]> {
  const params = new URLSearchParams({ page: "1" })
  if (location) params.append("location", location)
  const res = await fetch(`https://www.themuse.com/api/public/jobs?${params.toString()}`, {
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`themuse ${res.status}`)
  const data = (await res.json()) as { results?: MuseJob[] }
  const tokens = query.toLowerCase().split(/[^a-z0-9+#]+/).filter((t) => t.length > 1)
  let rows = data.results || []
  if (tokens.length) {
    const matched = rows.filter((j) => {
      const hay = `${j.name} ${j.company?.name || ""} ${j.contents || ""}`.toLowerCase()
      return tokens.some((t) => hay.includes(t))
    })
    if (matched.length) rows = matched
  }
  return rows.slice(0, 20).map((j) => ({
    title: j.name,
    company: j.company?.name || "Unknown",
    location: j.locations?.[0]?.name || "Unspecified",
    url: j.refs?.landing_page || "https://www.themuse.com/jobs",
    postedDate: j.publication_date?.slice(0, 10),
    description: strip(j.contents || ""),
    portal: "themuse",
  }))
}

function strip(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}
