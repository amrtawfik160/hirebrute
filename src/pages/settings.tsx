import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageHeader } from "@/components/page-header"
import { StatusBadge } from "@/components/status-badge"
import { api, download } from "@/lib/api"
import type { ProviderId, ProviderStatus } from "../../shared/types"

interface ProvidersResponse {
  active: ProviderId
  providers: (ProviderStatus & { keyPreview?: string; model?: string })[]
}

export function SettingsPage() {
  const [data, setData] = useState<ProvidersResponse | null>(null)
  const [keys, setKeys] = useState<Record<string, string>>({})
  const [confirm, setConfirm] = useState("")
  const [scope, setScope] = useState<"profile" | "documents" | "all">("all")

  async function refresh() {
    setData(await api("/api/providers"))
  }

  useEffect(() => {
    refresh().catch((e: Error) => toast.error(e.message))
  }, [])

  if (!data) return <p className="font-head">Detecting providers…</p>

  return (
    <>
      <PageHeader
        kicker="settings"
        title="Settings"
        description="Keys are stored in data/store.json on this machine. The browser never sends them to a third party except the provider you chose."
      />
      <Card>
        <CardHeader>
          <CardTitle>Providers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.providers.map((p) => (
            <div key={p.id} className="space-y-2 border-2 border-black p-3">
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
                  <Label>API key {p.keyPreview ? `(${p.keyPreview})` : ""}</Label>
                  <Input
                    type="password"
                    value={keys[p.id] || ""}
                    onChange={(e) => setKeys((k) => ({ ...k, [p.id]: e.target.value }))}
                    placeholder="Paste key"
                  />
                </div>
              ) : null}
            </div>
          ))}
          <Button
            onClick={async () => {
              const providers = Object.fromEntries(
                Object.entries(keys)
                  .filter(([, v]) => v.trim())
                  .map(([id, apiKey]) => [id, { apiKey }]),
              )
              await api("/api/settings", { method: "PUT", body: JSON.stringify({ providers }) })
              setKeys({})
              toast.success("Keys saved locally")
              await refresh()
            }}
          >
            Save keys
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
          <select className="h-9 border-2 bg-input px-2" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
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
