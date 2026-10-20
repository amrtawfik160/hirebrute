import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import type { ProviderId } from "../shared/types.ts"
import { detectProviders, generate } from "../server/providers/registry.ts"
import { loadStore, mutate } from "../server/store.ts"
import { call, withApi } from "./support.ts"

const API_IDS: ProviderId[] = ["anthropic", "openai", "xai", "gemini", "openrouter"]
const CLI_IDS: ProviderId[] = ["claude-cli", "codex-cli", "grok-cli"]

function replyFor(url: string, text: string): { status: number; body: unknown } {
  if (url.includes("api.anthropic.com")) {
    return {
      status: 200,
      body: {
        id: "msg_test",
        type: "message",
        role: "assistant",
        model: "claude-sonnet-4-5",
        content: [{ type: "text", text }],
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 8, output_tokens: 4 },
      },
    }
  }
  if (url.includes("generativelanguage.googleapis.com")) {
    return {
      status: 200,
      body: {
        candidates: [
          {
            content: { role: "model", parts: [{ text }] },
            finishReason: "STOP",
          },
        ],
        usageMetadata: { promptTokenCount: 8, candidatesTokenCount: 4, totalTokenCount: 12 },
      },
    }
  }
  if (url.includes("/responses")) {
    return {
      status: 200,
      body: {
        id: "resp_test",
        object: "response",
        status: "completed",
        output: [
          {
            type: "message",
            id: "msg_test",
            role: "assistant",
            status: "completed",
            content: [{ type: "output_text", text, annotations: [] }],
          },
        ],
        usage: { input_tokens: 8, output_tokens: 4, total_tokens: 12 },
      },
    }
  }
  return {
    status: 200,
    body: {
      id: "chatcmpl-test",
      object: "chat.completion",
      created: 0,
      model: "gpt-4o",
      choices: [{ index: 0, message: { role: "assistant", content: text }, finish_reason: "stop" }],
      usage: { prompt_tokens: 8, completion_tokens: 4, total_tokens: 12 },
    },
  }
}

describe("provider detection and generation", () => {
  const originalFetch = globalThis.fetch
  const originalPath = process.env.PATH

  afterEach(() => {
    globalThis.fetch = originalFetch
    process.env.PATH = originalPath
  })

  it("lists all 9 providers and keeps the mock path offline", async () => {
    const found = await detectProviders()
    expect(found.map((p) => p.id)).toEqual([
      "claude-cli",
      "codex-cli",
      "grok-cli",
      "anthropic",
      "openai",
      "xai",
      "gemini",
      "openrouter",
      "mock",
    ])
    expect(found.find((p) => p.id === "mock")?.available).toBe(true)
    const { text, provider } = await generate({ system: "ping", prompt: "hello", provider: "mock" })
    expect(provider).toBe("mock")
    expect(text.length).toBeGreaterThan(0)
  })

  it("detects fake CLI binaries on PATH and returns their stdout", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jobdesk-bins-"))
    for (const name of ["claude", "codex", "grok"]) {
      const file = path.join(dir, name)
      fs.writeFileSync(file, `#!/bin/sh\nprintf '%s\\n' "ok-${name}"\n`)
      fs.chmodSync(file, 0o755)
    }
    process.env.PATH = `${dir}:${process.env.PATH}`
    const found = await detectProviders()
    for (const id of CLI_IDS) {
      expect(found.find((p) => p.id === id)?.available).toBe(true)
    }
    // claude-cli is intentionally excluded: it no longer shells out to the
    // `claude` binary. It generates through the Claude Agent SDK (so the chosen
    // model and reasoning effort apply), which is covered separately.
    for (const [id, name] of [
      ["codex-cli", "codex"],
      ["grok-cli", "grok"],
    ] as const) {
      const result = await generate({ system: "ping", prompt: "hello", provider: id })
      expect(result.provider).toBe(id)
      expect(result.text).toBe(`ok-${name}`)
    }
  })

  it("calls each API provider through mocked HTTP and hides the stored key", async () => {
    const calls: string[] = []
    globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url
      calls.push(`${init?.method || "GET"} ${url}`)
      const body = replyFor(url, `ok ${url}`)
      return new Response(JSON.stringify(body.body), {
        status: body.status,
        headers: { "content-type": "application/json" },
      })
    }) as typeof fetch

    for (const id of API_IDS) {
      mutate((s) => {
        s.settings.providers[id] = { ...s.settings.providers[id], apiKey: "sk-test-key-12345678", enabled: true }
        s.settings.activeProvider = id
      })
      const result = await generate({ system: "ping", prompt: "Say hello", provider: id })
      expect(result.provider).toBe(id)
      expect(result.text.length).toBeGreaterThan(0)
    }
    expect(calls.some((c) => c.includes("api.anthropic.com"))).toBe(true)
    expect(calls.some((c) => c.includes("api.openai.com"))).toBe(true)
    expect(calls.some((c) => c.includes("api.x.ai"))).toBe(true)
    expect(calls.some((c) => c.includes("generativelanguage.googleapis.com"))).toBe(true)
    expect(calls.some((c) => c.includes("openrouter.ai"))).toBe(true)
    expect(loadStore().settings.providers.openai.apiKey).toBe("sk-test-key-12345678")
    globalThis.fetch = originalFetch
    await withApi(async (base) => {
      const pub = await call(base, "/api/settings")
      expect(JSON.stringify(pub.json)).not.toContain("sk-test-key-12345678")
      expect(pub.json.providers.openai.keyPreview).toBe("sk-••••5678")
    })
  })

  it("surfaces a bad key and a network failure", async () => {
    await withApi(async (base) => {
      const missing = await call(base, "/api/generate", {
        method: "POST",
        json: { system: "ping", prompt: "hello", provider: "anthropic" },
      })
      expect(missing.status).toBe(400)
      expect(missing.json.error).toMatch(/API key/)
    })

    mutate((s) => {
      s.settings.providers.openai = { ...s.settings.providers.openai, apiKey: "sk-bad-key-00001111", enabled: true }
      s.settings.activeProvider = "openai"
    })
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: "invalid api key", type: "invalid_request_error" } }), {
        status: 401,
        headers: { "content-type": "application/json" },
      })) as typeof fetch
    await expect(generate({ system: "ping", prompt: "hello", provider: "openai" })).rejects.toThrow(/401|invalid api key|Incorrect API key/i)

    globalThis.fetch = (async () => {
      throw new TypeError("network down")
    }) as typeof fetch
    await expect(generate({ system: "ping", prompt: "hello", provider: "openai" })).rejects.toThrow(/network down/)
  })

  it("rejects an unknown provider id and switches the active one", async () => {
    await withApi(async (base) => {
      const bad = await call(base, "/api/providers/active", { method: "POST", json: { id: "not-a-provider" } })
      expect(bad.status).toBe(400)
      const ok = await call(base, "/api/providers/active", { method: "POST", json: { id: "openai" } })
      expect(ok.json.active).toBe("openai")
      const listed = await call(base, "/api/providers")
      expect(listed.json.active).toBe("openai")
      expect(listed.json.providers).toHaveLength(9)
      const back = await call(base, "/api/providers/active", { method: "POST", json: { id: "mock" } })
      expect(back.json.active).toBe("mock")
    })
  })
})
