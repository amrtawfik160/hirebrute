import { createHash } from "node:crypto"

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function jobKey(input: { company: string; title: string; url?: string }): string {
  const company = slugify(input.company || "unknown") || "unknown"
  const title = slugify(input.title || "role") || "role"
  const hash = createHash("sha1")
    .update(`${company}|${title}|${input.url || ""}`)
    .digest("hex")
    .slice(0, 8)
  const base = `${company}__${title}`
  const clipped = base.length > 72 ? base.slice(0, 72).replace(/-+$/, "") : base
  return `${clipped}__${hash}`
}

export function archiveSlug(company: string, role: string): string {
  const c = slugify(company)
  const r = slugify(role)
  const name = `${c}_${r}`.replace(/_+/g, "_")
  if (!c && !r) return ""
  return name.slice(0, 80)
}
