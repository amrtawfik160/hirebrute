import { PROVIDER_META } from "../../shared/constants.ts"
import type { ProviderId, ProviderSettings } from "../../shared/types.ts"

export type ResolvedProvider =
  | { id: "mock"; kind: "mock"; model: string }
  | { id: ProviderId; kind: "cli"; bin: string; extraArgs: string[]; model: string }
  | { id: ProviderId; kind: "api"; apiKey: string; model: string }

export function resolveProvider(
  id: ProviderId,
  settings?: ProviderSettings,
): ResolvedProvider {
  const meta = PROVIDER_META[id]
  const model = settings?.model || meta.defaultModel
  if (id === "mock" || meta.kind === "mock") {
    return { id: "mock", kind: "mock", model }
  }
  if (meta.kind === "cli") {
    return {
      id,
      kind: "cli",
      bin: settings?.bin || id.replace(/-cli$/, ""),
      extraArgs: settings?.extraArgs || [],
      model,
    }
  }
  return {
    id,
    kind: "api",
    apiKey: settings?.apiKey?.trim() || "",
    model,
  }
}
