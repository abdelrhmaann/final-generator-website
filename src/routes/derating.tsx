import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Thermometer, Save, ArrowRight } from "lucide-react";
import { calcDerating } from "@/lib/genCalc";
import { ProjectHeader } from "@/components/noir/ProjectHeader";
import { ModuleTitle } from "./sizing";
import { StatCard } from "@/components/noir/StatCard";
import { useProject } from "@/lib/project";
import { saveSession } from "@/lib/sessions";

export const Route = createFileRoute("/derating")({
  head: () => ({ meta: [{ title: "Site Derating — GenSizer Pro" }] }),
  component: Page,
});

function Page() {
  const [project] = useProject();
  const [ratedKva, setRatedKva] = useState(500);
  const [altitude, setAltitude] = useState(0);
  const [tempC, setTempC] = useState(25);
  const r = useMemo(() => calcDerating({ ratedKva, altitudeM: altitude, ambientTempC: tempC }), [ratedKva, altitude, tempC]);

  return (
    <>
      <ProjectHeader />
      <ModuleTitle icon={<Thermometer className="w-5 h-5" />} tone="var(--mod-fuel)" title="Site Derating Calculator" subtitle="Altitude and temperature derating per ISO 8528-1 §12.3" />

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <div className="noir-card p-5 self-start">
          <div className="gs-section-label mb-4">Site Conditions</div>
          <div className="noir-label mb-1.5">Generator Rated kVA</div>
          <input className="noir-input mb-4" type="number" min={10} value={ratedKva} onChange={(e) => setRatedKva(parseFloat(e.target.value) || 0)} />
          <div className="noir-label mb-1.5">Site Altitude (m ASL)</div>
          <input className="noir-input mb-4" type="number" min={0} value={altitude} onChange={(e) => setAltitude(parseFloat(e.target.value) || 0)} />
          <div className="noir-label mb-1.5">Ambient Temperature (°C)</div>
          <input className="noir-input mb-4" type="number" value={tempC} onChange={(e) => setTempC(parseFloat(e.target.value) || 0)} />
          <button className="noir-btn noir-btn-primary w-full justify-center mb-3" onClick={() => saveSession({ moduleType: "derating", projectName: project.projectName, inputs: { ratedKva, altitude, tempC }, result: r })}>
            <Save className="w-3.5 h-3.5" /> Save calculation
          </button>
          <Link to="/sizing" className="noir-btn noir-btn-ghost w-full justify-center">
            Use in kVA Sizing <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <p className="text-[11px] text-muted-foreground mt-3 leading-snug">
            ISO 8528-1 §12.3 — Reference conditions: 25°C, 1000m ASL, 30% RH
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard tone="var(--mod-sizing)" label="Temperature Factor KT" value={r.temperatureFactorKt.toFixed(3)} />
            <StatCard tone="var(--mod-fuel)"   label="Altitude Factor KA"    value={r.altitudeFactorKa.toFixed(3)} />
            <StatCard tone="var(--mod-ats)"    label="Combined Factor"       value={r.combinedDeratingFactor.toFixed(3)} />
            <StatCard tone="var(--success)"    label="Derated kVA"           value={r.deratedKva.toFixed(1)} unit="kVA" />
          </div>

          <div className={`noir-card p-4 border-l-4 ${r.isStandardConditions ? "border-success bg-success/5" : r.deratingPercent < 15 ? "border-warning bg-warning/5" : "border-destructive bg-destructive/5"}`}>
            <p className="text-sm leading-relaxed">{r.recommendation}</p>
          </div>

          <div className="noir-card p-5">
            <div className="gs-section-label mb-3">Step-by-Step Breakdown</div>
            <div className="space-y-1.5 text-sm">
              <Row k="Rated kVA (at standard conditions)" v={`${r.ratedKva} kVA`} />
              <Row k="KT = 1 − (T − 25) × 0.01" v={r.temperatureFactorKt.toFixed(4)} />
              <Row k="KA = 1 − ((alt − 1000) / 100) × 0.01" v={r.altitudeFactorKa.toFixed(4)} />
              <Row k="Combined Derating = KT × KA" v={r.combinedDeratingFactor.toFixed(4)} />
              <Row k="Derated kVA" v={`${r.deratedKva.toFixed(1)} kVA`} accent />
              <Row k="Derated kW (pf 0.8)" v={`${r.deratedKw.toFixed(1)} kW`} />
              <Row k="Derating %" v={`${r.deratingPercent.toFixed(2)}%`} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Row({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground">{k}</span>
      <span className={`mono ${accent ? "text-primary font-bold" : ""}`}>{v}</span>
    </div>
  );
}
