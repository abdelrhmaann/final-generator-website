import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Gauge, CheckCircle2, Save } from "lucide-react";
import { calcVoltageDip, XD_BY_KVA, STANDARD_KVA_SERIES } from "@/lib/genCalc";
import { ProjectHeader } from "@/components/noir/ProjectHeader";
import { ModuleTitle } from "./sizing";
import { useProject } from "@/lib/project";
import { saveSession } from "@/lib/sessions";

export const Route = createFileRoute("/voltage-dip")({
  head: () => ({ meta: [{ title: "Voltage Dip — GenSizer Pro" }] }),
  component: Page,
});

function Page() {
  const [project] = useProject();
  const [genKva, setGenKva] = useState(500);
  const [xd, setXd] = useState(25);
  const [motorKva, setMotorKva] = useState(150);
  const [sensitivity, setSensitivity] = useState<"general" | "sensitive">("general");
  const r = useMemo(() => calcVoltageDip({ generatorKva: genKva, xdPercent: xd, motorStartingKva: motorKva }), [genKva, xd, motorKva]);

  const dip = r.voltageDipPercent;
  const angle = Math.min(dip / 30, 1) * 180;
  const overflow = dip > 30;
  const tone = dip < 10 ? "var(--success)" : dip < 15 ? "var(--warning)" : "var(--destructive)";

  return (
    <>
      <ProjectHeader />
      <ModuleTitle icon={<Gauge className="w-5 h-5" />} tone="var(--mod-dip)" title="Voltage Dip Calculator" subtitle="Motor Starting Impact — IEC 60034 / ISO 8528" />

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Inputs */}
        <div className="noir-card p-5">
          <div className="gs-section-label mb-4">Input Parameters</div>

          <Field label="Generator Rating (kVA)">
            <input className="noir-input" type="number" value={genKva} onChange={(e) => setGenKva(parseFloat(e.target.value) || 0)} />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {STANDARD_KVA_SERIES.map((k) => {
                const match = XD_BY_KVA.find((x) => x.kva === k);
                return (
                  <button key={k} className="gs-chip" data-active={k === genKva}
                    onClick={() => { setGenKva(k); if (match) setXd(match.xd); }}>
                    {k}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Select standard size to auto-fill X″d</p>
          </Field>

          <Field label="Subtransient Reactance X″d (%)" hint="Typical 16–29%">
            <input className="noir-input" type="number" step={0.1} value={xd} onChange={(e) => setXd(parseFloat(e.target.value) || 0)} />
          </Field>

          <Field label="Motor Starting kVA" hint="Largest single motor starting kVA demand">
            <input className="noir-input" type="number" value={motorKva} onChange={(e) => setMotorKva(parseFloat(e.target.value) || 0)} />
          </Field>

          <div className="noir-label mb-1.5">Load Sensitivity</div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {(["general", "sensitive"] as const).map((s) => (
              <button key={s}
                onClick={() => setSensitivity(s)}
                className={`px-3 py-2.5 rounded text-sm border transition-colors ${sensitivity === s ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>
                {s === "general" ? "General (<15%)" : "Sensitive (<10%)"}
              </button>
            ))}
          </div>

          <button className="noir-btn noir-btn-primary w-full justify-center" onClick={() => saveSession({ moduleType: "voltage-dip", projectName: project.projectName, inputs: { genKva, xd, motorKva, sensitivity }, result: r })}>
            <Save className="w-3.5 h-3.5" /> Save calculation
          </button>

          <div className="noir-card p-3 mt-4 text-xs mono">
            <div className="gs-section-label mb-2">Formula (IEC 60034)</div>
            <div>Vdip% = (Sm / (Sg / X″d + Sm)) × 100</div>
            <div className="text-muted-foreground mt-1">Sm = motor starting kVA</div>
            <div className="text-muted-foreground">Sg = generator rated kVA</div>
          </div>
        </div>

        {/* Result */}
        <div className="space-y-4">
          <div className="noir-card p-5">
            <div className="gs-section-label text-center mb-3">Voltage Dip Result</div>
            <div className="flex flex-col items-center">
              <svg viewBox="0 0 200 130" className="w-full max-w-xs">
                <defs>
                  <linearGradient id="g" x1="0" x2="1">
                    <stop offset="0%" stopColor="var(--success)" />
                    <stop offset="50%" stopColor="var(--warning)" />
                    <stop offset="100%" stopColor="var(--destructive)" />
                  </linearGradient>
                </defs>
                <path d="M20,110 A80,80 0 0 1 180,110" fill="none" stroke="var(--border)" strokeWidth="14" strokeLinecap="round" />
                <path d="M20,110 A80,80 0 0 1 180,110" fill="none" stroke="url(#g)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${(angle / 180) * 251} 251`} />
                <line x1="100" y1="110"
                  x2={100 + 70 * Math.cos(Math.PI - (angle * Math.PI) / 180)}
                  y2={110 - 70 * Math.sin(Math.PI - (angle * Math.PI) / 180)}
                  stroke="var(--foreground)" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="100" cy="110" r="5" fill="var(--primary)" />
              </svg>
              <div className="font-display text-5xl font-bold tabular-nums mt-2" style={{ color: tone }}>{dip.toFixed(1)}<span className="text-2xl">%</span></div>
              <div className="noir-label mt-1">Voltage Dip</div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-5">
              <Pill ok={r.passGeneral}>{r.passGeneral ? "PASS" : "FAIL"} — General Loads (&lt;15%)</Pill>
              <Pill ok={r.passSensitive}>{r.passSensitive ? "PASS" : "FAIL"} — Sensitive Loads (&lt;10%)</Pill>
            </div>
          </div>

          <div className={`noir-card p-4 border ${r.passGeneral ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5"}`}>
            <div className="flex items-center gap-2 mb-2 gs-section-label" style={{ color: r.passGeneral ? "var(--success)" : "var(--destructive)" }}>
              <CheckCircle2 className="w-4 h-4" /> {r.passGeneral ? "Compliant" : "Non-compliant"}
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{r.recommendation}</p>
          </div>

          <div className="noir-card p-4">
            <div className="gs-section-label mb-3">Calculation Breakdown</div>
            <Row k="Generator kVA (Sg)" v={`${genKva.toFixed(0)} kVA`} />
            <Row k="X″d (decimal)" v={(xd / 100).toFixed(4)} />
            <Row k="Sg / X″d" v={(genKva / (xd / 100)).toFixed(1)} />
            <Row k="Motor Start kVA (Sm)" v={`${motorKva.toFixed(0)} kVA`} />
            <Row k="Denominator (Sg/X″d + Sm)" v={(genKva / (xd / 100) + motorKva).toFixed(1)} />
            <Row k="Voltage Dip" v={`${dip.toFixed(2)}%`} accent />
          </div>
        </div>
      </div>

      {/* X"d table */}
      <div className="noir-card p-5 mt-6">
        <div className="gs-section-label mb-3">Standard X″d Values by Generator Size (ISO 8528)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="px-2 py-2 text-left mono uppercase text-[10px] tracking-wider text-muted-foreground">kVA</th>
                {XD_BY_KVA.map((e) => <th key={e.kva} className="px-2 py-2 mono text-muted-foreground">{e.kva}</th>)}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-2 py-2 mono uppercase text-[10px] tracking-wider text-muted-foreground">X″d (%)</td>
                {XD_BY_KVA.map((e) => (
                  <td key={e.kva} className="px-2 py-2 mono text-center" style={{ color: e.kva === genKva ? "var(--primary)" : "var(--mod-fuel)", fontWeight: e.kva === genKva ? 700 : 400 }}>{e.xd}%</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="noir-label mb-1.5">{label}</div>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
function Pill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <span className={`text-center text-xs px-2 py-2 rounded border font-semibold ${ok ? "bg-success/15 text-success border-success/40" : "bg-destructive/15 text-destructive border-destructive/40"}`}>{children}</span>;
}
function Row({ k, v, accent }: { k: string; v: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0 text-sm">
      <span className="text-muted-foreground">{k}</span>
      <span className={`mono ${accent ? "text-primary font-bold" : ""}`}>{v}</span>
    </div>
  );
}