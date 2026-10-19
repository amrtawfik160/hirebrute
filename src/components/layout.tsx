import { useState } from "react"
import { NavLink, Outlet } from "react-router-dom"
import {
  Briefcase,
  ClipboardList,
  FolderOpen,
  History,
  LayoutDashboard,
  Mail,
  Menu,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
  Trophy,
  UserRound,
  Waypoints,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

const GROUPS = [
  {
    label: "Work",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/profile", label: "Profile", icon: UserRound },
    ],
  },
  {
    label: "Search",
    items: [
      { to: "/jobs", label: "Jobs", icon: Search },
      { to: "/rank", label: "Rank", icon: Trophy },
      { to: "/apply", label: "Apply", icon: ClipboardList },
    ],
  },
  {
    label: "Track",
    items: [
      { to: "/applications", label: "Applications", icon: Briefcase },
      { to: "/interview", label: "Interview", icon: MessageSquare },
      { to: "/upskill", label: "Upskill", icon: Sparkles },
      { to: "/expand", label: "Expand", icon: Waypoints },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/sync", label: "Sync", icon: Mail },
      { to: "/portals", label: "Portals", icon: FolderOpen },
      { to: "/history", label: "History", icon: History },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
]

function Links({ onClick }: { onClick?: () => void }) {
  return (
    <nav className="flex flex-col gap-4" aria-label="Primary">
      {GROUPS.map((group) => (
        <div key={group.label} className="space-y-1">
          <p className="px-3 text-[11px] font-semibold tracking-[0.16em] uppercase">{group.label}</p>
          {group.items.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={onClick}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 border-2 border-transparent px-3 py-2 text-sm font-semibold",
                    isActive ? "border-black bg-black text-primary shadow-sm" : "hover:border-black hover:bg-white",
                  )
                }
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

export function AppLayout() {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-svh bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col overflow-y-auto border-r-2 border-black bg-sidebar p-4 lg:flex">
        <p className="font-head text-2xl leading-none">Job Desk</p>
        <p className="mt-2 mb-6 text-sm leading-snug">Local search. Keys stay on this machine.</p>
        <Links />
      </aside>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b-2 border-black bg-primary px-4 py-3 lg:hidden">
        <p className="font-head text-lg leading-none">Job Desk</p>
        <Button variant="secondary" size="icon" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu />
        </Button>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[min(100%,20rem)] overflow-y-auto bg-sidebar">
          <SheetHeader>
            <SheetTitle>Job Desk</SheetTitle>
          </SheetHeader>
          <div className="px-3 pb-8">
            <Links onClick={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
      <main className="overflow-x-clip px-4 py-6 sm:px-6 lg:ml-60 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <Outlet />
        </div>
      </main>
      <Toaster position="bottom-right" />
    </div>
  )
}
