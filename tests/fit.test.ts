import { describe, expect, it } from "vitest"
import {
  bandFor,
  classifyHost,
  eligibilityGate,
  languageGate,
  locationVerdict,
  overallScore,
} from "../shared/fit.ts"
import { DEMO_PROFILE } from "../server/demo.ts"

describe("fit gates", () => {
  it("fails the language gate when a required language is undeclared", () => {
    const posting =
      "Working language: the Warsaw team. Fluent German required. Must communicate with Berlin stakeholders in German."
    const result = languageGate(posting, DEMO_PROFILE)
    expect(result.verdict).toBe("FAIL")
    expect(result.note).toMatch(/German/i)
  })

  it("passes English at native level against a fluent English bar", () => {
    const posting = "Must communicate with the team in English. Fluent English required."
    expect(languageGate(posting, DEMO_PROFILE).verdict).toBe("PASS")
  })

  it("flags when the posting bar reads higher than the declared level", () => {
    const posting = "Fluent Spanish required for customer calls."
    const result = languageGate(posting, DEMO_PROFILE)
    expect(result.verdict).toBe("FLAG")
  })

  it("fails eligibility on a citizenship requirement the profile does not meet", () => {
    const profile = {
      ...DEMO_PROFILE,
      citizenship: "none",
      workAuthorization: "student visa",
    }
    const posting = "Applicants must be a citizen of X. No exceptions."
    expect(eligibilityGate(posting, profile).verdict).toBe("FAIL")
  })

  it("fails location when relocation is required and the profile forbids it", () => {
    const posting = "Relocation required. Five days in the office in Zurich."
    expect(locationVerdict(posting, DEMO_PROFILE).verdict).toBe("FAIL")
  })

  it("classifies known ATS hosts and unverified hosts", () => {
    expect(classifyHost("https://boards.greenhouse.io/acme/jobs/1", []).kind).toBe("ats")
    expect(classifyHost("https://evil-greenhouse.io/jobs/1", []).kind).toBe("unverified")
    expect(classifyHost("https://job-boards.greenhouse.io.evil.com/x", []).kind).toBe("unverified")
    expect(classifyHost("https://remotive.com/remote-jobs/1", ["remotive.com"]).kind).toBe("portal")
  })

  it("maps overall score to the original band floors", () => {
    expect(bandFor(80)).toBe("strong")
    expect(bandFor(65)).toBe("good")
    expect(bandFor(50)).toBe("moderate")
    expect(bandFor(35)).toBe("weak")
    expect(bandFor(20)).toBe("poor")
    expect(overallScore({ technical: 100, experience: 100, behavioral: 100, career: 100 })).toBe(100)
  })
})
