import { spawn, type ChildProcess } from "node:child_process"
import fs from "node:fs"
import net, { type AddressInfo } from "node:net"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"

function startServer(port: number, data: string): ChildProcess {
  return spawn(process.execPath, ["node_modules/tsx/dist/cli.mjs", "server/index.ts"], {
    cwd: process.cwd(),
    env: { ...process.env, JOBDESK_DATA: data, JOBDESK_API_PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  })
}

async function waitFor(port: number, child: ChildProcess): Promise<void> {
  let log = ""
  child.stdout?.on("data", (chunk) => {
    log += String(chunk)
  })
  child.stderr?.on("data", (chunk) => {
    log += String(chunk)
  })
  for (let i = 0; i < 40; i++) {
    if (child.exitCode != null) throw new Error(`server exited ${child.exitCode}: ${log}`)
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`)
      if (res.ok) return
    } catch {
      /* still booting */
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`server did not listen: ${log}`)
}

async function stop(child: ChildProcess): Promise<void> {
  if (child.exitCode != null) return
  child.kill("SIGTERM")
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL")
      resolve()
    }, 3000)
    child.once("exit", () => {
      clearTimeout(timer)
      resolve()
    })
  })
}

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const probe = net.createServer()
    probe.listen(0, "127.0.0.1", () => {
      const port = (probe.address() as AddressInfo).port
      probe.close(() => resolve(port))
    })
  })
}

describe("persistence across restart", () => {
  const children: ChildProcess[] = []
  afterEach(async () => {
    await Promise.all(children.splice(0).map((child) => stop(child)))
  })

  it("keeps the profile after the API process is killed and started again", async () => {
    const data = fs.mkdtempSync(path.join(os.tmpdir(), "jobdesk-persist-"))
    const port = await freePort()
    const first = startServer(port, data)
    children.push(first)
    await waitFor(port, first)
    const saved = await fetch(`http://127.0.0.1:${port}/api/profile`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Persisted Person", email: "persisted.person@example.com" }),
    })
    expect(saved.status).toBe(200)
    await stop(first)

    const second = startServer(port, data)
    children.push(second)
    await waitFor(port, second)
    const again = await fetch(`http://127.0.0.1:${port}/api/profile`)
    const profile = (await again.json()) as { name: string; email: string }
    expect(profile.name).toBe("Persisted Person")
    expect(profile.email).toBe("persisted.person@example.com")
    const raw = fs.readFileSync(path.join(data, "store.json"), "utf8")
    expect(raw).toContain("Persisted Person")
    expect(raw).not.toContain("sk-ant-")
  })
})
