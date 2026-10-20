import { generateText } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createXai } from "@ai-sdk/xai"
import { REASONING_BUDGET } from "../../shared/constants.ts"
import type { ProviderId, ProviderSettings, ReasoningEffort } from "../../shared/types.ts"

// Translate the chosen reasoning effort into the per-provider knobs the AI SDK
// expects. Each provider exposes thinking differently, and most only honour it on
// specific models, so every branch guards on the model id and stays a no-op
// otherwise. Returns extra generateText options to spread into the call.
function reasoningOptions(
  id: ProviderId,
  modelId: string,
  reasoning: ReasoningEffort | undefined,
): Record<string, unknown> {
  if (!reasoning || reasoning === "off") return {}
  const budget = REASONING_BUDGET[reasoning]

  if (id === "anthropic") {
    // Extended thinking. Budget must sit below max output tokens.
    return {
      maxOutputTokens: budget + 8000,
      providerOptions: { anthropic: { thinking: { type: "enabled", budgetTokens: budget } } },
    }
  }
  if (id === "gemini") {
    // Thinking budget only applies to 2.5-series models.
    if (!/2\.5/.test(modelId)) return {}
    return { providerOptions: { google: { thinkingConfig: { thinkingBudget: budget } } } }
  }
  if (id === "xai") {
    // Only the grok *-mini reasoning models accept an effort, and only low/high.
    if (!/mini/i.test(modelId)) return {}
    return { providerOptions: { xai: { reasoningEffort: reasoning === "low" ? "low" : "high" } } }
  }
  if (id === "openai") {
    // reasoning_effort is only valid on the o-series and gpt-5 reasoning models.
    if (!/^(o\d|gpt-5)/i.test(modelId)) return {}
    return { providerOptions: { openai: { reasoningEffort: reasoning } } }
  }
  if (id === "openrouter") {
    // Best effort: OpenRouter forwards reasoning_effort to models that support it.
    return { providerOptions: { openai: { reasoningEffort: reasoning } } }
  }
  return {}
}

export async function apiGenerate(
  id: ProviderId,
  settings: ProviderSettings,
  system: string,
  prompt: string,
): Promise<string> {
  const key = settings.apiKey?.trim()
  if (!key) throw new Error(`${id} is missing an API key. Add it in Settings.`)
  const modelId = settings.model || defaultModel(id)
  const extra = reasoningOptions(id, modelId, settings.reasoning)

  if (id === "anthropic") {
    const anthropic = createAnthropic({ apiKey: key })
    const result = await generateText({
      model: anthropic(modelId),
      system,
      prompt,
      ...extra,
    })
    return result.text
  }

  if (id === "gemini") {
    const google = createGoogleGenerativeAI({ apiKey: key })
    const result = await generateText({
      model: google(modelId),
      system,
      prompt,
      ...extra,
    })
    return result.text
  }

  if (id === "xai") {
    const xai = createXai({ apiKey: key })
    const result = await generateText({
      model: xai(modelId),
      system,
      prompt,
      ...extra,
    })
    return result.text
  }

  const openai = createOpenAI({
    apiKey: key,
    baseURL: id === "openrouter" ? "https://openrouter.ai/api/v1" : undefined,
    headers:
      id === "openrouter"
        ? { "HTTP-Referer": "http://127.0.0.1:4317", "X-Title": "Hirebrute" }
        : undefined,
  })
  const result = await generateText({
    model: openai(modelId),
    system,
    prompt,
    ...extra,
  })
  return result.text
}

function defaultModel(id: ProviderId): string {
  switch (id) {
    case "anthropic":
      return "claude-sonnet-4-5"
    case "openai":
      return "gpt-4o"
    case "xai":
      return "grok-3"
    case "gemini":
      return "gemini-2.0-flash"
    case "openrouter":
      return "anthropic/claude-sonnet-4.5"
    default:
      return "gpt-4o"
  }
}
