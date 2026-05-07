import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeftRight, Zap, Settings, Activity, Save } from "lucide-react";
import { calcAtsSizing, ATS_RATING_SERIES } from "@/lib/genCalc";
import { ProjectHeader } from "@/components/noir/ProjectHeader";
import { ModuleTitle } from "./sizing";
import { useProject } from "@/lib/project";
import { saveSession } from "@/lib/sessions";

export const Route = createFileRoute("/ats")({
  head: () => ({ meta: [{ title: "ATS / Change-Over — GenSizer Pro" }] }),
  component: Page,
});

function Page() {
  const [project] = useProject();
  const [genKva, setGenKva] = useState(500);
  const [loadA, setLoadA] = useState(600);
  const [phases, setPhases] = useState<1 | 3>(3);
  const [voltage, setVoltage] = useState(415);
  const [mainsA, setMainsA] = useState(0);
  const r = useMemo(
    () => calcAtsSizing({ generatorKva: genKva, loadCurrentA: loadA, voltageV: voltage, phases, mainsCurrentA: mainsA }),
    [genKva, loadA, voltage, phases, mainsA],
  );

  return (
    <>
      <ProjectHeader />
      <ModuleTitle icon={<ArrowLeftRight className="w-5 h-5" />} tone="var(--mod-ats)" title="ATS / Change-Over Sizing" subtitle="Automatic Transfer Switch — IEC 60947-6-1 §7.1.2 / ISO 8528-4" />

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <div className="noir-card p-5 self-start">
          <div className="gs-section-label mb-4">Input Parameters</div>

          <div className="noir-label mb-1.5">System Phases</div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {([1, 3] as const).map((p) => (
              <button key={p}
                onClick={() => { setPhases(p); setVoltage(p === 1 ? 230 : 415); }}
                className={`px-3 py-2 rounded text-sm border transition-colors ${phases === p ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>
                {p === 1 ? "1-Phase" : "3-Phase"}
              </button>
            ))}
          </div>

          <Field label="Generator Rating (kVA)" suffix="kVA">
            <input className="noir-input" type="number" min={10} value={genKva} onChange={(e) => setGenKva(parseFloat(e.target.value) || 0)} />
          </Field>
          <Field label="Load Current (A)" suffix="A">
            <input className="noir-input" type="number" min={0} value={loadA} onChange={(e) => setLoadA(parseFloat(e.target.value) || 0)} />
          </Field>
          <Field label="System Voltage (V)" suffix="V" hint={phases === 1 ? "230V (1-phase)" : "415V (3-phase)"}>
            <input className="noir-input" type="number" min={100} value={voltage} onChange={(e) => setVoltage(parseFloat(e.target.value) || 0)} />
          </Field>
          <Field label="Mains Supply Current (A)" suffix="A" hint="Leave 0 if unknown">
            <input className="noir-input" type="number" min={0} value={mainsA} onChange={(e) => setMainsA(parseFloat(e.target.value) || 0)} />
          </Field>

          <button className="noir-btn noir-btn-primary w-full justify-center mb-4"
            style={{ background: "linear-gradient(135deg, var(--mod-ats), oklch(0.78 0.17 295))" }}
            onClick={() => saveSession({ moduleType: "ats", projectName: project.projectName, inputs: { genKva, loadA, voltage, phases, mainsA }, result: r })}>
            <Save className="w-3.5 h-3.5" /> Size & Save ATS
          </button>

          <div className="noir-card p-3 text-xs">
            <div className="gs-section-label mb-2">Design Basis</div>
            <ul className="space-y-1 text-muted-foreground">
              <li>• 125% safety factor on design current</li>
              <li>• Open transition: standard standby</li>
              <li>• Closed transition: ≥500 kVA generators</li>
              <li>• Motorized ATS: per IEC 60947-6-1 §7.1.2</li>
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="gs-stat" style={{ ["--tone" as any]: "var(--mod-sizing)" } as React.CSSProperties}>
              <div className="gs-stat-label">Generator Full Load Current ({phases === 1 ? "1-Φ" : "3-Φ"})</div>
              <div className="gs-stat-value mt-1">{r.fullLoadCurrentA.toFixed(1)}<span className="gs-stat-unit">A</span></div>
            </div>
            <div className="gs-stat" style={{ ["--tone" as any]: "var(--mod-ats)" } as React.CSSProperties}>
              <div className="gs-stat-label">Recommended ATS Rating</div>
              <div className="gs-stat-value mt-1">{r.recommendedAtsRatingA}<span className="gs-stat-unit">A</span></div>
            </div>
          </div>

          <div className="noir-card p-5">
            <div className="gs-section-label mb-3">ATS Specification</div>
            <SpecRow icon={<Zap className="w-4 h-4" style={{ color: "var(--mod-fuel)" }} />} label="ATS Type" value={r.atsType} valueColor="var(--mod-fuel)" />
            <SpecRow icon={<Settings className="w-4 h-4" style={{ color: "var(--mod-ats)" }} />} label="Changeover Type" value={r.changeoverType} valueColor="var(--mod-ats)" />
            <SpecRow icon={<Activity className="w-4 h-4" style={{ color: "var(--success)" }} />} label="Rated Current" value={`${r.recommendedAtsRatingA} A`} valueColor="var(--success)" />
            <SpecRow icon={<Settings className="w-4 h-4 text-muted-foreground" />} label="Design Current (×1.25)" value={`${r.designCurrentA.toFixed(1)} A`} />
            <div className="text-[11px] text-muted-foreground mt-3 mono">Governed by: <span className="text-foreground">{r.governingCurrent}</span></div>
          </div>

          <div className="noir-card p-4 border-l-4" style={{ borderLeftColor: "var(--mod-sizing)" }}>
            <div className="flex items-center gap-2 gs-section-label mb-2"><Activity className="w-3.5 h-3.5" /> Engineering Notes</div>
            <p className="text-sm text-muted-foreground leading-relaxed">{r.notes}</p>
          </div>

          <div className="noir-card p-5">
            <div className="gs-section-label mb-3">Standard ATS Rating Series (A)</div>
            <div className="flex flex-wrap gap-2">
              {ATS_RATING_SERIES.map((a) => (
                <span key={a} className="gs-chip" data-active={a === r.recommendedAtsRatingA}>{a}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, suffix, hint, children }: { label: string; suffix?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-1.5">
        <span className="noir-label">{label}</span>
        {suffix && <span className="text-[10px] mono text-muted-foreground">{suffix}</span>}
      </div>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
function SpecRow({ icon, label, value, valueColor }: { icon: React.ReactNode; label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-2.5 text-sm">{icon}<span className="text-muted-foreground">{label}</span></div>
      <span className="font-display font-semibold text-sm" style={{ color: valueColor }}>{value}</span>
    </div>
  );
}
