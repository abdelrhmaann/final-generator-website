import { Link, useLocation, Outlet } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Zap, Gauge, Fuel, ArrowLeftRight, Wind, History, BookOpen, FileDown, Thermometer, Bolt, Menu, X } from "lucide-react";

const MODULES = [
  { to: "/sizing",       label: "Generator kVA Sizing", icon: Zap,            tone: "var(--mod-sizing)", tag: "Generator kVA Sizing" },
  { to: "/voltage-dip",  label: "Voltage Dip Calculator", icon: Gauge,        tone: "var(--mod-dip)",    tag: "Voltage Dip Calculator" },
  { to: "/fuel",         label: "Fuel Consumption",     icon: Fuel,           tone: "var(--mod-fuel)",   tag: "Fuel Consumption" },
  { to: "/ats",          label: "ATS / Change-Over",    icon: ArrowLeftRight, tone: "var(--mod-ats)",    tag: "ATS / Change-Over" },
  { to: "/ventilation",  label: "Room Ventilation",     icon: Wind,           tone: "var(--mod-vent)",   tag: "Room Ventilation" },
  { to: "/derating",     label: "Site Derating",        icon: Thermometer,    tone: "var(--mod-fuel)",   tag: "Site Derating" },
  { to: "/shortcircuit", label: "Short-Circuit Isc",    icon: Bolt,           tone: "var(--destructive)", tag: "Short-Circuit Isc" },
] as const;

const TOOLS = [
  { to: "/sessions",  label: "Session History",     icon: History,  tone: "var(--primary)", tag: "Session History" },
  { to: "/standards", label: "Standards Reference", icon: BookOpen, tone: "var(--primary)", tag: "Standards Reference" },
  { to: "/export",    label: "Export",              icon: FileDown, tone: "var(--primary)", tag: "Export" },
] as const;

export function Shell() {
  const { pathname } = useLocation();
  const all = [...MODULES, ...TOOLS];
  const active = all.find((n) => n.to === pathname);

  const NavItem = ({ to, label, icon: Icon, tone }: typeof MODULES[number]) => {
    const isActive = pathname === to;
    return (
      <Link
        to={to}
        className={[
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors relative",
          isActive
            ? "bg-secondary text-foreground"
            : "text-sidebar-foreground/75 hover:bg-secondary/60 hover:text-foreground",
        ].join(" ")}
        style={isActive ? ({ ["--tone" as any]: tone } as React.CSSProperties) : undefined}
      >
        {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full" style={{ background: tone }} />}
        <Icon className="w-4 h-4 shrink-0" style={isActive ? { color: tone } : undefined} />
        <span className="font-medium">{label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-64 shrink-0 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col sticky top-0 h-screen">
        <div className="px-5 py-5 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-md grid place-items-center shrink-0"
              style={{ background: "var(--gradient-ember)", boxShadow: "var(--shadow-ember)" }}
            >
              <Zap className="w-4 h-4" strokeWidth={2.5} style={{ color: "var(--primary-foreground)" }} />
            </div>
            <div className="leading-tight">
              <div className="font-display font-bold text-base tracking-tight">GenSizer Pro</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono">
                Generator Sizing Tool
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-2 overflow-y-auto">
          <div className="px-3 pt-2 pb-2 noir-label">Calculator Modules</div>
          <div className="space-y-0.5">{MODULES.map((m) => <NavItem key={m.to} {...m} />)}</div>

          <div className="px-3 pt-6 pb-2 noir-label">Tools & Reference</div>
          <div className="space-y-0.5">{TOOLS.map((m) => <NavItem key={m.to} {...m} />)}</div>
        </nav>

        <div className="px-5 py-4 border-t border-sidebar-border">
          <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground leading-relaxed">
            IEC 60034 · ISO 8528<br />IEC 60364 · SEC Standards
          </div>
          <div className="mt-2 text-[10px] text-foreground/50">v1.0 — MEP Engineering</div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="h-14 border-b border-border flex items-center px-8 sticky top-0 bg-background/85 backdrop-blur z-10">
          <div className="ml-auto flex items-center gap-3">
            {active && (
              <span className="gs-pill" style={{ ["--tone" as any]: active.tone } as React.CSSProperties}>
                <active.icon className="w-3.5 h-3.5" />
                {active.tag}
              </span>
            )}
            <div className="text-[11px] mono uppercase tracking-[0.18em] text-muted-foreground">
              IEC 60034 · ISO 8528 · IEC 60364
            </div>
          </div>
        </header>
        <div className="px-6 lg:px-10 py-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
        <StandardsFooter pathname={pathname} />
      </main>
    </div>
  );
}

const STANDARDS_BY_ROUTE: Record<string, string> = {
  "/sizing":       "ISO 8528-1 — Generator kVA Sizing via Step Load Method",
  "/voltage-dip":  "IEC 60034 §8.1 — Voltage Dip (Vdip% = Sm / (Sg/X″d + Sm) × 100)",
  "/fuel":         "ISO 8528-5 Annex B — Specific Fuel Consumption (SFC) Curve",
  "/ats":          "IEC 60947-6-1 / ISO 8528-4 — ATS Current Rating",
  "/ventilation":  "ISO 8528-13 §5.2 — Generator Room Heat Rejection & Ventilation",
  "/derating":     "ISO 8528-1 §12.3 — Site Derating (Temperature & Altitude)",
  "/shortcircuit": "IEC 60909-0 — Short-Circuit Current Calculation",
};

function StandardsFooter({ pathname }: { pathname: string }) {
  const txt = STANDARDS_BY_ROUTE[pathname];
  if (!txt) return null;
  return (
    <div className="border-t border-border px-6 lg:px-10 py-3 mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
      {txt}
    </div>
  );
}
