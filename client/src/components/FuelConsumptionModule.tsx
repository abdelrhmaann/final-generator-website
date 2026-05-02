import { useState } from "react";
import {
  calcFuelConsumption, SFC_CURVE, interpolateSfc,
  type FuelInput, type FuelResult,
} from "../../../shared/genCalc";
import type { ProjectInfo } from "@/types/project";
import { Fuel, Droplets } from "lucide-react";
import { saveSession } from "@/lib/sessionStore";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceDot,
} from "recharts";

interface Props { projectInfo: ProjectInfo; }

export default function FuelConsumptionModule({ projectInfo }: Props) {
  const [input, setInput] = useState<FuelInput>({ generatorKw: 400, loadFactorPercent: 75 });
  const [result, setResult] = useState<FuelResult | null>(null);

  const calculate = () => {
    const r = calcFuelConsumption(input);
    setResult(r);
    saveSession({ moduleType: "fuel", projectInfo, inputData: input, resultData: r });
  };

  // SFC curve chart data
  const sfcChartData = Array.from({ length: 21 }, (_, i) => {
    const lf = i * 5;
    const sfc = interpolateSfc(lf / 100);
    return { loadFactor: lf, sfc: Math.round(sfc * 1000) / 1000 };
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: "oklch(0.72 0.18 75 / 0.15)",
          border: "1px solid oklch(0.72 0.18 75 / 0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "oklch(0.72 0.18 75)",
        }}>
          <Fuel size={16} />
        </div>
        <div>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "oklch(0.93 0.01 220)", margin: 0 }}>
            Fuel Consumption Estimator
          </h2>
          <p style={{ fontSize: "0.68rem", color: "oklch(0.50 0.015 230)", margin: 0 }}>
            Diesel SFC Curve — ISO 8528 Standard
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: "1rem" }}>
        {/* Inputs */}
        <div className="engineering-card">
          <span className="section-label" style={{ display: "block", marginBottom: "0.75rem" }}>
            Input Parameters
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div>
              <label style={labelStyle}>Generator Output (kW)</label>
              <input
                type="number" min={0} step={10}
                value={input.generatorKw}
                onChange={e => setInput(p => ({ ...p, generatorKw: parseFloat(e.target.value) || 0 }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Load Factor (%)</label>
              <input
                type="number" min={0} max={100} step={5}
                value={input.loadFactorPercent}
                onChange={e => setInput(p => ({ ...p, loadFactorPercent: parseFloat(e.target.value) || 0 }))}
                style={inputStyle}
              />
              <input
                type="range" min={0} max={100} step={5}
                value={input.loadFactorPercent}
                onChange={e => setInput(p => ({ ...p, loadFactorPercent: parseInt(e.target.value) }))}
                style={{ width: "100%", marginTop: "0.4rem", accentColor: "oklch(0.72 0.18 75)" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.6rem", color: "oklch(0.40 0.015 230)" }}>
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
            </div>

            <button onClick={calculate} style={{
              background: "oklch(0.72 0.18 75)", color: "white",
              border: "none", borderRadius: 6, padding: "0.5rem",
              fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
            }}>
              <Fuel size={14} /> Calculate Fuel Consumption
            </button>
          </div>

          {/* SFC Reference */}
          <div style={{ marginTop: "1rem", padding: "0.75rem", background: "oklch(0.20 0.025 248)", borderRadius: 6 }}>
            <div style={{ fontSize: "0.6rem", color: "oklch(0.50 0.015 230)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
              Standard SFC Values (Diesel)
            </div>
            {SFC_CURVE.map(pt => (
              <div key={pt.loadFactor} style={{
                display: "flex", justifyContent: "space-between",
                padding: "0.2rem 0", borderBottom: "1px solid oklch(0.25 0.03 248)",
                fontSize: "0.72rem",
              }}>
                <span style={{ color: "oklch(0.55 0.015 230)" }}>{(pt.loadFactor * 100).toFixed(0)}% Load</span>
                <span style={{ fontFamily: "JetBrains Mono, monospace", color: "oklch(0.72 0.18 75)" }}>
                  {pt.lPerKwh} L/kWh
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Results */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {result && (
            <>
              {/* Key metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                <ResultCard label="SFC" value={result.sfcLPerKwh.toFixed(3)} unit="L/kWh" color="oklch(0.72 0.18 75)" />
                <ResultCard label="Consumption" value={result.consumptionLPerHr.toFixed(1)} unit="L/hr" color="oklch(0.62 0.18 220)" />
                <ResultCard label="Load Factor" value={`${input.loadFactorPercent}%`} unit="" color="oklch(0.60 0.18 145)" />
              </div>

              {/* Tank sizes */}
              <div className="engineering-card">
                <span className="section-label" style={{ display: "block", marginBottom: "0.75rem" }}>
                  Fuel Tank Sizing — Autonomy Requirements
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                  {result.tankDimensions.map(t => (
                    <TankCard key={t.hours} tank={t} />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* SFC Curve Chart */}
          <div className="engineering-card">
            <span className="section-label" style={{ display: "block", marginBottom: "0.5rem" }}>
              Diesel SFC Curve (Specific Fuel Consumption)
            </span>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={sfcChartData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.03 248)" />
                <XAxis
                  dataKey="loadFactor"
                  tick={{ fill: "oklch(0.55 0.015 230)", fontSize: 10 }}
                  axisLine={{ stroke: "oklch(0.28 0.03 248)" }}
                  tickLine={false}
                  label={{ value: "Load Factor (%)", position: "insideBottom", offset: -10, fill: "oklch(0.45 0.015 230)", fontSize: 10 }}
                />
                <YAxis
                  domain={[0.25, 0.45]}
                  tick={{ fill: "oklch(0.55 0.015 230)", fontSize: 10 }}
                  axisLine={{ stroke: "oklch(0.28 0.03 248)" }}
                  tickLine={false}
                  label={{ value: "L/kWh", angle: -90, position: "insideLeft", fill: "oklch(0.45 0.015 230)", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.17 0.025 248)",
                    border: "1px solid oklch(0.28 0.03 248)",
                    borderRadius: 6, fontSize: "0.72rem",
                    color: "oklch(0.93 0.01 220)",
                  }}
                  formatter={(v: number) => [`${v.toFixed(3)} L/kWh`, "SFC"]}
                  labelFormatter={(l: number) => `Load: ${l}%`}
                />
                <Line
                  type="monotone" dataKey="sfc"
                  stroke="oklch(0.72 0.18 75)" strokeWidth={2}
                  dot={false} activeDot={{ r: 4, fill: "oklch(0.72 0.18 75)" }}
                />
                {result && (
                  <ReferenceDot
                    x={input.loadFactorPercent}
                    y={result.sfcLPerKwh}
                    r={5} fill="oklch(0.62 0.18 220)"
                    stroke="oklch(0.93 0.01 220)" strokeWidth={1.5}
                  />
                )}
                {result && (
                  <ReferenceLine
                    x={input.loadFactorPercent}
                    stroke="oklch(0.62 0.18 220 / 0.5)"
                    strokeDasharray="4 3"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function TankCard({ tank }: { tank: { hours: number; liters: number; suggestedL: number; suggestedW: number; suggestedH: number } }) {
  const colorMap: Record<number, string> = {
    8:  "oklch(0.60 0.18 145)",
    24: "oklch(0.72 0.18 75)",
    72: "oklch(0.62 0.18 220)",
  };
  const color = colorMap[tank.hours] ?? "oklch(0.62 0.18 220)";
  return (
    <div style={{
      background: `${color.replace(")", " / 0.08)")}`,
      border: `1px solid ${color.replace(")", " / 0.25)")}`,
      borderRadius: 8, padding: "0.875rem",
    }}>
      <div style={{ fontSize: "0.62rem", color: "oklch(0.50 0.015 230)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>
        {tank.hours}-Hour Autonomy
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem", marginBottom: "0.5rem" }}>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "1.4rem", fontWeight: 700, color }}>
          {tank.liters.toFixed(0)}
        </span>
        <span style={{ fontSize: "0.7rem", color: "oklch(0.50 0.015 230)" }}>L</span>
      </div>
      <div style={{ fontSize: "0.65rem", color: "oklch(0.50 0.015 230)", lineHeight: 1.6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <Droplets size={10} style={{ color }} />
          Suggested tank dimensions:
        </div>
        <div style={{ fontFamily: "JetBrains Mono, monospace", marginTop: "0.2rem", color: "oklch(0.75 0.01 220)" }}>
          {tank.suggestedL}m × {tank.suggestedW}m × {tank.suggestedH}m
        </div>
        <div style={{ color: "oklch(0.40 0.015 230)", marginTop: "0.1rem" }}>
          (L × W × H, rectangular)
        </div>
      </div>
    </div>
  );
}

function ResultCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <div style={{
      background: "oklch(0.17 0.025 248)",
      border: "1px solid oklch(0.28 0.03 248)",
      borderRadius: 8, padding: "0.875rem",
    }}>
      <div style={{ fontSize: "0.62rem", color: "oklch(0.50 0.015 230)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem" }}>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "1.4rem", fontWeight: 700, color }}>
          {value}
        </span>
        {unit && <span style={{ fontSize: "0.7rem", color: "oklch(0.50 0.015 230)", textTransform: "uppercase" }}>{unit}</span>}
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
