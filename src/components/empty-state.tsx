import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="space-y-3 py-8">
        <h2 className="font-head text-lg">{title}</h2>
        <p className="max-w-xl text-sm text-muted-foreground">{body}</p>
        {action}
      </CardContent>
    </Card>
  )
}

export function ErrorState({ message }: { message: string }) {
  return (
    <Card className="bg-chart-4">
      <CardContent className="py-4">
        <p className="font-head text-sm">Something broke</p>
        <p className="text-sm">{message}</p>
      </CardContent>
    </Card>
  )
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <Card>
      <CardContent className="py-8">
        <p className="font-head">{label}…</p>
      </CardContent>
    </Card>
  )
}
