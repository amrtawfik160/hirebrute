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
  const company = slugify(input.company || "unknown")
  const title = slugify(input.title || "role")
  let base = `${company}__${title}`
  if (base.length > 80) {
    const hash = createHash("sha1").update(base).digest("hex").slice(0, 8)
    base = `${base.slice(0, 71)}-${hash}`
  }
  if (input.url) {
    try {
      const url = new URL(input.url)
      const id = url.pathname.split("/").filter(Boolean).slice(-1)[0] || ""
      const idSlug = slugify(id).slice(0, 24)
      if (idSlug && idSlug !== title && idSlug !== company) {
        return `${base}__${idSlug}`
      }
    } catch {
      /* ignore malformed urls */
    }
  }
  return base
}

export function archiveSlug(company: string, role: string): string {
  const c = slugify(company)
  const r = slugify(role)
  const name = `${c}_${r}`.replace(/_+/g, "_")
  if (!c && !r) return ""
  return name.slice(0, 80)
}
