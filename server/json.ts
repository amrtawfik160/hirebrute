export function extractJson<T>(raw: string): T {
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fence ? fence[1] : raw
  const start = candidate.indexOf("{")
  const startArr = candidate.indexOf("[")
  let jsonText = candidate
  if (start >= 0 && (startArr < 0 || start < startArr)) {
    const end = candidate.lastIndexOf("}")
    jsonText = candidate.slice(start, end + 1)
  } else if (startArr >= 0) {
    const end = candidate.lastIndexOf("]")
    jsonText = candidate.slice(startArr, end + 1)
  }
  return JSON.parse(jsonText) as T
}

export function safeJson<T>(raw: string, fallback: T): T {
  try {
    return extractJson<T>(raw)
  } catch {
    return fallback
  }
}
