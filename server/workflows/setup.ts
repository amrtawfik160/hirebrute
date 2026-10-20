import { emptyProfile } from "../../shared/fit.ts"
import type { DocumentFile, Profile } from "../../shared/types.ts"
import { generate } from "../providers/registry.ts"
import { safeJson } from "../json.ts"
import { addHistory, loadStore, mutate, seedDemo } from "../store.ts"

export function saveProfile(patch: Partial<Profile>): Profile {
  const updated = mutate((s) => {
    s.profile = { ...s.profile, ...patch, isDemo: false }
    if (patch.skills) s.profile.skills = { ...s.profile.skills, ...patch.skills }
    if (patch.search) s.profile.search = { ...s.profile.search, ...patch.search }
    if (patch.behavioral) s.profile.behavioral = { ...s.profile.behavioral, ...patch.behavioral }
    return s.profile
  })
  addHistory({ kind: "setup", title: "Profile updated", detail: updated.name || "Unnamed profile" })
  return updated
}

export function addDocument(doc: Omit<DocumentFile, "id" | "uploadedAt">): DocumentFile {
  const full: DocumentFile = {
    ...doc,
    id: `doc-${Date.now().toString(16)}`,
    uploadedAt: new Date().toISOString(),
  }
  mutate((s) => {
    s.documents.unshift(full)
  })
  return full
}

export async function ingestDocuments(opts?: { interviewNotes?: string }): Promise<Profile> {
  const store = loadStore()
  const blob = [
    opts?.interviewNotes || "",
    ...store.documents.map((d) => `${d.folder}/${d.name}\n${d.text}`),
  ]
    .filter(Boolean)
    .join("\n\n")
  if (!blob.trim()) return store.profile
  try {
    const { text } = await generate({
      system:
        "Extract a candidate profile as JSON matching the Profile shape. Label inferred behavior. Do not invent employers.",
      prompt: `Current profile:\n${JSON.stringify(store.profile)}\n\nSOURCES:\n${blob}`,
      json: true,
    })
    const parsed = safeJson<Partial<Profile>>(text, {})
    if (parsed.skills?.primary?.length) {
      const have = new Set(store.profile.skills.primary.map((s) => s.toLowerCase()))
      parsed.skills = {
        ...store.profile.skills,
        ...parsed.skills,
        primary: [
          ...store.profile.skills.primary,
          ...parsed.skills.primary.filter((s) => !have.has(s.toLowerCase())),
        ],
      }
    }
    return saveProfile({ ...parsed, isDemo: false })
  } catch {
    return store.profile
  }
}

export function startBlank(): Profile {
  const profile = emptyProfile()
  mutate((s) => {
    s.profile = profile
  })
  addHistory({ kind: "setup", title: "Blank profile", detail: "Cleared candidate fields. Documents untouched." })
  return profile
}

export function restoreDemo(): Profile {
  seedDemo()
  return loadStore().profile
}
