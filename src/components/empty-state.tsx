import type { ReactNode } from "react"
import { EmptyRobot } from "@/components/brand"

export function EmptyState({
  title,
  body,
  action,
  art = true,
}: {
  title: string
  body: string
  action?: ReactNode
  art?: boolean
}) {
  return (
    <div className="space-y-3 border-2 border-dashed border-black bg-white px-4 py-8 shadow-sm">
      {art ? <EmptyRobot /> : null}
      <h2 className="font-head text-xl leading-tight">{title}</h2>
      <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">{body}</p>
      {action}
    </div>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div role="alert" className="space-y-1 border-2 border-black bg-chart-4 px-4 py-4 shadow-md">
      <p className="font-head text-base">Could not load this page</p>
      <p className="text-sm break-words">{message}</p>
    </div>
  )
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="border-2 border-black bg-white px-4 py-8 shadow-md" role="status">
      <p className="font-head text-lg">{label}…</p>
    </div>
  )
}
