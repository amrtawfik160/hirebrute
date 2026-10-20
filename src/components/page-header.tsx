import type { ReactNode } from "react"
import { BrandIcon, type BrandIconName } from "@/components/brand"

export function PageHeader({
  kicker,
  title,
  description,
  actions,
  mark,
}: {
  kicker?: string
  title: string
  description: string
  actions?: ReactNode
  mark?: BrandIconName | ReactNode
}) {
  const glyph = typeof mark === "string" ? <BrandIcon name={mark} className="size-10" /> : mark
  const stacked = typeof mark !== "string" && mark != null
  return (
    <header className="space-y-4 border-b-2 border-black pb-5">
      <div className={stacked ? "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between" : "flex items-start justify-between gap-3"}>
        <div className="max-w-3xl space-y-2">
          {kicker ? <p className="text-xs font-semibold tracking-[0.14em] uppercase">{kicker}</p> : null}
          <h1 className="text-3xl leading-none sm:text-4xl">{title}</h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
        </div>
        {glyph ? <div className="shrink-0">{glyph}</div> : null}
      </div>
      {actions ? <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">{actions}</div> : null}
    </header>
  )
}
