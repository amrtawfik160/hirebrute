import { query } from "@anthropic-ai/claude-agent-sdk"
import type { ReasoningEffort } from "../../shared/types.ts"

export interface ClaudeModel {
  value: string
  resolvedModel?: string
  displayName: string
  description?: string
  supportedEffortLevels: string[]
}

// bb's approach: start an Agent SDK session that never runs a turn, read the
// initialization result, and take the live model catalog from it. The `claude`
// CLI has no "list models" command, so this is the only native source.
export async function listClaudeModels(): Promise<ClaudeModel[]> {
  const ac = new AbortController()
  // Intentionally never yields: it keeps the session open through init, then the
  // abort below ends it. The SDK needs a streaming-input generator here.
  // oxlint-disable-next-line require-yield
  async function* idlePrompt(): AsyncGenerator<never> {
    await new Promise<void>((r) => ac.signal.addEventListener("abort", () => r(), { once: true }))
  }
  // Safety net: never let the probe hang the request.
  const timer = setTimeout(() => ac.abort(), 20_000)
  const session = query({
    prompt: idlePrompt(),
    options: { persistSession: false, settingSources: ["user"] },
  })
  try {
    const init = (await session.initializationResult()) as {
      models?: {
        value: string
        resolvedModel?: string
        displayName?: string
        description?: string
        supportedEffortLevels?: string[]
      }[]
    }
    return (init.models || []).map((m) => ({
      value: m.value,
      resolvedModel: m.resolvedModel,
      displayName: m.displayName || m.value,
      description: m.description,
      supportedEffortLevels: m.supportedEffortLevels || [],
    }))
  } finally {
    clearTimeout(timer)
    ac.abort()
  }
}

// Map Hirebrute's reasoning levels onto the Agent SDK's effort levels.
function toSdkEffort(reasoning?: ReasoningEffort): "low" | "medium" | "high" | undefined {
  if (!reasoning || reasoning === "off") return undefined
  return reasoning
}

// One-shot text generation through the Claude Code subscription (no API key),
// honouring the chosen model and reasoning effort.
export async function claudeAgentGenerate(opts: {
  model?: string
  reasoning?: ReasoningEffort
  system: string
  prompt: string
}): Promise<string> {
  const effort = toSdkEffort(opts.reasoning)
  const full = `SYSTEM:\n${opts.system}\n\nUSER:\n${opts.prompt}`
  const session = query({
    prompt: full,
    options: {
      // Pure text generation: no tools, no project context.
      model: opts.model && opts.model !== "default" ? opts.model : undefined,
      ...(effort ? { effort, thinking: { type: "adaptive", display: "summarized" } } : {}),
      persistSession: false,
      settingSources: [],
      allowedTools: [],
    },
  })
  let text = ""
  for await (const msg of session as AsyncIterable<Record<string, unknown>>) {
    if (msg.type === "assistant") {
      const content = (msg.message as { content?: { type: string; text?: string }[] })?.content || []
      for (const b of content) if (b.type === "text" && b.text) text += b.text
    }
    if (msg.type === "result") {
      if (msg.is_error) throw new Error(`Claude Code session error: ${String(msg.subtype ?? "unknown")}`)
      break
    }
  }
  return text.trim()
}
