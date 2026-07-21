import { NavLink } from "react-router-dom";
import { Database, LayoutDashboard, Blocks, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Visão geral", icon: LayoutDashboard, end: true },
  { to: "/database", label: "Banco de Dados", icon: Database },
  { to: "/plugins", label: "Plugins", icon: Blocks },
  { to: "/settings", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="flex h-full w-60 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <img src="/favicon.svg" alt="" className="h-6 w-6" />
        <span className="font-semibold">OpenSpace-DB</span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                isActive && "bg-muted text-foreground",
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
