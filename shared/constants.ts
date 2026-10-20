import type { ApplicationStatus, ProviderId } from "./types.ts"

export const APP_NAME = "Hirebrute"
export const APP_PORT_WEB = 4317
export const APP_PORT_API = 4318

export const PROVIDER_META: Record<
  ProviderId,
  {
    label: string
    kind: "cli" | "api" | "mock"
    defaultModel: string
    docs: string
    // Suggested models for the Settings dropdown. A custom model can always be typed.
    models: string[]
    // Whether a reasoning / thinking effort control applies to this provider.
    supportsReasoning: boolean
  }
> = {
  "claude-cli": {
    label: "Claude Code CLI",
    kind: "cli",
    defaultModel: "default",
    docs: "Uses your Claude Pro/Max/Team subscription via the `claude` binary. Install: https://docs.anthropic.com/en/docs/claude-code",
    models: ["default", "sonnet", "opus", "haiku"],
    supportsReasoning: true,
  },
  "codex-cli": {
    label: "Codex CLI",
    kind: "cli",
    defaultModel: "default",
    docs: "Uses your ChatGPT subscription via the `codex` binary (OpenAI Codex CLI).",
    models: ["default", "gpt-5-codex", "gpt-5", "o4-mini"],
    supportsReasoning: true,
  },
  "grok-cli": {
    label: "Grok CLI",
    kind: "cli",
    defaultModel: "default",
    docs: "Uses a local `grok` CLI if installed. Falls back to the xAI API key provider.",
    models: ["default"],
    supportsReasoning: false,
  },
  anthropic: {
    label: "Anthropic API",
    kind: "api",
    defaultModel: "claude-sonnet-4-5",
    docs: "Direct Anthropic API key from https://console.anthropic.com/",
    models: ["claude-sonnet-4-5", "claude-opus-4-1", "claude-haiku-4-5", "claude-3-5-haiku-latest"],
    supportsReasoning: true,
  },
  openai: {
    label: "OpenAI API",
    kind: "api",
    defaultModel: "gpt-4o",
    docs: "Direct OpenAI API key from https://platform.openai.com/",
    models: ["gpt-4o", "gpt-4o-mini", "gpt-4.1", "gpt-5", "o4-mini", "o3"],
    supportsReasoning: true,
  },
  xai: {
    label: "xAI API (Grok)",
    kind: "api",
    defaultModel: "grok-3",
    docs: "xAI API key from https://console.x.ai/",
    models: ["grok-3", "grok-3-mini", "grok-4"],
    supportsReasoning: true,
  },
  gemini: {
    label: "Gemini API",
    kind: "api",
    defaultModel: "gemini-2.0-flash",
    docs: "Google AI Studio key from https://aistudio.google.com/",
    models: ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"],
    supportsReasoning: true,
  },
  openrouter: {
    label: "OpenRouter",
    kind: "api",
    defaultModel: "anthropic/claude-sonnet-4.5",
    docs: "One key, many models. https://openrouter.ai/",
    models: [
      "anthropic/claude-sonnet-4.5",
      "openai/gpt-5",
      "google/gemini-2.5-pro",
      "x-ai/grok-4",
      "deepseek/deepseek-r1",
    ],
    supportsReasoning: true,
  },
  mock: {
    label: "Offline test mode",
    kind: "mock",
    defaultModel: "heuristic",
    docs: "Opt-in. Writes local sample text for tests. It does not call a model and it does not search live boards.",
    models: ["heuristic"],
    supportsReasoning: false,
  },
}

// Reasoning effort → token budget for providers that take a thinking-token budget.
export const REASONING_BUDGET: Record<"low" | "medium" | "high", number> = {
  low: 2048,
  medium: 6144,
  high: 12288,
}

export const ATS_HOSTS = [
  "greenhouse.io",
  "lever.co",
  "myworkdayjobs.com",
  "workday.com",
  "ashbyhq.com",
  "smartrecruiters.com",
  "workable.com",
]

export const FINAL_STATUSES: ApplicationStatus[] = [
  "hired",
  "rejected",
  "no_response",
  "offer_declined",
  "withdrawn",
]

export const OPEN_STATUSES: ApplicationStatus[] = [
  "drafted",
  "applied",
  "interview",
  "offer",
]

export const STATUS_BUCKET: Record<string, string> = {
  drafted: "Drafted",
  applied: "Active",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  rejected: "Rejected/Closed",
  no_response: "Rejected/Closed",
  "no response": "Rejected/Closed",
  offer_declined: "Rejected/Closed",
  "offer declined": "Rejected/Closed",
  withdrawn: "Rejected/Closed",
}

export const TRACKER_HEADER =
  "date,company,sector,role,role_type,channel,status,contact_person,fit_rating,notes,cv_file,cover_letter_file,source,deadline"
