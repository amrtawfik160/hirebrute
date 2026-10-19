import type { PortalHit } from "./index.ts"

interface RemoteOkJob {
  id?: string | number
  position?: string
  title?: string
  company?: string
  location?: string
  url?: string
  date?: string
  description?: string
}

export async function searchRemoteOK(query: string): Promise<PortalHit[]> {
  const res = await fetch("https://remoteok.com/api", {
    headers: { "User-Agent": "JobDesk/1.0 (local-first job search)" },
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`remoteok ${res.status}`)
  const data = (await res.json()) as RemoteOkJob[]
  const q = query.toLowerCase()
  return data
    .filter((j) => j.position || j.title)
    .filter((j) => `${j.position} ${j.title} ${j.company}`.toLowerCase().includes(q.split(" ")[0] || ""))
    .slice(0, 20)
    .map((j) => ({
      title: j.position || j.title || "Role",
      company: j.company || "Unknown",
      location: j.location || "Remote",
      url: j.url || `https://remoteok.com/l/${j.id}`,
      postedDate: j.date?.slice(0, 10),
      description: j.description,
      portal: "remoteok",
    }))
}
