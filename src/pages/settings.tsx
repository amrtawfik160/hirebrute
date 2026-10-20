import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { api, download } from "@/lib/api"
import type { ProviderId, ProviderStatus } from "../../shared/types"

interface ProvidersResponse {
  active: ProviderId | null
  providers: (ProviderStatus & { keyPreview?: string; model?: string })[]
}

const REASONING_OPTIONS = ["off", "low", "medium", "high"] as const

interface ModelOption {
  id: string
  label: string
}

// Build the <select> options: the available models, with the currently stored
// model kept in the list even if it is not (yet) in the fetched catalog.
function modelOptions(available: ModelOption[], current?: string): ModelOption[] {
  const list = [...available]
  if (current && !list.some((m) => m.id === current)) list.unshift({ id: current, label: current })
  return list.length ? list : [{ id: "", label: "—" }]
}

export function SettingsPage() {
  const [data, setData] = useState<ProvidersResponse | null>(null)
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [models, setModels] = useState<Record<string, string>>({})
  const [reasonings, setReasonings] = useState<Record<string, string>>({})
  // Models fetched live from each provider's own API, keyed by provider id.
  const [liveModels, setLiveModels] = useState<Record<string, ModelOption[]>>({})
  const [loadingModels, setLoadingModels] = useState<string | null>(null)
  const [confirm, setConfirm] = useState("")
  const [scope, setScope] = useState<"profile" | "documents" | "all">("all")

  async function loadModels(id: string) {
    setLoadingModels(id)
    try {
      const res = await api<{ models: ModelOption[]; source: "live" | "catalog" }>(`/api/providers/${id}/models`)
      setLiveModels((m) => ({ ...m, [id]: res.models }))
      toast.success(res.source === "live" ? `Loaded ${res.models.length} models` : "Using built-in model list (no key or offline)")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load models")
    } finally {
      setLoadingModels(null)
    }
  }

  async function refresh() {
    const next: ProvidersResponse = await api("/api/providers")
    setData(next)
    // Seed the editable fields from what the server has stored.
    setModels(Object.fromEntries(next.providers.map((p) => [p.id, p.model || ""])))
    setReasonings(Object.fromEntries(next.providers.map((p) => [p.id, p.reasoning || "off"])))
    // Auto-fetch live models where we can reach the provider without extra input:
    // configured API keys, keyless OpenRouter, and the active provider (incl. CLIs).
    for (const p of next.providers) {
      if (p.id === "mock") continue
      if (next.active === p.id || (p.kind === "api" && (p.configured || p.id === "openrouter"))) {
        void loadModels(p.id)
      }
    }
  }

  useEffect(() => {
    refresh().catch((e: Error) => toast.error(e.message))
  }, [])

  if (!data) return <LoadingState label="Detecting providers" />

  return (
    <>
      <PageHeader
        mark="settings"
        kicker="This machine"
        title="Settings"
        description="Keys are stored in data/store.json on this machine. The browser never sends them to a third party except the provider you chose."
      />
      {data.active ? null : (
        <Card className="bg-primary">
          <CardContent className="py-4 text-sm">
            No provider is selected. Scrapes hit live boards. CV paste reads labeled lines on this machine. Draft rewrites, interview packs, and upskill plans wait until you choose a CLI or an API key. Offline test mode stays off.
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>Providers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.providers.map((p) => (
            <div key={p.id} className={`space-y-3 border-2 border-black p-4 shadow-sm ${data.active === p.id ? "bg-primary" : "bg-white"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-head">{p.label}</p>
                  <p className="text-xs text-muted-foreground">{p.detail}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={p.available ? "ready" : "missing"} />
                  <Button
                    size="sm"
                    variant={data.active === p.id ? "secondary" : "outline"}
                    onClick={async () => {
                      await api("/api/providers/active", { method: "POST", body: JSON.stringify({ id: p.id }) })
                      toast.success(`${p.label} is active`)
                      await refresh()
                    }}
                  >
                    {data.active === p.id ? "Active" : "Use"}
                  </Button>
                </div>
              </div>
              {p.kind === "api" ? (
                <div className="grid gap-1">
                  <Label htmlFor={`key-${p.id}`}>API key {p.keyPreview ? `(${p.keyPreview})` : ""}</Label>
                  <Input
                    id={`key-${p.id}`}
                    type="password"
                    value={keys[p.id] || ""}
                    onChange={(e) => setKeys((k) => ({ ...k, [p.id]: e.target.value }))}
                    placeholder="Paste key"
                    aria-label={`${p.label} API key`}
                  />
                </div>
              ) : null}
              {p.id === "mock" ? null : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1">
                    <Label htmlFor={`model-${p.id}`}>Model</Label>
                    <div className="flex gap-2">
                      <select
                        id={`model-${p.id}`}
                        className="h-10 w-full border-2 border-black bg-white px-3 text-sm shadow-sm"
                        value={models[p.id] ?? ""}
                        onChange={(e) => setModels((m) => ({ ...m, [p.id]: e.target.value }))}
                        aria-label={`${p.label} model`}
                      >
                        {modelOptions(
                          liveModels[p.id] ?? (p.modelCatalog ?? []).map((m) => ({ id: m, label: m })),
                          models[p.id],
                        ).map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={loadingModels === p.id}
                        onClick={() => loadModels(p.id)}
                      >
                        {loadingModels === p.id ? "…" : "Load"}
                      </Button>
                    </div>
                  </div>
                  {p.supportsReasoning ? (
                    <div className="grid gap-1">
                      <Label htmlFor={`reason-${p.id}`}>Reasoning</Label>
                      <select
                        id={`reason-${p.id}`}
                        className="h-10 w-full border-2 border-black bg-white px-3 text-sm shadow-sm"
                        value={reasonings[p.id] ?? "off"}
                        onChange={(e) => setReasonings((r) => ({ ...r, [p.id]: e.target.value }))}
                        aria-label={`${p.label} reasoning effort`}
                      >
                        {REASONING_OPTIONS.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
          <Button
            onClick={async () => {
              // Merge keys, model, and reasoning edits into one providers patch.
              const ids = new Set([
                ...Object.keys(keys),
                ...Object.keys(models),
                ...Object.keys(reasonings),
              ])
              const providers: Record<string, Record<string, string>> = {}
              for (const id of ids) {
                const patch: Record<string, string> = {}
                if (keys[id]?.trim()) patch.apiKey = keys[id].trim()
                if (models[id] !== undefined) patch.model = models[id].trim()
                if (reasonings[id]) patch.reasoning = reasonings[id]
                if (Object.keys(patch).length) providers[id] = patch
              }
              await api("/api/settings", { method: "PUT", body: JSON.stringify({ providers }) })
              setKeys({})
              toast.success("Settings saved locally")
              await refresh()
            }}
          >
            Save provider settings
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Export</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => download("/api/export/json")}>
            JSON
          </Button>
          <Button variant="outline" onClick={() => download("/api/export/csv")}>
            CSV
          </Button>
          <Button variant="outline" onClick={() => download("/api/export/html")}>
            HTML
          </Button>
          <Button variant="outline" onClick={() => download("/api/export/zip")}>
            Zip
          </Button>
        </CardContent>
      </Card>
      <Card className="bg-chart-4">
        <CardHeader>
          <CardTitle>Reset</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">Type RESET in all caps. Anything else cancels and changes nothing.</p>
          <select className="h-10 w-full border-2 border-black bg-white px-3 text-sm shadow-sm" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} aria-label="Reset scope">
            <option value="all">All (profile, jobs, applications, documents)</option>
            <option value="profile">Profile and tracker</option>
            <option value="documents">Documents only</option>
          </select>
          <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="RESET" />
          <Button
            variant="destructive"
            onClick={async () => {
              try {
                await api("/api/reset", { method: "POST", body: JSON.stringify({ confirm, scope }) })
                toast.success("Reset complete")
                setConfirm("")
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Cancelled")
              }
            }}
          >
            Reset
          </Button>
        </CardContent>
      </Card>
    </>
  )
}
