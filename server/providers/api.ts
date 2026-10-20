import { generateText } from "ai"
import { createAnthropic } from "@ai-sdk/anthropic"
import { createOpenAI } from "@ai-sdk/openai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createXai } from "@ai-sdk/xai"
import type { ProviderId, ProviderSettings } from "../../shared/types.ts"

export async function apiGenerate(
  id: ProviderId,
  settings: ProviderSettings,
  system: string,
  prompt: string,
): Promise<string> {
  const key = settings.apiKey?.trim()
  if (!key) throw new Error(`${id} is missing an API key. Add it in Settings.`)
  const modelId = settings.model || defaultModel(id)

  if (id === "anthropic") {
    const anthropic = createAnthropic({ apiKey: key })
    const result = await generateText({
      model: anthropic(modelId),
      system,
      prompt,
    })
    return result.text
  }

  if (id === "gemini") {
    const google = createGoogleGenerativeAI({ apiKey: key })
    const result = await generateText({
      model: google(modelId),
      system,
      prompt,
    })
    return result.text
  }

  if (id === "xai") {
    const xai = createXai({ apiKey: key })
    const result = await generateText({
      model: xai(modelId),
      system,
      prompt,
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
