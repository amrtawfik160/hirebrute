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
  const q = query.toLowerCase()
  return (data.data || [])
    .filter((j) => `${j.title} ${j.company_name} ${j.description || ""}`.toLowerCase().includes(q.split(" ")[0] || ""))
    .slice(0, 20)
    .map((j) => ({
      title: j.title,
      company: j.company_name,
      location: j.location || "Europe",
      url: j.url || `https://www.arbeitnow.com/jobs/${j.slug}`,
      postedDate: j.created_at ? new Date(j.created_at * 1000).toISOString().slice(0, 10) : undefined,
      description: j.description,
      portal: "arbeitnow",
    }))
}
