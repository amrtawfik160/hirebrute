import type { PortalConfig } from "../../shared/types.ts"
import type { PortalHit } from "./index.ts"

export async function searchRss(portal: PortalConfig, query: string): Promise<PortalHit[]> {
  if (!portal.endpoint) return []
  const param = portal.queryParam || "q"
  const url = portal.endpoint.includes("{q}")
    ? portal.endpoint.replace("{q}", encodeURIComponent(query))
    : `${portal.endpoint}${portal.endpoint.includes("?") ? "&" : "?"}${param}=${encodeURIComponent(query)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!res.ok) throw new Error(`${portal.id} ${res.status}`)
  const text = await res.text()
  if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
    return fromJson(portal.id, text)
  }
  return fromRss(portal.id, text)
}

function fromRss(portal: string, xml: string): PortalHit[] {
  const items = xml.split(/<item[\s>]/i).slice(1)
  return items.slice(0, 20).map((chunk) => {
    const title = tag(chunk, "title")
    const link = tag(chunk, "link")
    const desc = tag(chunk, "description")
    const date = tag(chunk, "pubDate")
    return {
      title: decode(title) || "Role",
      company: decode(tag(chunk, "source")) || portal,
      location: "Unspecified",
      url: link,
      postedDate: date ? new Date(date).toISOString().slice(0, 10) : undefined,
      description: decode(desc).replace(/<[^>]+>/g, " "),
      portal,
    }
  })
}

function fromJson(portal: string, raw: string): PortalHit[] {
  const data = JSON.parse(raw) as unknown
  const rows = Array.isArray(data)
    ? data
    : ((data as { results?: unknown[]; jobs?: unknown[]; data?: unknown[] }).results ||
        (data as { jobs?: unknown[] }).jobs ||
        (data as { data?: unknown[] }).data ||
        [])
  return (rows as Record<string, unknown>[]).slice(0, 20).map((j) => ({
    title: String(j.title || j.name || j.position || "Role"),
    company: String(j.company || j.company_name || (j.company as { name?: string } | undefined)?.name || "Unknown"),
    location: String(j.location || j.city || "Unspecified"),
    url: String(j.url || j.link || ""),
    postedDate: String(j.postedDate || j.created_at || "").slice(0, 10) || undefined,
    description: String(j.description || j.contents || ""),
    portal,
  }))
}

function tag(xml: string, name: string): string {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"))
  return m ? m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim() : ""
}

function decode(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}
