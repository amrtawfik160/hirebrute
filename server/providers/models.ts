import { PROVIDER_META } from "../../shared/constants.ts"
import type { ProviderId, ProviderSettings } from "../../shared/types.ts"
import { listClaudeModels } from "./claudeAgent.ts"
import { listCodexModels } from "./codexAppServer.ts"

export interface ModelOption {
  // The value sent to the provider (stored in settings).
  id: string
  // Human-readable label shown in the dropdown.
  label: string
}

export interface ModelList {
  models: ModelOption[]
  // "live" when fetched from the provider, "catalog" when we fell back to the
  // static suggestions in PROVIDER_META.
  source: "live" | "catalog"
}

// Fetch the provider's own model list so the UI does not rely on a hand-kept
// array. Any failure (no key, network, unexpected shape) falls back to the
// static catalog so the dropdown is never empty.
export async function listModels(id: ProviderId, settings?: ProviderSettings): Promise<ModelList> {
  const catalog = (PROVIDER_META[id]?.models ?? []).map((m) => ({ id: m, label: m }))
  try {
    const live = await fetchLive(id, settings)
    if (live.length) return { models: dedupe(live), source: "live" }
  } catch {
    /* fall through to catalog */
  }
  return { models: catalog, source: "catalog" }
}

async function fetchLive(id: ProviderId, settings?: ProviderSettings): Promise<ModelOption[]> {
  // CLI providers: discover models from the tool itself, the way bb does.
  if (id === "claude-cli") {
    const models = await listClaudeModels()
    // The SDK returns friendly aliases ("default", "opus", "sonnet"…) alongside
    // raw pinned snapshot ids ("claude-opus-4-8", "claude-sonnet-4-6"…). Show
    // only the named aliases — those are the real, current, selectable models.
    return models
      .filter((m) => !/^claude-/.test(m.value))
      .map((m) => ({ id: m.value, label: m.displayName || m.value }))
  }
  if (id === "codex-cli") {
    const models = await listCodexModels(settings?.bin || "codex")
    return models.map((m) => ({ id: m.id, label: m.displayName || m.id }))
  }

  const key = settings?.apiKey?.trim()
  const signal = AbortSignal.timeout(10_000)

  if (id === "openrouter") {
    // Public, no key required.
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: key ? { Authorization: `Bearer ${key}` } : undefined,
      signal,
    })
    const data = (await res.json()) as { data?: { id?: string; name?: string }[] }
    return (data.data || [])
      .filter((m) => m.id)
      .map((m) => ({ id: m.id as string, label: m.name || (m.id as string) }))
      .sort((a, b) => a.id.localeCompare(b.id))
  }

  if (!key) return []

  if (id === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/models?limit=1000", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
      signal,
    })
    const data = (await res.json()) as { data?: { id?: string; display_name?: string }[] }
    return (data.data || [])
      .filter((m) => m.id)
      .map((m) => ({ id: m.id as string, label: m.display_name || (m.id as string) }))
  }

  if (id === "gemini") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&key=${encodeURIComponent(key)}`,
      { signal },
    )
    const data = (await res.json()) as {
      models?: { name?: string; displayName?: string; supportedGenerationMethods?: string[] }[]
    }
    return (data.models || [])
      .filter((m) => !m.supportedGenerationMethods || m.supportedGenerationMethods.includes("generateContent"))
      .map((m) => {
        const id = (m.name || "").replace(/^models\//, "")
        return { id, label: m.displayName || id }
      })
      .filter((m) => m.id)
      .sort((a, b) => a.id.localeCompare(b.id))
  }

  // openai and xai are both OpenAI-compatible: GET /v1/models with a Bearer key.
  const base = id === "xai" ? "https://api.x.ai/v1" : "https://api.openai.com/v1"
  const res = await fetch(`${base}/models`, {
    headers: { Authorization: `Bearer ${key}` },
    signal,
  })
  const data = (await res.json()) as { data?: { id?: string }[] }
  return (data.data || [])
    .filter((m) => m.id)
    .map((m) => ({ id: m.id as string, label: m.id as string }))
    .sort((a, b) => a.id.localeCompare(b.id))
}

function dedupe(list: ModelOption[]): ModelOption[] {
  const seen = new Set<string>()
  const out: ModelOption[] = []
  for (const m of list) {
    if (seen.has(m.id)) continue
    seen.add(m.id)
    out.push(m)
  }
  return out
}
