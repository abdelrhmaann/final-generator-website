import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Fuel, Save } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot, ReferenceLine } from "recharts";
import { calcFuelConsumption, SFC_CURVE } from "@/lib/genCalc";
import { ProjectHeader } from "@/components/noir/ProjectHeader";
import { ModuleTitle } from "./sizing";
import { StatCard } from "@/components/noir/StatCard";
import { useProject } from "@/lib/project";
import { saveSession } from "@/lib/sessions";

export const Route = createFileRoute("/fuel")({
  head: () => ({ meta: [{ title: "Fuel Consumption — GenSizer Pro" }] }),
  component: Page,
});

function Page() {
  const [project] = useProject();
  const [kw, setKw] = useState(400);
  const [lf, setLf] = useState(60);
  const [useCustomSfc, setUseCustomSfc] = useState(false);
  const [customSfc, setCustomSfc] = useState(0.28);
  const r = useMemo(
    () => calcFuelConsumption({ generatorKw: kw, loadFactorPercent: lf, customSfcLPerKwh: useCustomSfc ? customSfc : undefined }),
    [kw, lf, useCustomSfc, customSfc],
  );

  // expanded curve for visualization
  const curve = Array.from({ length: 21 }, (_, i) => {
    const lfP = i * 5;
    const lfDec = lfP / 100;
    let sfc = SFC_CURVE[0].lPerKwh;
    for (let j = 0; j < SFC_CURVE.length - 1; j++) {
      const lo = SFC_CURVE[j], hi = SFC_CURVE[j + 1];
      if (lfDec >= lo.loadFactor && lfDec <= hi.loadFactor) {
        const t = (lfDec - lo.loadFactor) / (hi.loadFactor - lo.loadFactor);
        sfc = lo.lPerKwh + t * (hi.lPerKwh - lo.lPerKwh); break;
      }
    }
    if (lfDec >= 1) sfc = SFC_CURVE[SFC_CURVE.length - 1].lPerKwh;
    return { lf: lfP, sfc: Math.round(sfc * 1000) / 1000 };
  });

  return (
    <>
      <ProjectHeader />
      <ModuleTitle icon={<Fuel className="w-5 h-5" />} tone="var(--mod-fuel)" title="Fuel Consumption Estimator" subtitle="Diesel SFC Curve — ISO 8528 Standard" />

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* Inputs */}
        <div className="noir-card p-5 self-start">
          <div className="gs-section-label mb-4">Input Parameters</div>
          <div className="noir-label mb-1.5">Generator Output (kW)</div>
          <input className="noir-input mb-4" type="number" min={10} value={kw} onChange={(e) => setKw(parseFloat(e.target.value) || 0)} />

          <div className="noir-label mb-1.5">Load Factor (%)</div>
          <input className="noir-input mb-2" type="number" min={0} max={100} value={lf} onChange={(e) => setLf(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))} />
          <input type="range" min={0} max={100} step={1} value={lf} onChange={(e) => setLf(parseInt(e.target.value))}
            className="w-full accent-[var(--mod-fuel)]" />
          <div className="flex justify-between text-[10px] mono text-muted-foreground mb-4"><span>0%</span><span>50%</span><span>100%</span></div>

          <label className="flex items-center gap-2 text-xs cursor-pointer mb-2">
            <input type="checkbox" checked={useCustomSfc} onChange={(e) => setUseCustomSfc(e.target.checked)} />
            <span>Use manufacturer SFC from datasheet</span>
          </label>
          {useCustomSfc && (
            <>
              <input className="noir-input mb-1" type="number" step={0.01} min={0.20} max={0.60} value={customSfc} onChange={(e) => setCustomSfc(parseFloat(e.target.value) || 0)} />
              <p className="text-[11px] text-muted-foreground mb-3">From manufacturer Performance Data Sheet at your load factor (range 0.20–0.60 L/kWh).</p>
              {r.sfcWarning && <p className="text-[11px] text-warning mb-3">{r.sfcWarning}</p>}
            </>
          )}

          <button className="noir-btn noir-btn-primary w-full justify-center mb-4"
            style={{ background: "linear-gradient(135deg, var(--mod-fuel), oklch(0.78 0.18 65))" }}
            onClick={() => saveSession({ moduleType: "fuel", projectName: project.projectName, inputs: { kw, lf }, result: r })}>
            <Save className="w-3.5 h-3.5" /> Save calculation
          </button>

          <div className="noir-card p-3">
            <div className="gs-section-label mb-2">Standard SFC Values (Diesel)</div>
            {SFC_CURVE.map((p) => (
              <div key={p.loadFactor} className="flex justify-between py-1 text-xs">
                <span className="text-muted-foreground">{(p.loadFactor * 100).toFixed(0)}% Load</span>
                <span className="mono" style={{ color: "var(--mod-fuel)" }}>{p.lPerKwh} L/kWh</span>
              </div>
            ))}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard tone="var(--mod-sizing)" label="SFC" value={r.sfcLPerKwh.toFixed(3)} unit="L/kWh" />
            <StatCard tone="var(--mod-fuel)"   label="Consumption" value={r.consumptionLPerHr.toFixed(1)} unit="L/hr" />
            <StatCard tone="var(--success)"     label="Load Factor" value={`${lf}%`} />
          </div>

          <div className="noir-card p-5">
            <div className="gs-section-label mb-3">Fuel Tank Sizing — Autonomy Requirements</div>
            <div className="grid md:grid-cols-3 gap-4">
              {r.tankDimensions.map((t, i) => {
                const tones = ["var(--success)", "var(--mod-sizing)", "var(--mod-fuel)"];
                return (
                  <div key={t.hours} className="gs-stat" style={{ ["--tone" as any]: tones[i] } as React.CSSProperties}>
                    <div className="gs-stat-label">{t.hours}-Hour Autonomy</div>
                    <div className="gs-stat-value mt-1">{Math.round(t.liters)}<span className="gs-stat-unit">L</span></div>
                    <div className="text-[11px] text-muted-foreground mt-2">⛟ Suggested tank dimensions:</div>
                    <div className="mono text-xs mt-0.5">{t.suggestedL}m × {t.suggestedW}m × {t.suggestedH}m</div>
                    <div className="text-[10px] text-muted-foreground">(L × W × H, rectangular)</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="noir-card p-5">
            <div className="gs-section-label mb-3">Diesel SFC Curve (Specific Fuel Consumption)</div>
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={curve} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="lf" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} unit="%" label={{ value: "Load Factor (%)", position: "insideBottom", offset: -10, fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} domain={[0.25, 0.45]} label={{ value: "L/kWh", angle: -90, position: "insideLeft", fill: "var(--muted-foreground)", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                  <ReferenceLine x={lf} stroke="var(--primary)" strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="sfc" stroke="var(--mod-fuel)" strokeWidth={2.5} dot={false} />
                  <ReferenceDot x={lf} y={r.sfcLPerKwh} r={6} fill="var(--primary)" stroke="var(--background)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}