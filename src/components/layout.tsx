import { useState } from "react"
import { NavLink, Outlet } from "react-router-dom"
import { Menu } from "lucide-react"
import { BrandIcon, type BrandIconName, Wordmark } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Toaster } from "@/components/ui/sonner"
import { cn } from "@/lib/utils"

const GROUPS: { label: string; items: { to: string; label: string; brand: BrandIconName }[] }[] = [
  {
    label: "Work",
    items: [
      { to: "/", label: "Dashboard", brand: "dashboard" },
      { to: "/profile", label: "Profile", brand: "cv" },
    ],
  },
  {
    label: "Search",
    items: [
      { to: "/jobs", label: "Jobs", brand: "search" },
      { to: "/rank", label: "Rank", brand: "ranking" },
      { to: "/apply", label: "Apply", brand: "apply" },
    ],
  },
  {
    label: "Track",
    items: [
      { to: "/applications", label: "Applications", brand: "cover-letter" },
      { to: "/interview", label: "Interview", brand: "interview" },
      { to: "/upskill", label: "Upskill", brand: "upskill" },
      { to: "/expand", label: "Expand", brand: "expand" },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/sync", label: "Sync", brand: "sync" },
      { to: "/portals", label: "Portals", brand: "portals" },
      { to: "/history", label: "History", brand: "history" },
      { to: "/settings", label: "Settings", brand: "settings" },
    ],
  },
]

function Links({ onClick }: { onClick?: () => void }) {
  return (
    <nav className="flex flex-col gap-3" aria-label="Primary">
      {GROUPS.map((group) => (
        <div key={group.label} className="space-y-0.5">
          <p className="px-3 text-[11px] font-semibold tracking-[0.16em] uppercase">{group.label}</p>
          {group.items.map((item) => {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={onClick}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 border-2 border-transparent px-2 py-1 text-sm font-semibold",
                    isActive ? "border-black bg-black text-primary shadow-sm" : "hover:border-black hover:bg-white",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="grid size-7 shrink-0 place-items-center">
                      <BrandIcon
                        name={item.brand}
                        className={cn(
                          "size-7",
                          item.brand === "history" &&
                            isActive &&
                            "[filter:drop-shadow(1px_0_0_#ffdc58)_drop-shadow(-1px_0_0_#ffdc58)_drop-shadow(0_1px_0_#ffdc58)_drop-shadow(0_-1px_0_#ffdc58)_drop-shadow(1px_1px_0_#ffdc58)_drop-shadow(-1px_-1px_0_#ffdc58)_drop-shadow(1px_-1px_0_#ffdc58)_drop-shadow(-1px_1px_0_#ffdc58)]",
                        )}
                      />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </>
                )}
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
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col overflow-y-auto border-r-2 border-black bg-sidebar p-4 lg:flex">
        <Wordmark />
        <p className="mt-3 mb-6 text-sm leading-snug">Local search. Keys stay on this machine.</p>
        <Links />
      </aside>
      <header className="sticky top-0 z-40 flex items-center justify-between border-b-2 border-black bg-primary px-4 py-3 lg:hidden">
        <Wordmark />
        <Button variant="secondary" size="icon" onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu />
        </Button>
      </header>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[min(100%,20rem)] overflow-y-auto bg-sidebar">
          <SheetHeader>
            <SheetTitle>
              <Wordmark />
            </SheetTitle>
          </SheetHeader>
          <div className="px-3 pb-8">
            <Links onClick={() => setOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
      <main className="overflow-x-clip px-4 py-6 sm:px-6 lg:ml-64 lg:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <Outlet />
        </div>
      </main>
      <Toaster position="bottom-right" />
    </div>
  )
}
