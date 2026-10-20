import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { createApp } from "../server/app.ts"

export async function withApi(run: (base: string) => Promise<void>): Promise<void> {
  const server: Server = createServer(createApp())
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()))
  const address = server.address() as AddressInfo
  try {
    await run(`http://127.0.0.1:${address.port}`)
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

export async function call(
  base: string,
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<{ status: number; json: any; text: string; headers: Headers }> {
  const headers = new Headers(init?.headers)
  let body = init?.body
  if (init && "json" in init) {
    headers.set("content-type", "application/json")
    body = JSON.stringify(init.json)
  }
  const res = await fetch(`${base}${path}`, { ...init, headers, body })
  const text = await res.text()
  let json: any = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }
  return { status: res.status, json, text, headers: res.headers }
}

export const SAMPLE_POSTING = `Staff AI Engineer, Evaluation
Northstar Robotics · San Francisco, CA (hybrid 2 days)

We are hiring a Staff AI Engineer to own the evaluation stack for our warehouse robotics copilot.
Requirements: 7+ years applied ML or search, RAG, Python, TypeScript, faithfulness evaluation.
English is the working language. International applicants already authorized to work in the US are welcome.`

export const CV_PASTE = `Name: Jordan Hale
Email: jordan.hale@example.com
Phone: +1 415 555 0199
Location: Berlin, DE
Headline: Platform engineer who keeps deploy bars honest
Skills: Go
Skill: span sampling
Project: Nightly Gate
`
