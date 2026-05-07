import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bolt, Save } from "lucide-react";
import { calcShortCircuit } from "@/lib/genCalc";
import { ProjectHeader } from "@/components/noir/ProjectHeader";
import { ModuleTitle } from "./sizing";
import { StatCard } from "@/components/noir/StatCard";
import { useProject } from "@/lib/project";
import { saveSession } from "@/lib/sessions";

export const Route = createFileRoute("/shortcircuit")({
  head: () => ({ meta: [{ title: "Short-Circuit Isc — GenSizer Pro" }] }),
  component: Page,
});

function Page() {
  const [project] = useProject();
  const [genKva, setGenKva] = useState(500);
  const [voltage, setVoltage] = useState(415);
  const [xdSub, setXdSub] = useState(15);
  const [xdTr, setXdTr] = useState(25);
  const [xdSs, setXdSs] = useState(150);
  const r = useMemo(
    () => calcShortCircuit({ generatorKva: genKva, voltageV: voltage, xdSubtransientPct: xdSub, xdTransientPct: xdTr, xdSteadyStatePct: xdSs }),
    [genKva, voltage, xdSub, xdTr, xdSs],
  );

  return (
    <>
      <ProjectHeader />
      <ModuleTitle icon={<Bolt className="w-5 h-5" />} tone="var(--destructive)" title="Short-Circuit Current Contribution" subtitle="Generator fault current per IEC 60909-0" />

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <div className="noir-card p-5 self-start">
          <div className="gs-section-label mb-4">Inputs</div>
          <div className="noir-label mb-1.5">Generator Rating (kVA)</div>
          <input className="noir-input mb-3" type="number" min={10} value={genKva} onChange={(e) => setGenKva(parseFloat(e.target.value) || 0)} />
          <div className="noir-label mb-1.5">Line Voltage (V, L-L)</div>
          <input className="noir-input mb-3" type="number" min={100} value={voltage} onChange={(e) => setVoltage(parseFloat(e.target.value) || 0)} />
          <div className="noir-label mb-1.5">X″d Subtransient (%)</div>
          <input className="noir-input mb-3" type="number" step={0.1} min={5} max={40} value={xdSub} onChange={(e) => setXdSub(parseFloat(e.target.value) || 0)} />
          <div className="noir-label mb-1.5">X′d Transient (%)</div>
          <input className="noir-input mb-3" type="number" step={0.1} min={5} value={xdTr} onChange={(e) => setXdTr(parseFloat(e.target.value) || 0)} />
          <div className="noir-label mb-1.5">Xd Steady-State (%)</div>
          <input className="noir-input mb-3" type="number" step={0.1} min={5} value={xdSs} onChange={(e) => setXdSs(parseFloat(e.target.value) || 0)} />
          <button className="noir-btn noir-btn-primary w-full justify-center"
            onClick={() => saveSession({ moduleType: "shortcircuit", projectName: project.projectName, inputs: { genKva, voltage, xdSub, xdTr, xdSs }, result: r })}>
            <Save className="w-3.5 h-3.5" /> Save calculation
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard tone="var(--mod-fuel)"    label="Isc″ (Subtransient)" value={r.subtransientFaultCurrentKA.toFixed(2)} unit="kA" />
            <StatCard tone="var(--mod-sizing)"  label="Isc′ (Transient)"    value={r.transientFaultCurrentKA.toFixed(2)} unit="kA" />
            <StatCard tone="var(--mod-dip)"     label="Isc (Steady-state)"  value={r.steadyStateFaultCurrentKA.toFixed(2)} unit="kA" />
            <StatCard tone="var(--destructive)" label="ip Peak Asymmetric"  value={r.peakFaultCurrentKA.toFixed(2)} unit="kA" />
          </div>

          <div className="noir-card p-5 text-center">
            <div className="gs-section-label mb-2">3-Phase Fault Level</div>
            <div className="font-display text-5xl font-bold tabular-nums" style={{ color: "var(--destructive)" }}>
              {r.faultLevelKVA.toFixed(0)}<span className="text-2xl ml-1">kVA</span>
            </div>
            <div className="text-sm mono text-muted-foreground mt-1">{(r.faultLevelKVA / 1000).toFixed(2)} MVA</div>
          </div>

          <div className="noir-card p-4 border-l-4 border-destructive bg-destructive/5">
            <p className="text-sm leading-relaxed">{r.recommendation}</p>
          </div>

          <div className="noir-card p-4 text-xs text-muted-foreground leading-relaxed">
            Per IEC 60909-0 — values are 3-phase bolted fault (worst case).
            Use for upstream switchgear ICU rating and protection relay pickup settings. Voltage factor c = 1.05; κ = 1.8.
          </div>
        </div>
      </div>
    </>
  );
}
