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

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/profile", label: "Profile", icon: UserRound },
  { to: "/jobs", label: "Jobs", icon: Search },
  { to: "/rank", label: "Rank", icon: Trophy },
  { to: "/apply", label: "Apply", icon: ClipboardList },
  { to: "/applications", label: "Applications", icon: Briefcase },
  { to: "/interview", label: "Interview", icon: MessageSquare },
  { to: "/upskill", label: "Upskill", icon: Sparkles },
  { to: "/expand", label: "Expand", icon: Waypoints },
  { to: "/sync", label: "Sync", icon: Mail },
  { to: "/portals", label: "Portals", icon: FolderOpen },
  { to: "/history", label: "History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
]

function Links({ onClick }: { onClick?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            onClick={onClick}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 border-2 border-transparent px-3 py-2 font-head text-sm",
                isActive && "border-black bg-primary shadow-sm",
              )
            }
          >
            <Icon className="size-4" />
            {item.label}
          </NavLink>
        )
      })}
    </nav>
  )
}

export function AppLayout() {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-svh bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-56 border-r-2 border-black bg-sidebar p-4 lg:flex lg:flex-col">
        <p className="font-head text-xl">Job Desk</p>
        <p className="mb-6 text-xs">Local job search. Keys stay here.</p>
        <Links />
      </aside>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b-2 border-black bg-primary px-4 py-3 lg:hidden">
        <p className="font-head text-lg">Job Desk</p>
        <Button variant="secondary" size="icon" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu />
        </Button>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="bg-sidebar">
          <SheetHeader>
            <SheetTitle>Job Desk</SheetTitle>
          </SheetHeader>
          <div className="px-2 pb-6">
            <Links onClick={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
      <main className="px-4 py-6 lg:ml-56">
        <div className="mx-auto max-w-6xl space-y-6">
          <Outlet />
        </div>
      </main>
      <Toaster position="top-center" />
    </div>
  )
}
