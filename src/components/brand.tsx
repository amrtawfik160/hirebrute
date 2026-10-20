import { cn } from "@/lib/utils"

export type BrandIconName =
  | "dashboard"
  | "search"
  | "ranking"
  | "cv"
  | "cover-letter"
  | "interview"
  | "upskill"
  | "settings"
  | "apply"
  | "expand"
  | "sync"
  | "portals"
  | "history"

export function Wordmark({ className }: { className?: string }) {
  return (
    <img
      src="/brand/logo.webp"
      alt="Hirebrute"
      width={900}
      height={258}
      className={cn("h-11 w-auto max-w-[13.5rem] object-contain object-left", className)}
    />
  )
}

export function BrandIcon({ name, className }: { name: BrandIconName; className?: string }) {
  return (
    <img
      src={`/brand/icons/${name}.webp`}
      alt=""
      width={160}
      height={160}
      className={cn("size-7 shrink-0 object-contain", className)}
    />
  )
}

export function EmptyRobot({ className }: { className?: string }) {
  return (
    <img
      src="/brand/empty-state-robot.webp"
      alt=""
      width={720}
      height={504}
      className={cn("h-36 w-auto max-w-full object-contain", className)}
    />
  )
}
