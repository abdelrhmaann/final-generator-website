import { useState, useEffect, useRef } from "react";
import {
  calcVoltageDip, XD_BY_KVA, STANDARD_KVA_SERIES,
  type VoltageDipInput, type VoltageDipResult,
} from "../../../shared/genCalc";
import type { ProjectInfo } from "@/types/project";
import { Gauge, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { saveSession } from "@/lib/sessionStore";

interface Props { projectInfo: ProjectInfo; }

export default function VoltageDipModule({ projectInfo }: Props) {
  const [input, setInput] = useState<VoltageDipInput>({
    generatorKva: 500,
    xdPercent: 25,
    motorStartingKva: 150,
  });
  const [result, setResult] = useState<VoltageDipResult | null>(null);
  const [loadType, setLoadType] = useState<"general" | "sensitive">("general");

  const update = (key: keyof VoltageDipInput, value: number) =>
    setInput(prev => ({ ...prev, [key]: value }));

  // Auto-fill X"d from standard table when kVA changes
  const autoFillXd = (kva: number) => {
    const entry = XD_BY_KVA.find(e => e.kva === kva);
    if (entry) update("xdPercent", entry.xd);
    update("generatorKva", kva);
  };

  const calculate = () => {
    const r = calcVoltageDip(input);
    setResult(r);
    saveSession({
      moduleType: "voltage-dip",
      projectInfo,
      inputData: { ...input, loadType },
      resultData: r,
    });
  };

  const pass = result
    ? (loadType === "sensitive" ? result.passSensitive : result.passGeneral)
    : null;

  const limit = loadType === "sensitive" ? 10 : 15;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <ModuleHeader />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {/* Input Panel */}
        <div className="engineering-card">
          <span className="section-label" style={{ display: "block", marginBottom: "0.75rem" }}>
            Input Parameters
          </span>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {/* Generator kVA */}
            <div>
              <label style={labelStyle}>Generator Rating (kVA)</label>
              <div style={{ display: "flex", gap: "0.4rem" }}>
                <input
                  type="number" min={20} step={1}
                  value={input.generatorKva}
                  onChange={e => update("generatorKva", parseFloat(e.target.value) || 0)}
                  style={inputStyle}
                />
                <select
                  value={STANDARD_KVA_SERIES.includes(input.generatorKva) ? input.generatorKva : ""}
                  onChange={e => autoFillXd(parseInt(e.target.value))}
                  style={{ ...inputStyle, width: "auto", cursor: "pointer" }}
                >
                  <option value="">Standard</option>
                  {STANDARD_KVA_SERIES.map(k => (
                    <option key={k} value={k}>{k} kVA</option>
                  ))}
                </select>
              </div>
              <p style={hintStyle}>Select standard size to auto-fill X"d</p>
            </div>

            {/* X"d */}
            <div>
              <label style={labelStyle}>Subtransient Reactance X"d (%)</label>
              <input
                type="number" min={1} max={50} step={0.5}
                value={input.xdPercent}
                onChange={e => update("xdPercent", parseFloat(e.target.value) || 0)}
                style={inputStyle}
              />
              <p style={hintStyle}>Typical: 16–29% (auto-filled from standard sizes)</p>
            </div>

            {/* Motor Starting kVA */}
            <div>
              <label style={labelStyle}>Motor Starting kVA</label>
              <input
                type="number" min={0} step={1}
                value={input.motorStartingKva}
                onChange={e => update("motorStartingKva", parseFloat(e.target.value) || 0)}
                style={inputStyle}
              />
              <p style={hintStyle}>Largest single motor starting kVA demand</p>
            </div>

            {/* Load Type */}
            <div>
              <label style={labelStyle}>Load Sensitivity</label>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {(["general", "sensitive"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setLoadType(t)}
                    style={{
                      flex: 1, padding: "0.4rem",
                      borderRadius: 5, border: "none", cursor: "pointer",
                      fontSize: "0.75rem", fontWeight: 500,
                      background: loadType === t ? "oklch(0.62 0.18 220 / 0.15)" : "oklch(0.20 0.025 248)",
                      color: loadType === t ? "oklch(0.62 0.18 220)" : "oklch(0.55 0.015 230)",
                      borderColor: loadType === t ? "oklch(0.62 0.18 220 / 0.3)" : "oklch(0.28 0.03 248)",
                      borderWidth: 1, borderStyle: "solid",
                    }}
                  >
                    {t === "general" ? "General (<15%)" : "Sensitive (<10%)"}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={calculate}
              style={{
                background: "oklch(0.62 0.18 220)", color: "white",
                border: "none", borderRadius: 6, padding: "0.5rem",
                fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
              }}
            >
              <Gauge size={14} /> Calculate Voltage Dip
            </button>
          </div>

          {/* Formula Reference */}
          <div style={{
            marginTop: "1rem", padding: "0.75rem",
            background: "oklch(0.20 0.025 248)",
            borderRadius: 6, border: "1px solid oklch(0.25 0.03 248)",
          }}>
            <div style={{ fontSize: "0.6rem", color: "oklch(0.50 0.015 230)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>
              Formula (IEC 60034)
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "0.72rem", color: "oklch(0.80 0.01 220)", lineHeight: 1.8 }}>
              <div>Vdip% = (Sm / (Sg / X"d + Sm)) × 100</div>
              <div style={{ color: "oklch(0.50 0.015 230)", fontSize: "0.65rem", marginTop: "0.3rem" }}>
                Sm = Motor starting kVA<br />
                Sg = Generator rated kVA<br />
                X"d = Subtransient reactance (decimal)
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="engineering-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
          <span className="section-label">Voltage Dip Result</span>

          {result ? (
            <>
              {/* Animated Gauge */}
              <GaugeDisplay
                value={result.voltageDipPercent}
                limit={limit}
                pass={pass ?? true}
              />

              {/* Pass/Fail Badges */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <StatusBadge
                  label="General Loads (<15%)"
                  pass={result.passGeneral}
                />
                <StatusBadge
                  label="Sensitive Loads (<10%)"
                  pass={result.passSensitive}
                />
              </div>

              {/* Recommendation */}
              <div style={{
                width: "100%", padding: "0.75rem",
                borderRadius: 6,
                background: pass
                  ? "oklch(0.60 0.18 145 / 0.08)"
                  : "oklch(0.55 0.22 25 / 0.08)",
                border: `1px solid ${pass ? "oklch(0.60 0.18 145 / 0.25)" : "oklch(0.55 0.22 25 / 0.25)"}`,
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  marginBottom: "0.4rem",
                  color: pass ? "oklch(0.70 0.18 145)" : "oklch(0.70 0.22 25)",
                  fontSize: "0.72rem", fontWeight: 600,
                }}>
                  {pass ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                  {pass ? "COMPLIANT" : "NON-COMPLIANT"}
                </div>
                <p style={{ fontSize: "0.72rem", color: "oklch(0.75 0.01 220)", margin: 0, lineHeight: 1.6 }}>
                  {result.recommendation}
                </p>
              </div>

              {/* Calculation Breakdown */}
              <div style={{ width: "100%", padding: "0.75rem", background: "oklch(0.20 0.025 248)", borderRadius: 6 }}>
                <div style={{ fontSize: "0.6rem", color: "oklch(0.50 0.015 230)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
                  Calculation Breakdown
                </div>
                {[
                  ["Generator kVA (Sg)", `${input.generatorKva} kVA`],
                  ["X\"d (decimal)", `${(input.xdPercent / 100).toFixed(4)}`],
                  ["Sg / X\"d", `${(input.generatorKva / (input.xdPercent / 100)).toFixed(1)} kVA`],
                  ["Motor Start kVA (Sm)", `${input.motorStartingKva} kVA`],
                  ["Denominator (Sg/X\"d + Sm)", `${(input.generatorKva / (input.xdPercent / 100) + input.motorStartingKva).toFixed(1)} kVA`],
                  ["Voltage Dip", `${result.voltageDipPercent.toFixed(2)}%`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "0.2rem 0", borderBottom: "1px solid oklch(0.25 0.03 248)", fontSize: "0.72rem" }}>
                    <span style={{ color: "oklch(0.55 0.015 230)" }}>{k}</span>
                    <span style={{ fontFamily: "JetBrains Mono, monospace", color: "oklch(0.85 0.01 220)" }}>{v}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "0.75rem", color: "oklch(0.40 0.015 230)" }}>
              <Gauge size={48} strokeWidth={1} />
              <p style={{ fontSize: "0.8rem", textAlign: "center" }}>
                Enter parameters and click Calculate<br />to see the voltage dip result
              </p>
            </div>
          )}
        </div>
      </div>

      {/* X"d Reference Table */}
      <div className="engineering-card">
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.75rem" }}>
          <Info size={13} style={{ color: "oklch(0.62 0.18 220)" }} />
          <span className="section-label">Standard X"d Values by Generator Size (ISO 8528)</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid oklch(0.28 0.03 248)" }}>
                {XD_BY_KVA.map(e => (
                  <th key={e.kva} style={{
                    padding: "0.3rem 0.5rem", textAlign: "center",
                    color: e.kva === input.generatorKva ? "oklch(0.62 0.18 220)" : "oklch(0.45 0.015 230)",
                    fontWeight: 600, fontSize: "0.65rem",
                    background: e.kva === input.generatorKva ? "oklch(0.62 0.18 220 / 0.08)" : "transparent",
                  }}>
                    {e.kva}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                {XD_BY_KVA.map(e => (
                  <td key={e.kva} style={{
                    padding: "0.3rem 0.5rem", textAlign: "center",
                    fontFamily: "JetBrains Mono, monospace",
                    color: e.kva === input.generatorKva ? "oklch(0.62 0.18 220)" : "oklch(0.75 0.01 220)",
                    background: e.kva === input.generatorKva ? "oklch(0.62 0.18 220 / 0.08)" : "transparent",
                    fontWeight: e.kva === input.generatorKva ? 700 : 400,
                  }}>
                    {e.xd}%
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: "0.65rem", color: "oklch(0.40 0.015 230)", marginTop: "0.5rem" }}>
          Values in kVA. X"d = subtransient reactance. Source: ISO 8528 / typical manufacturer data.
        </p>
      </div>
    </div>
  );
}

// ── Animated SVG Gauge ──────────────────────────────────────

function GaugeDisplay({ value, limit, pass }: { value: number; limit: number; pass: boolean }) {
  const animRef = useRef(0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const target = Math.min(value, 50);
    const start = displayValue;
    const duration = 800;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(start + (target - start) * eased);
      if (progress < 1) animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [value]);

  // SVG arc parameters
  const cx = 120, cy = 110, r = 85;
  const startAngle = -210;
  const sweepAngle = 240;
  const maxDisplayVal = 50; // gauge shows 0–50%

  const pct = Math.min(displayValue / maxDisplayVal, 1);
  const angle = startAngle + pct * sweepAngle;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const arcX = (a: number) => cx + r * Math.cos(toRad(a));
  const arcY = (a: number) => cy + r * Math.sin(toRad(a));

  // Build arc path
  const arcPath = (fromAngle: number, toAngle: number, radius: number) => {
    const x1 = cx + radius * Math.cos(toRad(fromAngle));
    const y1 = cy + radius * Math.sin(toRad(fromAngle));
    const x2 = cx + radius * Math.cos(toRad(toAngle));
    const y2 = cy + radius * Math.sin(toRad(toAngle));
    const large = Math.abs(toAngle - fromAngle) > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  };

  const endAngle = startAngle + sweepAngle;
  const needleAngle = angle;

  const needleColor = pass ? "oklch(0.60 0.18 145)" : "oklch(0.55 0.22 25)";
  const arcColor = pass ? "oklch(0.60 0.18 145)" : "oklch(0.55 0.22 25)";

  // Tick marks for 0, 10, 15, 25, 50
  const ticks = [0, 5, 10, 15, 20, 25, 30, 40, 50];

  return (
    <div style={{ position: "relative", width: 240, height: 160 }}>
      <svg width={240} height={160} viewBox="0 0 240 160">
        {/* Background arc */}
        <path
          d={arcPath(startAngle, endAngle, r)}
          fill="none" stroke="oklch(0.22 0.025 248)" strokeWidth={14} strokeLinecap="round"
        />

        {/* Green zone (0–10%) */}
        <path
          d={arcPath(startAngle, startAngle + (10 / maxDisplayVal) * sweepAngle, r)}
          fill="none" stroke="oklch(0.60 0.18 145 / 0.3)" strokeWidth={14} strokeLinecap="round"
        />

        {/* Yellow zone (10–15%) */}
        <path
          d={arcPath(startAngle + (10 / maxDisplayVal) * sweepAngle, startAngle + (15 / maxDisplayVal) * sweepAngle, r)}
          fill="none" stroke="oklch(0.72 0.18 75 / 0.3)" strokeWidth={14} strokeLinecap="round"
        />

        {/* Red zone (15–50%) */}
        <path
          d={arcPath(startAngle + (15 / maxDisplayVal) * sweepAngle, endAngle, r)}
          fill="none" stroke="oklch(0.55 0.22 25 / 0.3)" strokeWidth={14} strokeLinecap="round"
        />

        {/* Value arc */}
        {pct > 0 && (
          <path
            d={arcPath(startAngle, needleAngle, r)}
            fill="none" stroke={arcColor} strokeWidth={14} strokeLinecap="round"
            style={{ transition: "none" }}
          />
        )}

        {/* Tick marks */}
        {ticks.map(tick => {
          const tickAngle = startAngle + (tick / maxDisplayVal) * sweepAngle;
          const inner = r - 10;
          const outer = r + 2;
          const x1 = cx + inner * Math.cos(toRad(tickAngle));
          const y1 = cy + inner * Math.sin(toRad(tickAngle));
          const x2 = cx + outer * Math.cos(toRad(tickAngle));
          const y2 = cy + outer * Math.sin(toRad(tickAngle));
          const lx = cx + (r + 16) * Math.cos(toRad(tickAngle));
          const ly = cy + (r + 16) * Math.sin(toRad(tickAngle));
          return (
            <g key={tick}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="oklch(0.40 0.015 230)" strokeWidth={1.5} />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                fill={tick === 10 || tick === 15 ? "oklch(0.72 0.18 75)" : "oklch(0.40 0.015 230)"}
                fontSize={8} fontFamily="JetBrains Mono, monospace">
                {tick}
              </text>
            </g>
          );
        })}

        {/* Limit line */}
        {(() => {
          const lAngle = startAngle + (limit / maxDisplayVal) * sweepAngle;
          const lx1 = cx + (r - 16) * Math.cos(toRad(lAngle));
          const ly1 = cy + (r - 16) * Math.sin(toRad(lAngle));
          const lx2 = cx + (r + 4) * Math.cos(toRad(lAngle));
          const ly2 = cy + (r + 4) * Math.sin(toRad(lAngle));
          return (
            <line x1={lx1} y1={ly1} x2={lx2} y2={ly2}
              stroke="oklch(0.72 0.18 75)" strokeWidth={2} strokeDasharray="3 2" />
          );
        })()}

        {/* Needle */}
        {(() => {
          const nx = cx + (r - 20) * Math.cos(toRad(needleAngle));
          const ny = cy + (r - 20) * Math.sin(toRad(needleAngle));
          return (
            <>
              <line x1={cx} y1={cy} x2={nx} y2={ny}
                stroke={needleColor} strokeWidth={2.5} strokeLinecap="round" />
              <circle cx={cx} cy={cy} r={5} fill={needleColor} />
            </>
          );
        })()}

        {/* Center value */}
        <text x={cx} y={cy + 28} textAnchor="middle"
          fill={arcColor} fontSize={22} fontWeight={700} fontFamily="JetBrains Mono, monospace">
          {displayValue.toFixed(1)}%
        </text>
        <text x={cx} y={cy + 42} textAnchor="middle"
          fill="oklch(0.45 0.015 230)" fontSize={9} fontFamily="JetBrains Mono, monospace">
          VOLTAGE DIP
        </text>
      </svg>
    </div>
  );
}

function StatusBadge({ label, pass }: { label: string; pass: boolean }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.3rem",
      padding: "0.3rem 0.6rem", borderRadius: 5,
      fontSize: "0.68rem", fontWeight: 600,
      background: pass ? "oklch(0.60 0.18 145 / 0.12)" : "oklch(0.55 0.22 25 / 0.12)",
      color: pass ? "oklch(0.70 0.18 145)" : "oklch(0.70 0.22 25)",
      border: `1px solid ${pass ? "oklch(0.60 0.18 145 / 0.3)" : "oklch(0.55 0.22 25 / 0.3)"}`,
    }}>
      {pass ? <CheckCircle size={11} /> : <AlertTriangle size={11} />}
      {pass ? "PASS" : "FAIL"} — {label}
    </div>
  );
}

function ModuleHeader() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: "oklch(0.62 0.18 220 / 0.15)",
        border: "1px solid oklch(0.62 0.18 220 / 0.3)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "oklch(0.62 0.18 220)",
      }}>
        <Gauge size={16} />
      </div>
      <div>
        <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "oklch(0.93 0.01 220)", margin: 0 }}>
          Voltage Dip Calculator
        </h2>
        <p style={{ fontSize: "0.68rem", color: "oklch(0.50 0.015 230)", margin: 0 }}>
          Motor Starting Impact — IEC 60034 / ISO 8528
        </p>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.65rem", fontWeight: 600,
  color: "oklch(0.55 0.015 230)", textTransform: "uppercase",
  letterSpacing: "0.08em", marginBottom: "0.3rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%", background: "oklch(0.20 0.025 248)",
  border: "1px solid oklch(0.28 0.03 248)", borderRadius: 5,
  padding: "0.4rem 0.6rem", fontSize: "0.8rem",
  color: "oklch(0.93 0.01 220)", outline: "none", fontFamily: "inherit",
};

const hintStyle: React.CSSProperties = {
  fontSize: "0.62rem", color: "oklch(0.40 0.015 230)", margin: "0.2rem 0 0",
};
