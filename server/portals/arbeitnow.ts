import type { PortalHit } from "./index.ts"

interface ArbeitnowJob {
  slug: string
  title: string
  company_name: string
  location?: string
  url?: string
  created_at?: number
  description?: string
}

export async function searchArbeitnow(query: string): Promise<PortalHit[]> {
  const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`arbeitnow ${res.status}`)
  const data = (await res.json()) as { data?: ArbeitnowJob[] }
  const tokens = query.toLowerCase().split(/[^a-z0-9+#]+/).filter((t) => t.length > 1)
  return (data.data || [])
    .filter((j) => {
      if (!tokens.length) return true
      const hay = `${j.title} ${j.company_name} ${j.description || ""}`.toLowerCase()
      return tokens.some((t) => hay.includes(t))
    })
    .slice(0, 20)
    .map((j) => ({
      title: j.title,
      company: j.company_name,
      location: j.location || "Europe",
      url: j.url || `https://www.arbeitnow.com/jobs/${j.slug}`,
      postedDate: j.created_at ? new Date(j.created_at * 1000).toISOString().slice(0, 10) : undefined,
      description: strip(j.description || ""),
      portal: "arbeitnow",
    }))
}

function strip(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}
