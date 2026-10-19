import type { ReactNode } from "react"

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <header className="space-y-4 border-b-2 border-black pb-5">
      <div className="max-w-3xl space-y-2">
        {kicker ? <p className="text-xs font-semibold tracking-[0.14em] uppercase">{kicker}</p> : null}
        <h1 className="text-3xl leading-none sm:text-4xl">{title}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
      </div>
      {actions ? <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">{actions}</div> : null}
    </header>
  )
}
