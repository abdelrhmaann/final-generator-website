import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { ProjectHeader } from "@/components/noir/ProjectHeader";
import { ModuleTitle } from "./sizing";
import { STANDARD_KVA_SERIES, XD_BY_KVA, SFC_CURVE } from "@/lib/genCalc";

export const Route = createFileRoute("/standards")({
  head: () => ({ meta: [{ title: "Standards Reference — GenSizer Pro" }] }),
  component: Page,
});

const STANDARDS = [
  { code: "IEC 60034", title: "Rotating Electrical Machines", scope: "Performance requirements for rotating machines including generators. Defines voltage dip limits and X″d.",
    points: ["Voltage dip <15% for general loads", "Voltage dip <10% for sensitive loads (UPS, medical, IT)", "Defines X″d (subtransient reactance)", "Motor starting current and PF requirements", "Temperature rise classification (Class B, F, H)"] },
  { code: "ISO 8528", title: "Reciprocating Internal Combustion Engine Driven Alternating Current Generating Sets", scope: "Multi-part standard for generator set design, testing and performance.",
    points: ["Part 1: Application, ratings, performance", "Part 4: Controlgear and switchgear (ATS)", "Part 5: Performance requirements & test methods", "Part 13: Safety requirements", "Standard kVA ratings & SFC curves"] },
  { code: "IEC 60364", title: "Low-Voltage Electrical Installations", scope: "Design, installation and protection of LV electrical systems. Relevant for ATS and standby.",
    points: ["Part 5-55: Standby power sources", "ATS selection and installation", "Protection against overcurrent and faults", "Cable sizing for generator circuits", "Earthing & bonding for standby systems"] },
  { code: "SEC Standards", title: "Saudi Electricity Company — Standby Power Requirements", scope: "SEC requirements for standby and emergency power in buildings.",
    points: ["Mandatory standby for critical loads", "Generator sizing ≥ 100% of critical kVA", "Min 8-hour fuel autonomy at full load", "ATS transfer ≤ 10s for life safety", "Noise & emission requirements"] },
];

function Page() {
  const [open, setOpen] = useState<string | null>("IEC 60034");
  return (
    <>
      <ProjectHeader />
      <ModuleTitle icon={<BookOpen className="w-5 h-5" />} tone="var(--primary)" title="Standards Reference" subtitle="IEC 60034 · ISO 8528 · IEC 60364 · SEC Requirements" />

      <div className="space-y-2 mb-6">
        {STANDARDS.map((s) => {
          const isOpen = open === s.code;
          return (
            <div key={s.code} className={`noir-card overflow-hidden ${isOpen ? "border-primary/40" : ""}`}>
              <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => setOpen(isOpen ? null : s.code)}>
                <span className="px-2 py-1 rounded text-[10px] mono font-bold tracking-wider bg-secondary text-primary border border-primary/30">{s.code}</span>
                <span className="text-sm font-medium flex-1">{s.title}</span>
                {isOpen ? <ChevronDown className="w-4 h-4 text-primary" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              </button>
              {isOpen && (
                <div className="px-4 pb-4 border-t border-border">
                  <p className="text-sm text-muted-foreground my-3 leading-relaxed">{s.scope}</p>
                  <div className="noir-label mb-2">Key Requirements</div>
                  <ul className="text-sm text-foreground/85 space-y-1 list-disc pl-5">
                    {s.points.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="noir-card p-5">
          <div className="gs-section-label mb-3">Standard Generator kVA Series (ISO 8528)</div>
          <div className="flex flex-wrap gap-1.5">{STANDARD_KVA_SERIES.map((k) => <span key={k} className="gs-chip">{k}</span>)}</div>
          <p className="text-[11px] text-muted-foreground mt-3">Range: 20 kVA to 2250 kVA.</p>
        </div>
        <div className="noir-card p-5">
          <div className="gs-section-label mb-3">Diesel SFC Reference Values</div>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-muted-foreground border-b border-border text-[10px] mono uppercase tracking-wider"><th className="py-2">Load Factor</th><th>SFC (L/kWh)</th><th>Description</th></tr></thead>
            <tbody>
              {SFC_CURVE.map((p, i) => (
                <tr key={p.loadFactor} className="border-b border-border/40">
                  <td className="py-2 mono">{(p.loadFactor * 100).toFixed(0)}%</td>
                  <td className="mono" style={{ color: "var(--mod-fuel)" }}>{p.lPerKwh}</td>
                  <td className="text-muted-foreground">{["Light load", "Half load", "Recommended operating", "Full load (rated)"][i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="noir-card p-5">
        <div className="gs-section-label mb-3">Standard Subtransient Reactance X″d by Generator Size</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border"><th className="py-2 px-2 text-left mono uppercase text-[10px] tracking-wider text-muted-foreground">kVA</th>{XD_BY_KVA.map((e) => <th key={e.kva} className="py-2 px-2 mono text-muted-foreground">{e.kva}</th>)}</tr></thead>
            <tbody><tr><td className="py-2 px-2 mono uppercase text-[10px] tracking-wider text-muted-foreground">X″d (%)</td>{XD_BY_KVA.map((e) => <td key={e.kva} className="py-2 px-2 mono text-center" style={{ color: "var(--mod-fuel)" }}>{e.xd}%</td>)}</tr></tbody>
          </table>
        </div>
      </div>
    </>
  );
}