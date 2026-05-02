import { Link } from "wouter";
import { Zap, Gauge, Fuel, ArrowLeftRight, Wind, ArrowUpRight } from "lucide-react";
import { PageHeader, Card } from "@/components/noir/primitives";

const MODULES = [
  { to: "/sizing", code: "01", label: "kVA Sizing", icon: Zap, blurb: "Step-load method · ISO 8528. Compute peak surge and recommended standby rating." },
  { to: "/voltage-dip", code: "02", label: "Voltage Dip", icon: Gauge, blurb: 'Motor in-rush dip from X″d. Verify against 10% / 15% IEC limits.' },
  { to: "/fuel", code: "03", label: "Fuel Consumption", icon: Fuel, blurb: "SFC interpolation, hourly burn and 8/24/72 h tank sizing." },
  { to: "/ats", code: "04", label: "ATS Sizing", icon: ArrowLeftRight, blurb: "Change-over rating with 1.25× safety factor, transition type & mode." },
  { to: "/ventilation", code: "05", label: "Room Ventilation", icon: Wind, blurb: "Heat rejection, airflow and louver geometry per ISO 8528-13." },
];

export default function OverviewPage() {
  return (
    <>
      <PageHeader
        eyebrow="00 / Engineering Suite"
        title={"Generator\nDesign Calculations" as unknown as string}
        description="A focused toolkit for sizing diesel standby plants. All formulas comply with IEC 60034, ISO 8528 and IEC 60364."
      />

      <div className="grid md:grid-cols-2 gap-4">
        {MODULES.map(({ to, code, label, icon: Icon, blurb }) => (
          <Link key={to} href={to}>
            <Card className="group hover:border-primary/60 transition-colors cursor-pointer h-full">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-md grid place-items-center shrink-0 bg-secondary group-hover:bg-primary/15 transition-colors">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="mono text-[10px] text-primary tracking-[0.18em]">{code}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 ml-auto text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="font-display text-lg font-semibold">{label}</div>
                  <div className="mt-1 text-sm text-muted-foreground leading-relaxed">{blurb}</div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-12 grid md:grid-cols-3 gap-4">
        {[
          ["IEC 60034", "Rotating electrical machines"],
          ["ISO 8528", "Reciprocating IC engine driven sets"],
          ["IEC 60364", "Low-voltage installations"],
        ].map(([code, desc]) => (
          <Card key={code} className="p-4">
            <div className="mono text-xs text-primary tracking-widest">{code}</div>
            <div className="mt-1 text-sm text-muted-foreground">{desc}</div>
          </Card>
        ))}
      </div>
    </>
  );
}
