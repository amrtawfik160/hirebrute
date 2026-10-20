import { spawn } from "node:child_process"

export interface CodexModel {
  id: string
  displayName?: string
  supportedReasoningEfforts?: string[]
}

// bb's approach for Codex: launch `codex app-server` (a stdio JSON-RPC server),
// run the `initialize` handshake, then call `model/list`. The `codex` CLI has no
// plain "list models" command, so this is the native source.
export async function listCodexModels(bin = "codex"): Promise<CodexModel[]> {
  return new Promise<CodexModel[]>((resolve) => {
    const child = spawn(bin, ["app-server"], { stdio: ["pipe", "pipe", "pipe"] })
    let buf = ""
    let settled = false
    let nextId = 0

    const done = (models: CodexModel[]) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try {
        child.kill("SIGKILL")
      } catch {
        /* ignore */
      }
      resolve(models)
    }

    const timer = setTimeout(() => done([]), 15_000)

    const send = (method: string, params: unknown) => {
      const req = { jsonrpc: "2.0", id: ++nextId, method, params: params || {} }
      try {
        child.stdin.write(JSON.stringify(req) + "\n")
      } catch {
        /* ignore */
      }
    }

    child.on("error", () => done([]))
    child.stdout.on("data", (d) => {
      buf += String(d)
      let nl: number
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim()
        buf = buf.slice(nl + 1)
        if (!line) continue
        let msg: { id?: number; result?: { data?: unknown[] } }
        try {
          msg = JSON.parse(line)
        } catch {
          continue
        }
        // id 1 = initialize reply → ask for the model list.
        if (msg.id === 1) send("model/list", {})
        // id 2 = model/list reply.
        if (msg.id === 2) {
          const rows = (msg.result?.data || []) as {
            id?: string
            model?: string
            displayName?: string
            hidden?: boolean
            supportedReasoningEfforts?: { reasoningEffort?: string }[]
          }[]
          const models = rows
            .filter((r) => !r.hidden && (r.id || r.model))
            .map((r) => ({
              id: (r.id || r.model) as string,
              displayName: r.displayName,
              supportedReasoningEfforts: (r.supportedReasoningEfforts || [])
                .map((e) => e.reasoningEffort || "")
                .filter(Boolean),
            }))
          done(models)
        }
      }
    })

    send("initialize", { clientInfo: { name: "hirebrute", version: "0.1.0" } })
  })
}
