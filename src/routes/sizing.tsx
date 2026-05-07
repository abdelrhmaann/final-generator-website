import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend,
} from "recharts";
import { Plus, Trash2, ChevronUp, ChevronDown, Zap, AlertTriangle, Save } from "lucide-react";
import {
  calcGenSizing, MOTOR_START_MULTIPLIERS, LOAD_TYPE_LABELS,
  STANDARD_KVA_SERIES, type LoadStep,
} from "@/lib/genCalc";
import { ProjectHeader } from "@/components/noir/ProjectHeader";
import { StatCard } from "@/components/noir/StatCard";
import { useProject } from "@/lib/project";
import { saveSession } from "@/lib/sessions";

export const Route = createFileRoute("/sizing")({
  head: () => ({ meta: [{ title: "Generator kVA Sizing — GenSizer Pro" }] }),
  component: SizingPage,
});

let nid = 0;
const newId = () => `s${++nid}-${Date.now().toString(36).slice(-4)}`;
const defaultStep = (): LoadStep => ({ id: newId(), name: "", kw: 0, kva: 0, pf: 0.85, loadType: "inductive", startingKvaMultiplier: 1 });

type RatingType = "ESP" | "PRP" | "COP";
const RATING_INFO: Record<RatingType, { label: string; warn: number; crit: number; desc: string }> = {
  ESP: { label: "ESP — Standby", warn: 80, crit: 90,
    desc: "Emergency Standby — max 80% average load, ≤200 hrs/year. No sustained overload. (ISO 8528-1 §12.1)" },
  PRP: { label: "PRP — Prime", warn: 70, crit: 80,
    desc: "Prime Rated Power — continuous duty, 70% avg load. 10% overload for 1 hr/12 hrs available. (ISO 8528-1 §12.2)" },
  COP: { label: "COP — Continuous", warn: 60, crit: 75,
    desc: "Continuous Operating Power — 100% load, 8760 hrs/year. No overload permitted. (ISO 8528-1 §12.3)" },
};

function SizingPage() {
  const [project] = useProject();
  const [ratingType, setRatingType] = useState<RatingType>("ESP");
  const [steps, setSteps] = useState<LoadStep[]>([
    { ...defaultStep(), name: "Step 1", kw: 710, kva: 835.3, pf: 0.85, loadType: "motor-dol", startingKvaMultiplier: 1 },
    { ...defaultStep(), name: "Step 2", kw: 50,  kva: 58.8,  pf: 0.85, loadType: "motor-dol", startingKvaMultiplier: 6 },
    { ...defaultStep(), name: "Step 3", kw: 46,  kva: 54.1,  pf: 0.85, loadType: "motor-dol", startingKvaMultiplier: 2 },
    { ...defaultStep(), name: "Step 4", kw: 25,  kva: 29.4,  pf: 0.85, loadType: "motor-dol", startingKvaMultiplier: 1.5 },
    { ...defaultStep(), name: "Step 5", kw: 10,  kva: 11.8,  pf: 0.85, loadType: "resistive", startingKvaMultiplier: 1 },
  ]);
  const result = useMemo(() => calcGenSizing(steps), [steps]);
  const ratingInfo = RATING_INFO[ratingType];

  const update = (id: string, key: keyof LoadStep, value: string | number) => {
    setSteps((prev) => prev.map((s) => {
      if (s.id !== id) return s;
      const u = { ...s, [key]: value } as LoadStep;
      if (key === "loadType") u.startingKvaMultiplier = MOTOR_START_MULTIPLIERS[value as string] ?? 1;
      if (key === "kw" || key === "pf") {
        const kw = key === "kw" ? Number(value) : s.kw;
        const pf = key === "pf" ? Number(value) : s.pf;
        if (pf > 0) u.kva = Math.round((kw / pf) * 10) / 10;
      }
      return u;
    }));
  };
  const move = (i: number, dir: -1 | 1) => setSteps((prev) => {
    const j = i + dir; if (j < 0 || j >= prev.length) return prev;
    const next = [...prev]; [next[i], next[j]] = [next[j], next[i]]; return next;
  });

  const chartData = result.steps.map((s) => ({
    name: s.name || `Step ${s.stepIndex}`,
    Running: Math.round(s.cumulativeRunningKva - s.stepKva + s.stepKva),
    Surge: Math.round(Math.max(0, s.startingKva - s.stepKva)),
  }));

  const tone = result.loadingPercent > ratingInfo.crit ? "var(--destructive)"
    : result.loadingPercent > ratingInfo.warn ? "var(--warning)" : "var(--success)";

  return (
    <>
      <ProjectHeader />

      <ModuleTitle
        icon={<Zap className="w-5 h-5" />}
        tone="var(--mod-sizing)"
        title="Generator kVA Sizing"
        subtitle="Step Load Method — IEC 60034 / ISO 8528"
      />

      {/* Rating Type Selector */}
      <div className="noir-card p-5 mb-6">
        <div className="gs-section-label mb-3">ISO 8528-1 Rating Type</div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {(Object.keys(RATING_INFO) as RatingType[]).map((rt) => (
            <button key={rt}
              onClick={() => setRatingType(rt)}
              className={`px-3 py-2.5 rounded text-sm border transition-colors ${ratingType === rt ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}>
              {RATING_INFO[rt].label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{ratingInfo.desc}</p>
      </div>

      {/* Inputs */}
      <div className="noir-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="gs-section-label">Load Steps</span>
          <div className="flex gap-2">
            <button className="noir-btn noir-btn-ghost" onClick={() => setSteps((p) => [...p, { ...defaultStep(), name: `Step ${p.length + 1}` }])}>
              <Plus className="w-3.5 h-3.5" /> Add Step
            </button>
            <button className="noir-btn noir-btn-primary" onClick={() => saveSession({ moduleType: "gen-sizing", projectName: project.projectName, inputs: steps, result })}>
              <Save className="w-3.5 h-3.5" /> Save
            </button>
          </div>
        </div>

        <div className="grid gap-2 text-[11px] mono uppercase tracking-wider text-muted-foreground border-b border-border pb-2 mb-2"
          style={{ gridTemplateColumns: "32px 1fr 88px 88px 80px 160px 110px 80px" }}>
          <span>#</span><span>Step Name</span><span className="text-right">kW</span><span className="text-right">kVA</span><span className="text-right">PF</span><span>Load Type</span><span className="text-right">Start ×</span><span></span>
        </div>
        <div className="space-y-1.5">
          {steps.map((s, i) => (
            <div key={s.id} className="grid gap-2 items-center" style={{ gridTemplateColumns: "32px 1fr 88px 88px 80px 160px 110px 80px" }}>
              <span className="mono text-xs text-muted-foreground text-center">{String(i + 1).padStart(2, "0")}</span>
              <input className="noir-input" value={s.name} placeholder={`Step ${i + 1}`} onChange={(e) => update(s.id, "name", e.target.value)} />
              <input className="noir-input text-right" type="number" value={s.kw || ""} onChange={(e) => update(s.id, "kw", parseFloat(e.target.value) || 0)} />
              <input className="noir-input text-right" type="number" value={s.kva || ""} onChange={(e) => update(s.id, "kva", parseFloat(e.target.value) || 0)} />
              <input className="noir-input text-right" type="number" step={0.01} value={s.pf} onChange={(e) => update(s.id, "pf", parseFloat(e.target.value) || 0)} />
              <select className="noir-input" value={s.loadType} onChange={(e) => update(s.id, "loadType", e.target.value)}>
                {Object.entries(LOAD_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <input className="noir-input text-right" type="number" step={0.1} value={s.startingKvaMultiplier} onChange={(e) => update(s.id, "startingKvaMultiplier", parseFloat(e.target.value) || 1)} />
              <div className="flex gap-0.5 justify-end">
                <button className="p-1.5 rounded hover:bg-secondary" onClick={() => move(i, -1)} disabled={i === 0}><ChevronUp className="w-3.5 h-3.5" /></button>
                <button className="p-1.5 rounded hover:bg-secondary" onClick={() => move(i, 1)} disabled={i === steps.length - 1}><ChevronDown className="w-3.5 h-3.5" /></button>
                <button className="p-1.5 rounded hover:bg-secondary text-destructive" onClick={() => steps.length > 1 && setSteps((p) => p.filter((x) => x.id !== s.id))}><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard tone="var(--mod-sizing)" label="Required Generator kVA" value={result.requiredGenKva.toFixed(1)} unit="kVA" sub="Governing demand" />
        <StatCard tone="var(--success)"     label="Recommended Standard Size" value={result.recommendedGenKva} unit="kVA" sub="Next standard rating" />
        <StatCard tone="var(--mod-sizing)" label="Total Running kW" value={result.totalRunningKw.toFixed(1)} unit="kW" sub="Steady-state load" />
        <StatCard tone="var(--mod-fuel)"   label="Max Starting kVA" value={result.maxPeakKva.toFixed(1)} unit="kVA" sub="Peak transient demand" />
      </div>

      {/* Loading bar */}
      <div className="noir-card p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="gs-section-label">Generator Loading</span>
          <span className="font-display text-xl font-bold tabular-nums" style={{ color: tone }}>{result.loadingPercent.toFixed(1)}%</span>
        </div>
        <div className="h-3.5 rounded bg-secondary overflow-hidden">
          <div className="h-full transition-all relative" style={{ width: `${Math.min(result.loadingPercent, 100)}%`, background: tone }}>
            {result.loadingPercent > 12 && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-background">{result.loadingPercent.toFixed(0)}%</span>}
          </div>
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] mono text-muted-foreground">
          <span>0%</span>
          <span className="text-warning">75% (Recommended max)</span>
          <span className="text-destructive">100%</span>
        </div>
        {result.loadingPercent > 90 && (
          <div className="mt-3 flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle className="w-4 h-4" /> Generator loading exceeds 90%. Consider upsizing.
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="noir-card p-5 mb-6">
        <div className="mb-3">
          <span className="gs-section-label">Step Load Timeline — kVA Demand Profile</span>
          <p className="text-xs text-muted-foreground mt-1">Running kVA (steady-state) + Starting Surge (transient) per step.</p>
        </div>
        <div className="h-72">
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} label={{ value: "Load Steps", position: "insideBottom", offset: -10, fill: "var(--muted-foreground)", fontSize: 11 }} />
              <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} label={{ value: "kVA", angle: -90, position: "insideLeft", fill: "var(--muted-foreground)", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Running" stackId="a" fill="var(--mod-sizing)" name="Running kVA" />
              <Bar dataKey="Surge"   stackId="a" fill="var(--mod-fuel)"   name="Starting Surge" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-right text-muted-foreground border-b border-border">
                {["Step", "Name", "Step kW", "Step kVA", "Start kVA", "Cum. kW", "Cum. kVA", "Peak kVA"].map(h => (
                  <th key={h} className="px-2 py-2 mono uppercase text-[10px] tracking-wider font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.steps.map((s, i) => {
                const isPeak = s.peakKvaAtThisStep >= result.maxPeakKva;
                return (
                  <tr key={i} className={i % 2 ? "bg-secondary/30" : ""}>
                    <td className="px-2 py-1.5 text-right mono">{s.stepIndex}</td>
                    <td className="px-2 py-1.5 text-right">{s.name || `Step ${i + 1}`}</td>
                    <td className="px-2 py-1.5 text-right mono">{s.stepKw.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-right mono">{s.stepKva.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-right mono" style={{ color: "var(--mod-fuel)" }}>{s.startingKva.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-right mono">{s.cumulativeKw.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-right mono">{s.cumulativeRunningKva.toFixed(1)}</td>
                    <td className="px-2 py-1.5 text-right mono font-bold" style={{ color: isPeak ? "var(--destructive)" : undefined }}>
                      {s.peakKvaAtThisStep.toFixed(1)}{isPeak && " ★"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Standard kVA series */}
      <div className="noir-card p-5">
        <div className="gs-section-label mb-3">Standard Generator kVA Series (ISO 8528)</div>
        <div className="flex flex-wrap gap-2">
          {STANDARD_KVA_SERIES.map((k) => (
            <span key={k} className="gs-chip" data-active={k === result.recommendedGenKva}>{k}</span>
          ))}
        </div>
      </div>
    </>
  );
}

export function ModuleTitle({ icon, tone, title, subtitle }: { icon: React.ReactNode; tone: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div
        className="w-11 h-11 rounded-md grid place-items-center"
        style={{ background: `color-mix(in oklab, ${tone} 18%, transparent)`, color: tone, border: `1px solid color-mix(in oklab, ${tone} 35%, transparent)` }}
      >
        {icon}
      </div>
      <div>
        <h1 className="font-display text-xl font-bold tracking-tight">{title}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}