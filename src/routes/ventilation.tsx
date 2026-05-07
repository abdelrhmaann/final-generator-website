import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Wind, CheckCircle2, Save } from "lucide-react";
import { calcRoomVentilation } from "@/lib/genCalc";
import { ProjectHeader } from "@/components/noir/ProjectHeader";
import { ModuleTitle } from "./sizing";
import { StatCard } from "@/components/noir/StatCard";
import { useProject } from "@/lib/project";
import { saveSession } from "@/lib/sessions";

export const Route = createFileRoute("/ventilation")({
  head: () => ({ meta: [{ title: "Room Ventilation — GenSizer Pro" }] }),
  component: Page,
});

function Page() {
  const [project] = useProject();
  const [kw, setKw] = useState(400);
  const [l, setL] = useState(8);
  const [w, setW] = useState(5);
  const [h, setH] = useState(3.5);
  const r = useMemo(() => calcRoomVentilation({ generatorKw: kw, roomL: l, roomW: w, roomH: h, coolingConfig: "radiator-in-room" }), [kw, l, w, h]);

  return (
    <>
      <ProjectHeader />
      <ModuleTitle icon={<Wind className="w-5 h-5" />} tone="var(--mod-vent)" title="Generator Room Ventilation Estimator" subtitle="Heat Rejection & Airflow — ISO 8528-13" />

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <div className="noir-card p-5 self-start">
          <div className="gs-section-label mb-4">Input Parameters</div>
          <div className="noir-label mb-1.5">Generator Rating (kW)</div>
          <input className="noir-input mb-4" type="number" value={kw} onChange={(e) => setKw(parseFloat(e.target.value) || 0)} />

          <div className="noir-label mb-2">Room Dimensions</div>
          <div className="grid grid-cols-3 gap-2 mb-1">
            <Lbl>Length (m)</Lbl><Lbl>Width (m)</Lbl><Lbl>Height (m)</Lbl>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <input className="noir-input" type="number" step={0.1} value={l} onChange={(e) => setL(parseFloat(e.target.value) || 0)} />
            <input className="noir-input" type="number" step={0.1} value={w} onChange={(e) => setW(parseFloat(e.target.value) || 0)} />
            <input className="noir-input" type="number" step={0.1} value={h} onChange={(e) => setH(parseFloat(e.target.value) || 0)} />
          </div>
          <div className="text-[11px] text-muted-foreground mb-4">Volume: {(l * w * h).toFixed(1)} m³</div>

          <button className="noir-btn noir-btn-primary w-full justify-center mb-4"
            style={{ background: "linear-gradient(135deg, var(--mod-vent), oklch(0.78 0.18 145))" }}
            onClick={() => saveSession({ moduleType: "ventilation", projectName: project.projectName, inputs: { kw, l, w, h }, result: r })}>
            <Save className="w-3.5 h-3.5" /> Save calculation
          </button>

          <div className="noir-card p-3 text-xs">
            <div className="gs-section-label mb-2">Calculation Basis</div>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Heat rejection = 30% of rated kW</li>
              <li>• ρ = 1.2 kg/m³, Cp = 1.005 kJ/kg·K</li>
              <li>• Max temperature rise ΔT = 10°C</li>
              <li>• Louver air velocity = 2.5 m/s</li>
              <li>• Exhaust louver 10% larger than inlet</li>
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className={`noir-card p-4 border-l-4 ${r.roomAdequate ? "" : "border-destructive"}`}
            style={{ borderLeftColor: r.roomAdequate ? "var(--success)" : "var(--destructive)" }}>
            <div className="flex items-center gap-2 gs-section-label" style={{ color: r.roomAdequate ? "var(--success)" : "var(--destructive)" }}>
              <CheckCircle2 className="w-4 h-4" /> {r.roomAdequate ? "Room Dimensions Adequate" : "Room Dimensions Insufficient"}
            </div>
            <p className="text-sm text-muted-foreground mt-1.5">{r.notes}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <StatCard tone="var(--destructive)" label="Heat Rejection" value={r.heatRejectionKw.toFixed(1)} unit="kW" />
            <StatCard tone="var(--mod-sizing)"  label="Required Airflow" value={Math.round(r.requiredAirflowM3hr)} unit="m³/hr" />
            <StatCard tone="var(--success)"     label="Room Volume" value={r.actualRoomVolumeM3.toFixed(1)} unit="m³" />
          </div>

          <div className="noir-card p-5">
            <div className="gs-section-label mb-3">Louver Specifications</div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="gs-stat" style={{ ["--tone" as any]: "var(--mod-sizing)" } as React.CSSProperties}>
                <div className="gs-stat-label">Inlet Louver</div>
                <div className="gs-stat-value mt-1">{r.inletLouverAreaM2.toFixed(3)}<span className="gs-stat-unit">m²</span></div>
                <div className="text-xs mono mt-2">{r.recommendedInletSize}</div>
                <div className="text-[10px] text-muted-foreground mt-1">Position: ≤0.5 m from floor level</div>
              </div>
              <div className="gs-stat" style={{ ["--tone" as any]: "var(--mod-fuel)" } as React.CSSProperties}>
                <div className="gs-stat-label">Exhaust Louver</div>
                <div className="gs-stat-value mt-1">{r.exhaustLouverAreaM2.toFixed(3)}<span className="gs-stat-unit">m²</span></div>
                <div className="text-xs mono mt-2">{r.recommendedExhaustSize}</div>
                <div className="text-[10px] text-muted-foreground mt-1">Position: ≥0.3 m from ceiling</div>
              </div>
            </div>
          </div>

          <div className="noir-card p-5">
            <div className="gs-section-label mb-3">Calculation Breakdown</div>
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-1 text-sm">
              <Row k="Generator kW" v={`${kw} kW`} />
              <Row k="Heat Rejection (30%)" v={`${r.heatRejectionKw.toFixed(1)} kW`} />
              <Row k="Airflow Formula" v="Q = (H × 3600) / (ρ × Cp × ΔT)" />
              <Row k="Required Airflow" v={`${Math.round(r.requiredAirflowM3hr)} m³/hr`} />
              <Row k="Inlet Louver Area" v={`${r.inletLouverAreaM2.toFixed(3)} m²`} />
              <Row k="Exhaust Louver Area" v={`${r.exhaustLouverAreaM2.toFixed(3)} m²`} />
              <Row k="Min Room Volume" v={`${r.minRoomVolumeM3.toFixed(1)} m³`} />
              <Row k="Actual Room Volume" v={`${r.actualRoomVolumeM3.toFixed(1)} m³`} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const Lbl = ({ children }: { children: React.ReactNode }) => <span className="noir-label">{children}</span>;
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/40">
      <span className="text-muted-foreground">{k}</span>
      <span className="mono">{v}</span>
    </div>
  );
}