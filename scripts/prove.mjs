import { spawn } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const ROOT = path.resolve(import.meta.dirname, "..")
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), "jobdesk-prove-"))
const API = "http://127.0.0.1:4318"
const WEB = "http://127.0.0.1:4317"
const outDir = path.join(ROOT, "docs", "proof")
fs.mkdirSync(outDir, { recursive: true })

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function json(url, opts) {
  const res = await fetch(url, {
    ...opts,
    headers: { "content-type": "application/json", ...(opts?.headers || {}) },
  })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = { raw: text }
  }
  if (!res.ok) throw new Error(`${res.status} ${url} ${text.slice(0, 400)}`)
  return body
}

async function waitFor(url, timeoutMs = 20000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url)
      if (res.ok) return
    } catch {
      /* retry */
    }
    await wait(250)
  }
  throw new Error(`timeout waiting for ${url}`)
}

const env = { ...process.env, JOBDESK_DATA: DATA, PORT: "4317" }
const api = spawn("npx", ["tsx", "server/index.ts"], { cwd: ROOT, env, stdio: "pipe" })
const web = spawn("npx", ["vite"], { cwd: ROOT, env, stdio: "pipe" })

const logs = []
api.stdout.on("data", (d) => logs.push(`api ${d}`))
api.stderr.on("data", (d) => logs.push(`apierr ${d}`))
web.stdout.on("data", (d) => logs.push(`web ${d}`))
web.stderr.on("data", (d) => logs.push(`weberr ${d}`))

function stop() {
  api.kill("SIGTERM")
  web.kill("SIGTERM")
}

try {
  await waitFor(`${API}/api/health`)
  await waitFor(WEB)

  const health = await json(`${API}/api/health`)
  const providers = await json(`${API}/api/providers`)
  const scrape = await json(`${API}/api/jobs/scrape`, {
    method: "POST",
    body: JSON.stringify({ query: "AI engineer", portals: ["mock"] }),
  })
  const posting = fs.readFileSync(new URL("./demo-posting.txt", import.meta.url), "utf8")
  const evaluation = await json(`${API}/api/apply/evaluate`, {
    method: "POST",
    body: JSON.stringify({ text: posting }),
  })
  const draft = await json(`${API}/api/apply/draft`, {
    method: "POST",
    body: JSON.stringify({ text: posting }),
  })
  const dashboard = await json(`${API}/api/dashboard`)

  const proof = {
    at: new Date().toISOString(),
    health,
    providerCount: Array.isArray(providers) ? providers.length : providers.providers?.length,
    scrapeCount: scrape.jobs?.length ?? scrape.length,
    evaluation: {
      company: evaluation.evaluation?.company,
      overall: evaluation.evaluation?.overall,
      blocked: evaluation.blocked,
    },
    draft: {
      hasCv: Boolean(draft.cvMarkdown || draft.application?.archive?.cvMarkdown),
      hasCover: Boolean(draft.coverMarkdown || draft.application?.archive?.coverMarkdown),
    },
    dashboard,
  }
  fs.writeFileSync(path.join(outDir, "api.json"), JSON.stringify(proof, null, 2))
  console.log(JSON.stringify(proof, null, 2))
} catch (err) {
  fs.writeFileSync(path.join(outDir, "api.error.txt"), String(err) + "\n" + logs.slice(-40).join(""))
  console.error(err)
  stop()
  process.exit(1)
}

stop()
process.exit(0)
