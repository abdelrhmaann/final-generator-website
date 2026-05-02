import { Link, useRouterState } from "@tanstack/react-router";
import { Zap, Gauge, Fuel, ArrowLeftRight, Wind, Activity } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Overview", icon: Activity, code: "00" },
  { to: "/sizing", label: "kVA Sizing", icon: Zap, code: "01" },
  { to: "/voltage-dip", label: "Voltage Dip", icon: Gauge, code: "02" },
  { to: "/fuel", label: "Fuel Consumption", icon: Fuel, code: "03" },
  { to: "/ats", label: "ATS Sizing", icon: ArrowLeftRight, code: "04" },
  { to: "/ventilation", label: "Room Ventilation", icon: Wind, code: "05" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-64 shrink-0 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col sticky top-0 h-screen">
        <div className="px-5 py-6 border-b border-sidebar-border">
          <Link to="/" className="flex items-center gap-3 group">
            <div
              className="w-9 h-9 rounded-md grid place-items-center shrink-0"
              style={{ background: "var(--gradient-ember)", boxShadow: "var(--shadow-ember)" }}
            >
              <Zap className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <div className="font-display font-bold text-base tracking-tight">GENERATOR</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">
                Sizing Suite
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <div className="px-2 pb-2 text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
            Modules
          </div>
          {NAV.map(({ to, label, icon: Icon, code }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={[
                  "group flex items-center gap-3 px-2.5 py-2 rounded-md text-sm transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-sidebar-foreground/75 hover:bg-secondary/60 hover:text-foreground",
                ].join(" ")}
              >
                <span
                  className={[
                    "font-mono text-[10px] tabular-nums w-6",
                    active ? "text-primary" : "text-muted-foreground",
                  ].join(" ")}
                >
                  {code}
                </span>
                <Icon className="w-4 h-4 shrink-0" />
                <span className="font-medium">{label}</span>
                {active && <span className="ml-auto w-1 h-5 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-4 border-t border-sidebar-border text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground leading-relaxed">
          IEC 60034 · ISO 8528<br />IEC 60364
          <div className="mt-2 text-foreground/60 normal-case tracking-normal font-body">
            v2.0 — Engineering
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="h-14 border-b border-border flex items-center px-8 sticky top-0 bg-background/80 backdrop-blur z-10">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span>{getBreadcrumb(pathname)}</span>
          </div>
          <div className="ml-auto text-xs font-mono text-muted-foreground">
            MEP · Standby Power
          </div>
        </header>
        <div className="px-8 py-10 max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

function getBreadcrumb(path: string) {
  const item = NAV.find((n) => n.to === path);
  return item ? `${item.code} / ${item.label}` : "Generator";
}
