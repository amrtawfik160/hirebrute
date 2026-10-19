import type { Profile, ProfileProject } from "../../shared/types.ts"
import { addHistory, loadStore, mutate } from "../store.ts"
import { generate } from "../providers/registry.ts"
import { safeJson } from "../json.ts"

export interface ExpandProposal {
  skills: { name: string; source: string; evidence: string; bucket: string }[]
  projects: ProfileProject[]
}

const FOLDERS = new Set(["cv", "linkedin", "diplomas", "references"])

export async function expandFromDocuments(opts?: { github?: string }): Promise<ExpandProposal> {
  const store = loadStore()
  const docs = store.documents.filter((d) => FOLDERS.has(d.folder))
  const existing = [
    ...store.profile.skills.primary,
    ...store.profile.skills.secondary,
    ...store.profile.projects.map((p) => p.name),
  ]
    .join(" ")
    .toLowerCase()
  let proposal: ExpandProposal = { skills: [], projects: [] }
  const blob = docs.map((d) => `# ${d.folder}/${d.name}\n${d.text}`).join("\n\n")
  const github = opts?.github || store.profile.github || ""
  try {
    const { text } = await generate({
      system:
        "Extract new skills and public projects. Never fabricate repos. Skip anything already in the profile. JSON {skills, projects}.",
      prompt: `PROFILE SKILLS: ${existing}\nGITHUB: ${github}\nDOCUMENTS:\n${blob || "(none)"}`,
      json: true,
    })
    proposal = safeJson<ExpandProposal>(text, proposal)
  } catch {
    proposal = heuristicExpand(store.profile, blob)
  }
  proposal.skills = (proposal.skills || []).filter((s) => !existing.includes(s.name.toLowerCase()))
  proposal.projects = (proposal.projects || []).filter((p) => !existing.includes(p.name.toLowerCase()))
  addHistory({
    kind: "expand",
    title: "Expand proposals ready",
    detail: `${proposal.skills.length} skills, ${proposal.projects.length} projects. Nothing written until you accept.`,
  })
  return proposal
}

export function acceptExpand(proposal: ExpandProposal): Profile {
  const updated = mutate((s) => {
    for (const skill of proposal.skills) {
      if (skill.bucket === "domain") s.profile.skills.domain.push(skill.name)
      else if (skill.bucket === "secondary") s.profile.skills.secondary.push(skill.name)
      else s.profile.skills.primary.push(skill.name)
    }
    s.profile.projects.push(...proposal.projects)
    return s.profile
  })
  addHistory({
    kind: "expand",
    title: "Accepted expand proposals",
    detail: `${proposal.skills.length} skills and ${proposal.projects.length} projects appended.`,
  })
  return updated
}

function heuristicExpand(profile: Profile, blob: string): ExpandProposal {
  const skills: ExpandProposal["skills"] = []
  if (/traceboard/i.test(blob) && !profile.projects.some((p) => /traceboard/i.test(p.name))) {
    skills.push({
      name: "trace visualization",
      source: "documents",
      evidence: "mentioned in uploaded notes",
      bucket: "secondary",
    })
  }
  return { skills, projects: [] }
}
