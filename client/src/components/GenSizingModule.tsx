import { useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, Legend,
} from "recharts";
import {
  calcGenSizing, MOTOR_START_MULTIPLIERS, LOAD_TYPE_LABELS,
  STANDARD_KVA_SERIES, type LoadStep, type GenSizingResult,
} from "../../../shared/genCalc";
import type { ProjectInfo } from "@/types/project";
import { Plus, Trash2, ChevronUp, ChevronDown, Zap, AlertTriangle } from "lucide-react";
import { nanoid } from "nanoid";
import { saveSession } from "@/lib/sessionStore";

interface Props { projectInfo: ProjectInfo; }

const LOAD_TYPES = Object.keys(LOAD_TYPE_LABELS) as (keyof typeof LOAD_TYPE_LABELS)[];

const COLORS = {
  running:  "oklch(0.62 0.18 220)",
  starting: "oklch(0.72 0.18 75)",
  peak:     "oklch(0.55 0.22 25)",
};

function defaultStep(): LoadStep {
  return {
    id: nanoid(8),
    name: "",
    kw: 0,
    kva: 0,
    pf: 0.85,
    loadType: "inductive",
    startingKvaMultiplier: 1.0,
  };
}

export default function GenSizingModule({ projectInfo }: Props) {
  const [steps, setSteps] = useState<LoadStep[]>([defaultStep()]);
  const [result, setResult] = useState<GenSizingResult | null>(null);

  const updateStep = useCallback((id: string, key: keyof LoadStep, value: string | number) => {
    setSteps(prev => prev.map(s => {
      if (s.id !== id) return s;
      const updated = { ...s, [key]: value };
      // Auto-set starting multiplier when load type changes
      if (key === "loadType") {
        updated.startingKvaMultiplier = MOTOR_START_MULTIPLIERS[value as string] ?? 1.0;
      }
      // Auto-compute kVA from kW and PF when either changes
      if (key === "kw" || key === "pf") {
        const kw = key === "kw" ? Number(value) : s.kw;
        const pf = key === "pf" ? Number(value) : s.pf;
        if (pf > 0) updated.kva = Math.round((kw / pf) * 100) / 100;
      }
      return updated;
    }));
  }, []);

  const addStep = () => setSteps(prev => [...prev, defaultStep()]);
  const removeStep = (id: string) => setSteps(prev => prev.filter(s => s.id !== id));
  const moveStep = (id: string, dir: -1 | 1) => {
    setSteps(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  };

  const calculate = () => {
    const validSteps = steps.filter(s => s.kva > 0);
    if (validSteps.length === 0) return;
    const r = calcGenSizing(validSteps);
    setResult(r);
    saveSession({
      moduleType: "gen-sizing",
      projectInfo,
      inputData: { steps: validSteps },
      resultData: r,
    });
  };

  const reset = () => { setSteps([defaultStep()]); setResult(null); };

  // Build chart data
  const chartData = result
    ? result.steps.map((s, i) => ({
        name: s.name || `Step ${i + 1}`,
        "Running kVA": Math.round(s.stepKva * 10) / 10,
        "Starting Surge": Math.round(Math.max(0, s.startingKva - s.stepKva) * 10) / 10,
        "Cumulative kVA": Math.round(s.cumulativeRunningKva * 10) / 10,
        "Peak kVA": Math.round(s.peakKvaAtThisStep * 10) / 10,
      }))
    : [];

  const loadingColor = result
    ? result.loadingPercent > 90 ? "oklch(0.55 0.22 25)"
    : result.loadingPercent > 75 ? "oklch(0.72 0.18 75)"
    : "oklch(0.60 0.18 145)"
    : "oklch(0.60 0.18 145)";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Module Header */}
      <ModuleHeader
        title="Generator kVA Sizing"
        subtitle="Step Load Method — IEC 60034 / ISO 8528"
        icon={<Zap size={16} />}
      />

      {/* Load Steps Table */}
      <div className="engineering-card">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
          <span className="section-label">Load Steps</span>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={addStep} style={btnStyle("primary")}>
              <Plus size={12} /> Add Step
            </button>
            <button onClick={reset} style={btnStyle("ghost")}>
              Reset
            </button>
          </div>
        </div>

        {/* Column headers */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "28px 1fr 80px 80px 70px 160px 110px 60px",
          gap: "0.4rem",
          padding: "0.3rem 0.4rem",
          marginBottom: "0.25rem",
          fontSize: "0.6rem", fontWeight: 700,
          color: "oklch(0.45 0.015 230)",
          textTransform: "uppercase", letterSpacing: "0.08em",
          borderBottom: "1px solid oklch(0.28 0.03 248)",
        }}>
          <span>#</span>
          <span>Step Name</span>
          <span>kW</span>
          <span>kVA</span>
          <span>PF</span>
          <span>Load Type</span>
          <span>Start Mult.</span>
          <span></span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          {steps.map((step, idx) => (
            <StepRow
              key={step.id}
              step={step}
              index={idx}
              total={steps.length}
              onUpdate={updateStep}
              onRemove={removeStep}
              onMove={moveStep}
            />
          ))}
        </div>

        <div style={{ marginTop: "0.75rem", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={calculate} style={btnStyle("calculate")}>
            <Zap size={13} /> Calculate Generator Size
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "0.75rem" }}>
            <ResultCard
              label="Required Generator kVA"
              value={result.requiredGenKva.toFixed(1)}
              unit="kVA"
              sub="Governing demand"
              color="oklch(0.62 0.18 220)"
            />
            <ResultCard
              label="Recommended Standard Size"
              value={result.recommendedGenKva.toString()}
              unit="kVA"
              sub="Next standard rating"
              color="oklch(0.60 0.18 145)"
              highlight
            />
            <ResultCard
              label="Total Running kW"
              value={result.totalRunningKw.toFixed(1)}
              unit="kW"
              sub="Steady-state load"
              color="oklch(0.62 0.18 220)"
            />
            <ResultCard
              label="Max Starting kVA"
              value={result.maxPeakKva.toFixed(1)}
              unit="kVA"
              sub="Peak transient demand"
              color="oklch(0.72 0.18 75)"
            />
          </div>

          {/* Loading Bar */}
          <div className="engineering-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span className="section-label">Generator Loading</span>
              <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "1rem", fontWeight: 700, color: loadingColor }}>
                {result.loadingPercent.toFixed(1)}%
              </span>
            </div>
            <div style={{ background: "oklch(0.20 0.025 248)", borderRadius: 4, height: 14, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${Math.min(result.loadingPercent, 100)}%`,
                background: loadingColor,
                borderRadius: 4,
                transition: "width 0.6s ease",
                position: "relative",
              }}>
                {result.loadingPercent > 15 && (
                  <span style={{
                    position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                    fontSize: "0.6rem", fontWeight: 700, color: "white",
                  }}>
                    {result.loadingPercent.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.3rem", fontSize: "0.65rem", color: "oklch(0.45 0.015 230)" }}>
              <span>0%</span>
              <span style={{ color: "oklch(0.72 0.18 75)" }}>75% (Recommended max)</span>
              <span style={{ color: "oklch(0.55 0.22 25)" }}>100%</span>
            </div>
            {result.loadingPercent > 90 && (
              <div style={{ marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem", color: "oklch(0.70 0.22 25)", fontSize: "0.75rem" }}>
                <AlertTriangle size={13} />
                Generator loading exceeds 90%. Consider upsizing to the next standard rating.
              </div>
            )}
          </div>

          {/* Signature Bar Chart */}
          <div className="engineering-card">
            <div style={{ marginBottom: "0.75rem" }}>
              <span className="section-label">Step Load Timeline — kVA Demand Profile</span>
              <p style={{ fontSize: "0.7rem", color: "oklch(0.55 0.015 230)", marginTop: "0.2rem" }}>
                Running kVA (steady-state) + Starting Surge (transient) per step. Generator must handle the peak kVA at each step.
              </p>
            </div>

            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.03 248)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "oklch(0.55 0.015 230)", fontSize: 11 }}
                  axisLine={{ stroke: "oklch(0.28 0.03 248)" }}
                  tickLine={false}
                  label={{ value: "Load Steps", position: "insideBottom", offset: -10, fill: "oklch(0.45 0.015 230)", fontSize: 11 }}
                />
                <YAxis
                  tick={{ fill: "oklch(0.55 0.015 230)", fontSize: 11 }}
                  axisLine={{ stroke: "oklch(0.28 0.03 248)" }}
                  tickLine={false}
                  label={{ value: "kVA", angle: -90, position: "insideLeft", fill: "oklch(0.45 0.015 230)", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.17 0.025 248)",
                    border: "1px solid oklch(0.28 0.03 248)",
                    borderRadius: 6,
                    fontSize: "0.75rem",
                    color: "oklch(0.93 0.01 220)",
                  }}
                  formatter={(value: number, name: string) => [`${value.toFixed(1)} kVA`, name]}
                />
                <Legend
                  wrapperStyle={{ fontSize: "0.7rem", color: "oklch(0.60 0.015 230)", paddingTop: 8 }}
                />
                {/* Reference line for recommended generator size */}
                <ReferenceLine
                  y={result.recommendedGenKva}
                  stroke="oklch(0.60 0.18 145)"
                  strokeDasharray="6 3"
                  label={{
                    value: `Gen: ${result.recommendedGenKva} kVA`,
                    position: "right",
                    fill: "oklch(0.60 0.18 145)",
                    fontSize: 10,
                  }}
                />
                <Bar dataKey="Running kVA" stackId="a" fill="oklch(0.62 0.18 220)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Starting Surge" stackId="a" fill="oklch(0.72 0.18 75)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {/* Step-by-step table */}
            <div style={{ marginTop: "1rem", overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid oklch(0.28 0.03 248)" }}>
                    {["Step", "Name", "Step kW", "Step kVA", "Start kVA", "Cum. kW", "Cum. kVA", "Peak kVA"].map(h => (
                      <th key={h} style={{
                        padding: "0.4rem 0.5rem", textAlign: "right",
                        color: "oklch(0.45 0.015 230)", fontWeight: 600,
                        fontSize: "0.6rem", textTransform: "uppercase", letterSpacing: "0.06em",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.steps.map((s, i) => (
                    <tr key={i} style={{
                      borderBottom: "1px solid oklch(0.22 0.025 248)",
                      background: i % 2 === 0 ? "transparent" : "oklch(0.18 0.025 248 / 0.5)",
                    }}>
                      <td style={tdStyle}>{s.stepIndex}</td>
                      <td style={{ ...tdStyle, textAlign: "left", color: "oklch(0.80 0.01 220)" }}>{s.name || `Step ${i + 1}`}</td>
                      <td style={tdStyle}>{s.stepKw.toFixed(1)}</td>
                      <td style={tdStyle}>{s.stepKva.toFixed(1)}</td>
                      <td style={{ ...tdStyle, color: "oklch(0.72 0.18 75)" }}>{s.startingKva.toFixed(1)}</td>
                      <td style={tdStyle}>{s.cumulativeKw.toFixed(1)}</td>
                      <td style={tdStyle}>{s.cumulativeRunningKva.toFixed(1)}</td>
                      <td style={{
                        ...tdStyle,
                        color: s.peakKvaAtThisStep >= result.maxPeakKva ? "oklch(0.55 0.22 25)" : "oklch(0.93 0.01 220)",
                        fontWeight: s.peakKvaAtThisStep >= result.maxPeakKva ? 700 : 400,
                      }}>
                        {s.peakKvaAtThisStep.toFixed(1)}
                        {s.peakKvaAtThisStep >= result.maxPeakKva && " ★"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Standard kVA Series Reference */}
          <div className="engineering-card">
            <span className="section-label" style={{ display: "block", marginBottom: "0.5rem" }}>
              Standard Generator kVA Series (ISO 8528)
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
              {STANDARD_KVA_SERIES.map(kva => (
                <span key={kva} style={{
                  padding: "0.2rem 0.5rem",
                  borderRadius: 4,
                  fontSize: "0.7rem",
                  fontFamily: "JetBrains Mono, monospace",
                  background: kva === result.recommendedGenKva
                    ? "oklch(0.60 0.18 145 / 0.2)"
                    : kva < result.requiredGenKva
                    ? "oklch(0.20 0.025 248)"
                    : "oklch(0.22 0.03 248)",
                  color: kva === result.recommendedGenKva
                    ? "oklch(0.70 0.18 145)"
                    : kva < result.requiredGenKva
                    ? "oklch(0.40 0.015 230)"
                    : "oklch(0.70 0.01 220)",
                  border: kva === result.recommendedGenKva
                    ? "1px solid oklch(0.60 0.18 145 / 0.4)"
                    : "1px solid oklch(0.28 0.03 248)",
                  fontWeight: kva === result.recommendedGenKva ? 700 : 400,
                }}>
                  {kva}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function StepRow({
  step, index, total, onUpdate, onRemove, onMove,
}: {
  step: LoadStep;
  index: number;
  total: number;
  onUpdate: (id: string, key: keyof LoadStep, value: string | number) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "28px 1fr 80px 80px 70px 160px 110px 60px",
      gap: "0.4rem",
      alignItems: "center",
      padding: "0.25rem 0.4rem",
      borderRadius: 5,
      background: "oklch(0.20 0.025 248 / 0.5)",
      border: "1px solid oklch(0.25 0.03 248)",
    }}>
      {/* Step number */}
      <span style={{ fontSize: "0.7rem", color: "oklch(0.45 0.015 230)", textAlign: "center", fontFamily: "JetBrains Mono, monospace" }}>
        {index + 1}
      </span>

      {/* Name */}
      <input
        value={step.name}
        placeholder={`Step ${index + 1}`}
        onChange={e => onUpdate(step.id, "name", e.target.value)}
        style={inputStyle}
      />

      {/* kW */}
      <input
        type="number" min={0} step={0.1}
        value={step.kw || ""}
        placeholder="0"
        onChange={e => onUpdate(step.id, "kw", parseFloat(e.target.value) || 0)}
        style={{ ...inputStyle, textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}
      />

      {/* kVA */}
      <input
        type="number" min={0} step={0.1}
        value={step.kva || ""}
        placeholder="0"
        onChange={e => onUpdate(step.id, "kva", parseFloat(e.target.value) || 0)}
        style={{ ...inputStyle, textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}
      />

      {/* PF */}
      <input
        type="number" min={0.1} max={1} step={0.01}
        value={step.pf}
        onChange={e => onUpdate(step.id, "pf", parseFloat(e.target.value) || 0.85)}
        style={{ ...inputStyle, textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}
      />

      {/* Load Type */}
      <select
        value={step.loadType}
        onChange={e => onUpdate(step.id, "loadType", e.target.value)}
        style={{ ...inputStyle, cursor: "pointer" }}
      >
        {LOAD_TYPES.map(t => (
          <option key={t} value={t}>{LOAD_TYPE_LABELS[t]}</option>
        ))}
      </select>

      {/* Starting Multiplier */}
      <input
        type="number" min={0.5} max={10} step={0.1}
        value={step.startingKvaMultiplier}
        onChange={e => onUpdate(step.id, "startingKvaMultiplier", parseFloat(e.target.value) || 1)}
        style={{ ...inputStyle, textAlign: "right", fontFamily: "JetBrains Mono, monospace" }}
      />

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.2rem", justifyContent: "center" }}>
        <IconBtn onClick={() => onMove(step.id, -1)} disabled={index === 0} title="Move up">
          <ChevronUp size={11} />
        </IconBtn>
        <IconBtn onClick={() => onMove(step.id, 1)} disabled={index === total - 1} title="Move down">
          <ChevronDown size={11} />
        </IconBtn>
        <IconBtn onClick={() => onRemove(step.id)} title="Remove" danger>
          <Trash2 size={11} />
        </IconBtn>
      </div>
    </div>
  );
}

function ResultCard({ label, value, unit, sub, color, highlight }: {
  label: string; value: string; unit: string; sub: string; color: string; highlight?: boolean;
}) {
  return (
    <div style={{
      background: highlight ? `${color.replace(")", " / 0.08)")}` : "oklch(0.17 0.025 248)",
      border: `1px solid ${highlight ? color.replace(")", " / 0.3)") : "oklch(0.28 0.03 248)"}`,
      borderRadius: 8,
      padding: "0.875rem",
    }}>
      <div style={{ fontSize: "0.62rem", color: "oklch(0.50 0.015 230)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem" }}>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "1.5rem", fontWeight: 700, color }}>
          {value}
        </span>
        <span style={{ fontSize: "0.7rem", color: "oklch(0.50 0.015 230)", textTransform: "uppercase" }}>{unit}</span>
      </div>
      <div style={{ fontSize: "0.65rem", color: "oklch(0.45 0.015 230)", marginTop: "0.2rem" }}>{sub}</div>
    </div>
  );
}

function ModuleHeader({ title, subtitle, icon }: { title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: "oklch(0.62 0.18 220 / 0.15)",
        border: "1px solid oklch(0.62 0.18 220 / 0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "oklch(0.62 0.18 220)",
      }}>
        {icon}
      </div>
      <div>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "oklch(0.93 0.01 220)", margin: 0 }}>{title}</h2>
        <p style={{ fontSize: "0.68rem", color: "oklch(0.50 0.015 230)", margin: 0 }}>{subtitle}</p>
      </div>
    </div>
  );
}

function IconBtn({ onClick, disabled, title, danger, children }: {
  onClick: () => void; disabled?: boolean; title?: string; danger?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: 22, height: 22,
        display: "flex", alignItems: "center", justifyContent: "center",
        borderRadius: 4, border: "none", cursor: disabled ? "not-allowed" : "pointer",
        background: "transparent",
        color: disabled ? "oklch(0.35 0.015 230)" : danger ? "oklch(0.60 0.22 25)" : "oklch(0.55 0.015 230)",
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );
}

function btnStyle(variant: "primary" | "ghost" | "calculate") {
  const base: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: "0.3rem",
    padding: "0.35rem 0.7rem", borderRadius: 5,
    fontSize: "0.75rem", fontWeight: 500, cursor: "pointer",
    border: "none", transition: "all 0.15s",
  };
  if (variant === "primary") return { ...base, background: "oklch(0.62 0.18 220 / 0.15)", color: "oklch(0.62 0.18 220)", border: "1px solid oklch(0.62 0.18 220 / 0.3)" };
  if (variant === "calculate") return { ...base, background: "oklch(0.62 0.18 220)", color: "white", padding: "0.45rem 1rem", fontSize: "0.8rem", fontWeight: 600 };
  return { ...base, background: "transparent", color: "oklch(0.50 0.015 230)", border: "1px solid oklch(0.28 0.03 248)" };
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "oklch(0.22 0.025 248)",
  border: "1px solid oklch(0.28 0.03 248)",
  borderRadius: 4,
  padding: "0.3rem 0.4rem",
  fontSize: "0.75rem",
  color: "oklch(0.93 0.01 220)",
  outline: "none",
  fontFamily: "inherit",
};

const tdStyle: React.CSSProperties = {
  padding: "0.35rem 0.5rem",
  textAlign: "right",
  fontFamily: "JetBrains Mono, monospace",
  fontSize: "0.72rem",
  color: "oklch(0.80 0.01 220)",
};
