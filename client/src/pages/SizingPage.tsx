import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";
import {
  calcGenSizing, MOTOR_START_MULTIPLIERS, LOAD_TYPE_LABELS,
  STANDARD_KVA_SERIES, type LoadStep,
} from "../../../shared/genCalc";
import { PageHeader, Section, Card, Stat, Field, NumberInput, Select, TextInput } from "@/components/noir/primitives";
import { Plus, Trash2, ChevronUp, ChevronDown, AlertTriangle } from "lucide-react";

const LOAD_TYPE_OPTIONS = Object.entries(LOAD_TYPE_LABELS).map(([value, label]) => ({ value, label }));

let nid = 0;
const newId = () => `s${++nid}-${Date.now().toString(36).slice(-4)}`;

function defaultStep(): LoadStep {
  return { id: newId(), name: "", kw: 0, kva: 0, pf: 0.85,
    loadType: "inductive", startingKvaMultiplier: 1.0 };
}

export default function SizingPage() {
  const [steps, setSteps] = useState<LoadStep[]>([
    { ...defaultStep(), name: "Lighting & receptacles", kw: 30, kva: 35.3, pf: 0.85, loadType: "resistive", startingKvaMultiplier: 1 },
    { ...defaultStep(), name: "Chiller motor", kw: 75, kva: 88.2, pf: 0.85, loadType: "motor-dol", startingKvaMultiplier: 6 },
  ]);

  const result = useMemo(() => calcGenSizing(steps), [steps]);

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

  const move = (i: number, dir: -1 | 1) => {
    setSteps((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const chartData = result.steps.map((s) => ({
    name: `${s.stepIndex}. ${s.name || "Step"}`,
    running: Math.round(s.cumulativeRunningKva),
    peak: Math.round(s.peakKvaAtThisStep),
  }));

  const loadingTone =
    result.loadingPercent > 80 ? "text-destructive"
    : result.loadingPercent > 70 ? "text-warning"
    : "text-success";

  return (
    <>
      <PageHeader
        eyebrow="01 / Module"
        title="Generator kVA Sizing"
        description="Step-load method per ISO 8528. Add loads in start-up sequence to compute the governing peak kVA and recommended standby rating."
      />

      <Section title="Load Steps">
        <div className="space-y-3">
          {steps.map((s, i) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="mono text-[11px] text-primary w-6">{String(i + 1).padStart(2, "0")}</span>
                <TextInput
                  value={s.name}
                  onChange={(v) => update(s.id, "name", v)}
                  placeholder="Load description"
                />
                <button className="noir-btn noir-btn-ghost p-2" onClick={() => move(i, -1)} disabled={i === 0}>
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button className="noir-btn noir-btn-ghost p-2" onClick={() => move(i, 1)} disabled={i === steps.length - 1}>
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  className="noir-btn noir-btn-ghost p-2 hover:!border-destructive hover:!text-destructive"
                  onClick={() => setSteps((p) => p.filter((x) => x.id !== s.id))}
                  disabled={steps.length === 1}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Field label="kW"><NumberInput value={s.kw} onChange={(v) => update(s.id, "kw", v)} step={0.1} min={0} /></Field>
                <Field label="kVA"><NumberInput value={s.kva} onChange={(v) => update(s.id, "kva", v)} step={0.1} min={0} /></Field>
                <Field label="Power Factor"><NumberInput value={s.pf} onChange={(v) => update(s.id, "pf", v)} step={0.01} min={0} /></Field>
                <Field label="Load Type">
                  <Select value={s.loadType} onChange={(v) => update(s.id, "loadType", v)} options={LOAD_TYPE_OPTIONS} />
                </Field>
                <Field label="Start ×" hint={`Surge: ${(s.kva * s.startingKvaMultiplier).toFixed(1)} kVA`}>
                  <NumberInput value={s.startingKvaMultiplier} onChange={(v) => update(s.id, "startingKvaMultiplier", v)} step={0.1} min={1} />
                </Field>
              </div>
            </Card>
          ))}
          <button className="noir-btn noir-btn-ghost w-full justify-center" onClick={() => setSteps((p) => [...p, defaultStep()])}>
            <Plus className="w-4 h-4" /> Add load step
          </button>
        </div>
      </Section>

      <Section title="Results">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Stat label="Total kW" value={result.totalRunningKw.toFixed(1)} unit="kW" />
          <Stat label="Running kVA" value={result.totalRunningKva.toFixed(1)} unit="kVA" />
          <Stat label="Peak kVA (Surge)" value={result.maxPeakKva.toFixed(1)} unit="kVA" />
          <Stat label="Recommended" value={result.recommendedGenKva} unit="kVA" accent
            hint={`Loading ${result.loadingPercent.toFixed(1)}%`} />
        </div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="noir-label">Load Profile — Running vs Peak (kVA)</div>
            <div className="noir-label">Recommended size: <span className="text-primary">{result.recommendedGenKva} kVA</span></div>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} />
                <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }}
                />
                <ReferenceLine y={result.recommendedGenKva} stroke="var(--primary)" strokeDasharray="4 4" label={{ value: "Rated kVA", fill: "var(--primary)", fontSize: 10 }} />
                <Bar dataKey="running" fill="var(--chart-3)" name="Running kVA" radius={[2, 2, 0, 0]} />
                <Bar dataKey="peak" name="Peak kVA at step" radius={[2, 2, 0, 0]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.peak >= result.recommendedGenKva ? "var(--destructive)" : "var(--primary)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className={`mono text-2xl font-bold ${loadingTone}`}>{result.loadingPercent.toFixed(1)}%</span>
          <span className="text-muted-foreground">loading at recommended rating</span>
          {result.loadingPercent > 80 && (
            <span className="ml-3 inline-flex items-center gap-1 text-warning text-xs">
              <AlertTriangle className="w-3.5 h-3.5" /> Consider next size up for headroom.
            </span>
          )}
        </div>
      </Section>

      <Section title="Standard kVA Series — IEC 60034">
        <Card>
          <div className="flex flex-wrap gap-1.5">
            {STANDARD_KVA_SERIES.map((k) => (
              <span key={k}
                className={`mono text-xs px-2.5 py-1 rounded border tabular-nums ${
                  k === result.recommendedGenKva
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground"
                }`}>
                {k}
              </span>
            ))}
          </div>
        </Card>
      </Section>
    </>
  );
}
