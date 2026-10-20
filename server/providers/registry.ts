import { PROVIDER_META } from "../../shared/constants.ts"
import type { ProviderId, ProviderStatus } from "../../shared/types.ts"
import { loadStore } from "../store.ts"
import { apiGenerate } from "./api.ts"
import { runPromptCli, which } from "./cli.ts"
import { mockGenerate } from "./mock.ts"
import { resolveProvider } from "./resolve.ts"

export interface GenerateRequest {
  system: string
  prompt: string
  json?: boolean
  provider?: ProviderId
}

export { resolveProvider } from "./resolve.ts"
export type { ResolvedProvider } from "./resolve.ts"

const CLI_BINS: Record<string, string[]> = {
  "claude-cli": ["claude"],
  "codex-cli": ["codex"],
  "grok-cli": ["grok", "grok-cli", "xai"],
}

export async function detectProviders(): Promise<ProviderStatus[]> {
  const settings = loadStore().settings
  const out: ProviderStatus[] = []
  for (const id of Object.keys(PROVIDER_META) as ProviderId[]) {
    const meta = PROVIDER_META[id]
    const cfg = settings.providers[id]
    if (id === "mock") {
      out.push({
        id,
        label: meta.label,
        kind: meta.kind,
        available: true,
        configured: true,
        detail: "Off until you select it. Local sample text for tests. No network and no keys.",
        models: [meta.defaultModel],
      })
      continue
    }
    if (meta.kind === "cli") {
      const bins = [cfg?.bin, ...(CLI_BINS[id] || [])].filter(Boolean) as string[]
      let found: string | null = null
      for (const bin of bins) {
        found = await which(bin)
        if (found) break
      }
      out.push({
        id,
        label: meta.label,
        kind: "cli",
        available: Boolean(found),
        configured: Boolean(found),
        detail: found
          ? `Found ${found}. Uses your local subscription; no API key stored.`
          : `Not installed. ${meta.docs}`,
        models: [cfg?.model || meta.defaultModel],
      })
      continue
    }
    const hasKey = Boolean(cfg?.apiKey)
    out.push({
      id,
      label: meta.label,
      kind: "api",
      available: hasKey,
      configured: hasKey,
      detail: hasKey ? "API key stored locally in data/store.json." : `No key yet. ${meta.docs}`,
      models: [cfg?.model || meta.defaultModel],
    })
  }
  return out
}

export async function generate(req: GenerateRequest): Promise<{ text: string; provider: ProviderId }> {
  const store = loadStore()
  const id = req.provider || store.settings.activeProvider
  if (!id) {
    throw new Error(
      "No provider selected. Open Settings and choose a CLI or an API key. Offline test mode stays off until you turn it on.",
    )
  }
  const cfg = store.settings.providers[id]
  const resolved = resolveProvider(id, cfg)
  const system = req.system
  const prompt = req.json
    ? `${req.prompt}\n\nReturn ONLY valid JSON. No markdown unless the JSON is inside the payload.`
    : req.prompt

  if (resolved.kind === "mock") {
    return { text: mockGenerate(system, prompt, req.json), provider: "mock" }
  }

  if (resolved.kind === "cli") {
    const bins = [resolved.bin, ...(CLI_BINS[id] || [])]
    let found: string | null = null
    for (const bin of bins) {
      found = await which(bin)
      if (found) break
    }
    if (!found) {
      throw new Error(`${PROVIDER_META[id].label} CLI not found on PATH. Install it or switch providers.`)
    }
    let args: string[]
    if (id === "claude-cli") {
      args = ["-p", "$PROMPT", "--output-format", "text", ...resolved.extraArgs]
    } else if (id === "codex-cli") {
      args = ["exec", "--skip-git-repo-check", "$PROMPT", ...resolved.extraArgs]
    } else {
      args = resolved.extraArgs.length ? resolved.extraArgs : ["-p", "$PROMPT"]
    }
    const full = `SYSTEM:\n${system}\n\nUSER:\n${prompt}`
    const text = await runPromptCli({ bin: found, args, prompt: full })
    return { text, provider: id }
  }

  if (!resolved.apiKey) {
    throw new Error(`${PROVIDER_META[id].label} is missing an API key. Add it in Settings.`)
  }
  const text = await apiGenerate(id, { ...cfg, apiKey: resolved.apiKey, model: resolved.model }, system, prompt)
  return { text, provider: id }
}

export function maskKey(key?: string): string {
  if (!key) return ""
  if (key.length < 8) return "••••"
  return `${key.slice(0, 3)}••••${key.slice(-4)}`
}
