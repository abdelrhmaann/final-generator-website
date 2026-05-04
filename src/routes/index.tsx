import { createFileRoute, Link } from "@tanstack/react-router";
import { Zap, Gauge, Fuel, ArrowLeftRight, Wind, ArrowUpRight } from "lucide-react";
import { ProjectHeader } from "@/components/noir/ProjectHeader";

const MODULES = [
  { to: "/sizing",      label: "Generator kVA Sizing",   icon: Zap,            tone: "var(--mod-sizing)", blurb: "Step-load method per ISO 8528 — compute peak surge and recommended standby rating." },
  { to: "/voltage-dip", label: "Voltage Dip Calculator", icon: Gauge,          tone: "var(--mod-dip)",    blurb: 'Motor in-rush dip from X″d. Verify against 10% / 15% IEC 60034 limits.' },
  { to: "/fuel",        label: "Fuel Consumption",       icon: Fuel,           tone: "var(--mod-fuel)",   blurb: "SFC interpolation, hourly burn and 8 / 24 / 72-hour tank sizing." },
  { to: "/ats",         label: "ATS / Change-Over",      icon: ArrowLeftRight, tone: "var(--mod-ats)",    blurb: "Automatic Transfer Switch sizing per IEC 60364 / ISO 8528-4." },
  { to: "/ventilation", label: "Room Ventilation",       icon: Wind,           tone: "var(--mod-vent)",   blurb: "Heat rejection, airflow and louver geometry per ISO 8528-13." },
] as const;

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "GenSizer Pro — Generator Sizing Suite" }] }),
  component: OverviewPage,
});

function OverviewPage() {
  return (
    <>
      <ProjectHeader />
      <div className="mb-6">
        <h1 className="font-display text-3xl font-bold tracking-tight">Generator Design Calculations</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          A focused MEP toolkit for sizing diesel standby plants. All formulas comply with IEC 60034, ISO 8528, IEC 60364 and SEC standards.
        </p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {MODULES.map(({ to, label, icon: Icon, blurb, tone }) => (
          <Link key={to} to={to} className="group">
            <div
              className="noir-card p-5 hover:border-primary/60 transition-colors h-full"
              style={{ ["--tone" as any]: tone } as React.CSSProperties}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-11 h-11 rounded-md grid place-items-center shrink-0"
                  style={{ background: `color-mix(in oklab, ${tone} 18%, transparent)`, color: tone, border: `1px solid color-mix(in oklab, ${tone} 35%, transparent)` }}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-display text-lg font-semibold">{label}</div>
                    <ArrowUpRight className="w-3.5 h-3.5 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground leading-relaxed">{blurb}</div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
