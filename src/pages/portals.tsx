import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { PageHeader } from "@/components/page-header"
import { api } from "@/lib/api"
import type { PortalConfig, TemplateConfig } from "../../shared/types"

export function PortalsPage() {
  const [portals, setPortals] = useState<PortalConfig[]>([])
  const [templates, setTemplates] = useState<TemplateConfig[]>([])
  const [name, setName] = useState("")
  const [endpoint, setEndpoint] = useState("")

  useEffect(() => {
    api<{ portals: PortalConfig[] }>("/api/portals").then((d) => setPortals(d.portals))
    api<{ templates: TemplateConfig[] }>("/api/templates").then((d) => setTemplates(d.templates))
  }, [])

  return (
    <>
      <PageHeader
        kicker="Sources"
        title="Portals & templates"
        description="Login-walled boards are not added. RSS and JSON feeds are fine. Markdown-PDF is the default so you can run without TeX."
      />
      <Card>
        <CardHeader>
          <CardTitle>Boards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {portals.map((p, i) => (
            <div key={p.id} className="flex items-center justify-between gap-3 border-2 border-black px-3 py-2">
              <div>
                <p className="font-head text-sm">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.kind} {p.market ? `· ${p.market}` : ""} {p.warning || ""}
                </p>
              </div>
              <Switch
                checked={p.enabled}
                onCheckedChange={async (enabled) => {
                  const next = portals.map((x, j) => (j === i ? { ...x, enabled } : x))
                  setPortals(next)
                  await api("/api/portals", { method: "PUT", body: JSON.stringify({ portals: next }) })
                }}
              />
            </div>
          ))}
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label>Feed name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>RSS or JSON URL</Label>
              <Input value={endpoint} onChange={(e) => setEndpoint(e.target.value)} />
            </div>
          </div>
          <Button
            onClick={async () => {
              const portal = await api<PortalConfig>("/api/portals", {
                method: "POST",
                body: JSON.stringify({ name, endpoint, kind: "rss" }),
              })
              setPortals((p) => [...p, portal])
              setName("")
              setEndpoint("")
              toast.success("Portal added")
            }}
          >
            Add feed
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {templates.map((t) => (
            <div key={t.id} className="border-2 border-black px-3 py-2 text-sm">
              <p className="font-head">
                {t.name} {t.active ? "(active)" : ""}
              </p>
              <p className="text-muted-foreground">
                {t.kind} · {t.engine} · {t.pageLimit} page limit
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  )
}
