import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ErrorState, LoadingState } from "@/components/empty-state"
import { PageHeader } from "@/components/page-header"
import { api } from "@/lib/api"
import type { Profile } from "../../shared/types"

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ingest, setIngest] = useState("")
  useEffect(() => {
    api<Profile>("/api/profile")
      .then(setProfile)
      .catch((e: Error) => setError(e.message))
  }, [])
  if (error) return <ErrorState message={error} />
  if (!profile) return <LoadingState label="Loading profile" />

  function patch<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => (p ? { ...p, [key]: value } : p))
  }

  async function save() {
    if (!profile) return
    const next = await api<Profile>("/api/profile", { method: "PUT", body: JSON.stringify(profile) })
    setProfile(next)
    toast.success("Profile saved on this machine")
  }

  return (
    <>
      <PageHeader
        mark="cv"
        kicker="Candidate"
        title="Profile"
        description="Facts here are the only facts drafts may use. A metric that lives only in chat gets stripped later."
        actions={
          <>
            <Button onClick={save}>Save profile</Button>
            <Button
              variant="outline"
              onClick={async () => {
                setProfile(await api("/api/setup/demo", { method: "POST" }))
                toast.success("Demo profile restored")
              }}
            >
              Load demo
            </Button>
          </>
        }
      />
      {profile.isDemo ? (
        <Card className="bg-primary">
          <CardContent className="py-4 text-sm">
            You are looking at Amira Cole, a sample candidate. Replace these fields before you send anything real.
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Identity</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Field label="Name" value={profile.name} onChange={(v) => patch("name", v)} />
            <Field label="Email" value={profile.email} onChange={(v) => patch("email", v)} />
            <Field label="Phone" value={profile.phone} onChange={(v) => patch("phone", v)} />
            <Field label="Location" value={profile.location} onChange={(v) => patch("location", v)} />
            <Field label="Headline" value={profile.headline} onChange={(v) => patch("headline", v)} />
            <Field label="Work authorization" value={profile.workAuthorization || ""} onChange={(v) => patch("workAuthorization", v)} />
            <Field label="Commute" value={profile.commute} onChange={(v) => patch("commute", v)} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Search</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Field
              label="Roles (comma)"
              value={profile.search.roles.join(", ")}
              onChange={(v) => setProfile({ ...profile, search: { ...profile.search, roles: split(v) } })}
            />
            <Field
              label="Keywords"
              value={profile.search.keywords.join(", ")}
              onChange={(v) => setProfile({ ...profile, search: { ...profile.search, keywords: split(v) } })}
            />
            <Field
              label="Locations"
              value={profile.search.locations.join(", ")}
              onChange={(v) => setProfile({ ...profile, search: { ...profile.search, locations: split(v) } })}
            />
            <div className="flex items-center gap-3 pt-1">
              <Switch
                id="remote-friendly"
                checked={profile.search.remote}
                onCheckedChange={(v) => setProfile({ ...profile, search: { ...profile.search, remote: v } })}
              />
              <Label htmlFor="remote-friendly">Remote-friendly search</Label>
            </div>
            <Field
              label="Primary skills"
              value={profile.skills.primary.join(", ")}
              onChange={(v) => setProfile({ ...profile, skills: { ...profile.skills, primary: split(v) } })}
            />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Experience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.experience.map((e, i) => (
            <div key={`${e.company}-${e.start}`} className="border-2 border-black p-3">
              <p className="font-head">
                {e.title} · {e.company}
              </p>
              <p className="text-xs text-muted-foreground">
                {e.start}–{e.end} · {e.location}
              </p>
              <ul className="mt-2 list-disc pl-5 text-sm">
                {e.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() =>
                  setProfile({ ...profile, experience: profile.experience.filter((_, j) => j !== i) })
                }
              >
                Remove
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Ingest from a CV or notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={ingest}
            onChange={(e) => setIngest(e.target.value)}
            aria-label="CV or notes"
            placeholder="Paste a CV, LinkedIn export, or interview notes. Facts are merged after you run ingest."
            rows={8}
          />
          <Button
            variant="secondary"
            disabled={!ingest.trim()}
            onClick={async () => {
              try {
                const next = await api<Profile>("/api/setup/ingest", {
                  method: "POST",
                  body: JSON.stringify({ text: ingest, folder: "cv", name: "pasted-cv.txt" }),
                })
                setProfile(next)
                setIngest("")
                toast.success("Sources stored. Review the merged fields before trusting them.")
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Ingest failed")
              }
            }}
          >
            Ingest text
          </Button>
        </CardContent>
      </Card>
    </>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = `profile-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
  return (
    <div className="grid gap-1">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function split(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
}
