import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const TONE: Record<string, string> = {
  drafted: "bg-muted",
  applied: "bg-chart-5",
  interview: "bg-chart-3",
  offer: "bg-chart-2",
  hired: "bg-chart-2",
  rejected: "bg-chart-4",
  no_response: "bg-chart-4",
  offer_declined: "bg-muted",
  withdrawn: "bg-muted",
  new: "bg-primary",
  ranked: "bg-chart-5",
  expired: "bg-muted",
  unreachable: "bg-chart-4",
  skipped: "bg-muted",
  strong: "bg-chart-2",
  good: "bg-chart-5",
  moderate: "bg-primary",
  weak: "bg-chart-4",
  poor: "bg-chart-4",
  PASS: "bg-chart-2",
  FAIL: "bg-chart-4",
  FLAG: "bg-primary",
  UNVERIFIED: "bg-white",
  ready: "bg-chart-2",
  missing: "bg-white",
}

export function StatusBadge({ value, prefix }: { value?: string | null; prefix?: string }) {
  if (!value) return null
  const label = value.replace(/_/g, " ")
  return (
    <Badge variant="outline" className={cn("bg-white capitalize", TONE[value])}>
      {prefix ? `${prefix} ${label}` : label}
    </Badge>
  )
}
