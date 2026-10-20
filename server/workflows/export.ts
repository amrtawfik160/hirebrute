import fs from "node:fs"
import path from "node:path"
import { ZipArchive } from "archiver"
import { TRACKER_HEADER } from "../../shared/constants.ts"
import { dashboardStats } from "../../shared/dashboard.ts"
import { csvSafe } from "../../shared/status.ts"
import type { Application } from "../../shared/types.ts"
import { dataDir, ensureDir } from "../paths.ts"
import { addHistory, loadStore, type StoreData } from "../store.ts"

function trackerRow(app: Application): string {
  return [
    app.date,
    csvSafe(app.company),
    csvSafe(app.sector),
    csvSafe(app.role),
    csvSafe(app.roleType),
    csvSafe(app.channel),
    app.status,
    csvSafe(app.contactPerson),
    app.fitRating ?? "",
    csvSafe(app.notes),
    csvSafe(app.cvFile),
    csvSafe(app.coverLetterFile),
    csvSafe(app.source),
    csvSafe(app.deadline),
  ].join(",")
}

export function trackerCsv(applications: Application[]): string {
  return [TRACKER_HEADER, ...applications.map(trackerRow)].join("\n")
}

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export function dashboardHtml(store: StoreData): string {
  const stats = dashboardStats(store.applications)
  const rows = store.applications
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || a.company.localeCompare(b.company))
    .map(
      (a) =>
        `<tr><td>${esc(a.date)}</td><td>${esc(a.company)}</td><td>${esc(a.role)}</td><td>${esc(a.status)}</td><td>${a.fitRating ?? ""}</td></tr>`,
    )
    .join("")
  const max = Math.max(1, ...stats.funnel.map((f) => f.count))
  const bars = stats.funnel
    .map((f, i) => {
      const w = Math.round((f.count / max) * 280)
      return `<g transform="translate(0 ${i * 56})"><text x="8" y="16" font-size="12">${esc(f.stage)} ${f.count}</text><rect x="0" y="22" width="${w}" height="16" fill="#ffdc58" stroke="#000" stroke-width="2"/></g>`
    })
    .join("")
  const rate =
    stats.rejectionRate == null ? "n/a" : `${Math.round(stats.rejectionRate * 100)}%`
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Hirebrute report</title>
<style>body{font-family:Georgia,serif;background:#fff7e8;color:#000;padding:24px}table{border-collapse:collapse;width:100%}td,th{border:2px solid #000;padding:6px 8px;text-align:left}h1{font-family:Impact,sans-serif}</style>
</head><body>
<h1>Hirebrute</h1>
<p>Sent ${stats.sent} · Drafted ${stats.drafted} · Interviews ${stats.interview} · Offers ${stats.offer} · Rejection rate ${rate}</p>
<p>Drafted rows are excluded from sent, funnel, and rejection rate. offer_declined and withdrawn are not rejections.</p>
<svg width="320" height="${stats.funnel.length * 56}" xmlns="http://www.w3.org/2000/svg">
${bars}
</svg>
<table><thead><tr><th>Date</th><th>Company</th><th>Role</th><th>Status</th><th>Fit</th></tr></thead>
<tbody>${rows}</tbody></table>
</body></html>`
}

export async function exportBundle(kind: "json" | "csv" | "html" | "zip"): Promise<{ filename: string; path: string; mime: string }> {
  const store = loadStore()
  const dir = path.join(dataDir(), "exports")
  ensureDir(dir)
  const stamp = new Date().toISOString().slice(0, 10)
  if (kind === "json") {
    const filename = `hirebrute-${stamp}.json`
    const dest = path.join(dir, filename)
    const safe = {
      ...store,
      settings: {
        ...store.settings,
        providers: Object.fromEntries(
          Object.entries(store.settings.providers).map(([id, p]) => [id, { ...p, apiKey: p.apiKey ? "••••" : undefined }]),
        ),
        notionToken: store.settings.notionToken ? "••••" : undefined,
      },
    }
    fs.writeFileSync(dest, JSON.stringify(safe, null, 2))
    addHistory({ kind: "export", title: "Exported JSON", detail: filename })
    return { filename, path: dest, mime: "application/json" }
  }
  if (kind === "csv") {
    const filename = `tracker-${stamp}.csv`
    const dest = path.join(dir, filename)
    fs.writeFileSync(dest, trackerCsv(store.applications))
    addHistory({ kind: "export", title: "Exported tracker CSV", detail: filename })
    return { filename, path: dest, mime: "text/csv" }
  }
  if (kind === "html") {
    const filename = `application-dashboard.html`
    const dest = path.join(dir, filename)
    fs.writeFileSync(dest, dashboardHtml(store))
    addHistory({ kind: "export", title: "Exported HTML dashboard", detail: filename })
    return { filename, path: dest, mime: "text/html" }
  }
  const filename = `hirebrute-${stamp}.zip`
  const dest = path.join(dir, filename)
  await zipFiles(dest, store)
  addHistory({ kind: "export", title: "Exported zip", detail: filename })
  return { filename, path: dest, mime: "application/zip" }
}

function zipFiles(dest: string, store: StoreData): Promise<void> {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(dest)
    const archive = new ZipArchive({ zlib: { level: 9 } })
    output.on("close", () => resolve())
    archive.on("error", reject)
    archive.pipe(output)
    archive.append(JSON.stringify({ profile: store.profile, applications: store.applications, jobs: store.jobs }, null, 2), {
      name: "snapshot.json",
    })
    archive.append(trackerCsv(store.applications), { name: "tracker.csv" })
    archive.append(dashboardHtml(store), { name: "application-dashboard.html" })
    archive.finalize()
  })
}

export function notionSnapshot(): {
  pages: { key: string; company: string; role: string; status: string; deadline: string; appliedOn: string | null }[]
  warning: string
} {
  const store = loadStore()
  const pages = store.applications.map((a) => ({
    key: a.jobKey || a.slug,
    company: a.company,
    role: a.role,
    status: a.status,
    deadline: a.deadline,
    appliedOn: a.status === "drafted" ? null : a.date,
  }))
  addHistory({
    kind: "sync",
    title: "Notion snapshot exported",
    detail: `${pages.length} rows. Repo stays the system of record; Notion does not sync back.`,
  })
  return {
    pages,
    warning: "This is a one-way snapshot. Edits in Notion never flow back into Hirebrute.",
  }
}
