import { useState } from "react";
import { calcRoomVentilation, type VentInput, type VentResult } from "../../../shared/genCalc";
import type { ProjectInfo } from "@/types/project";
import { Wind, CheckCircle, AlertTriangle } from "lucide-react";
import { saveSession } from "@/lib/sessionStore";

interface Props { projectInfo: ProjectInfo; }

export default function VentilationModule({ projectInfo }: Props) {
  const [input, setInput] = useState<VentInput>({ generatorKw: 400, roomL: 8, roomW: 5, roomH: 3.5, coolingConfig: "radiator-in-room" });
  const [result, setResult] = useState<VentResult | null>(null);

  const calculate = () => {
    const r = calcRoomVentilation(input);
    setResult(r);
    saveSession({ moduleType: "ventilation", projectInfo, inputData: input, resultData: r });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: "oklch(0.60 0.18 145 / 0.15)",
          border: "1px solid oklch(0.60 0.18 145 / 0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "oklch(0.60 0.18 145)",
        }}>
          <Wind size={16} />
        </div>
        <div>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "oklch(0.93 0.01 220)", margin: 0 }}>
            Generator Room Ventilation Estimator
          </h2>
          <p style={{ fontSize: "0.68rem", color: "oklch(0.50 0.015 230)", margin: 0 }}>
            Heat Rejection & Airflow — ISO 8528-13
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
            <InputField label="Generator Rating (kW)" value={input.generatorKw}
              onChange={v => setInput(p => ({ ...p, generatorKw: v }))} unit="kW" />

            <div style={{ padding: "0.75rem", background: "oklch(0.20 0.025 248)", borderRadius: 6 }}>
              <div style={{ fontSize: "0.62rem", color: "oklch(0.50 0.015 230)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5rem" }}>
                Room Dimensions
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.4rem" }}>
                <SmallInput label="Length (m)" value={input.roomL} onChange={v => setInput(p => ({ ...p, roomL: v }))} />
                <SmallInput label="Width (m)" value={input.roomW} onChange={v => setInput(p => ({ ...p, roomW: v }))} />
                <SmallInput label="Height (m)" value={input.roomH} onChange={v => setInput(p => ({ ...p, roomH: v }))} />
              </div>
              <div style={{ marginTop: "0.5rem", fontSize: "0.65rem", color: "oklch(0.45 0.015 230)" }}>
                Volume: {(input.roomL * input.roomW * input.roomH).toFixed(1)} m³
              </div>
            </div>

            <button onClick={calculate} style={{
              background: "oklch(0.60 0.18 145)", color: "white",
              border: "none", borderRadius: 6, padding: "0.5rem",
              fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
            }}>
              <Wind size={14} /> Calculate Ventilation
            </button>
          </div>

          {/* Design basis */}
          <div style={{ marginTop: "1rem", padding: "0.75rem", background: "oklch(0.20 0.025 248)", borderRadius: 6 }}>
            <div style={{ fontSize: "0.6rem", color: "oklch(0.50 0.015 230)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>
              Calculation Basis
            </div>
            <ul style={{ fontSize: "0.68rem", color: "oklch(0.60 0.015 230)", margin: 0, paddingLeft: "1rem", lineHeight: 2 }}>
              <li>Heat rejection = 30% of rated kW</li>
              <li>ρ = 1.2 kg/m³, Cp = 1.005 kJ/kg·K</li>
              <li>Max temperature rise ΔT = 10°C</li>
              <li>Louver air velocity = 2.5 m/s</li>
              <li>Exhaust louver 10% larger than inlet</li>
            </ul>
          </div>
        </div>

        {/* Results */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {result ? (
            <>
              {/* Room adequacy */}
              <div style={{
                padding: "0.875rem", borderRadius: 8,
                background: result.roomAdequate ? "oklch(0.60 0.18 145 / 0.08)" : "oklch(0.55 0.22 25 / 0.08)",
                border: `1px solid ${result.roomAdequate ? "oklch(0.60 0.18 145 / 0.25)" : "oklch(0.55 0.22 25 / 0.25)"}`,
              }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "0.4rem",
                  color: result.roomAdequate ? "oklch(0.70 0.18 145)" : "oklch(0.70 0.22 25)",
                  fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.4rem",
                }}>
                  {result.roomAdequate ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                  {result.roomAdequate ? "ROOM DIMENSIONS ADEQUATE" : "ROOM DIMENSIONS INSUFFICIENT"}
                </div>
                <p style={{ fontSize: "0.72rem", color: "oklch(0.75 0.01 220)", margin: 0, lineHeight: 1.6 }}>
                  {result.notes}
                </p>
              </div>

              {/* Key metrics */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.75rem" }}>
                <ResultCard label="Heat Rejection" value={result.heatRejectionKw.toFixed(1)} unit="kW" color="oklch(0.55 0.22 25)" />
                <ResultCard label="Required Airflow" value={result.requiredAirflowM3hr.toFixed(0)} unit="m³/hr" color="oklch(0.62 0.18 220)" />
                <ResultCard label="Room Volume" value={result.actualRoomVolumeM3.toFixed(1)} unit="m³"
                  color={result.roomAdequate ? "oklch(0.60 0.18 145)" : "oklch(0.55 0.22 25)"} />
              </div>

              {/* Louver specifications */}
              <div className="engineering-card">
                <span className="section-label" style={{ display: "block", marginBottom: "0.75rem" }}>
                  Louver Specifications
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <LouverCard
                    type="Inlet Louver"
                    area={result.inletLouverAreaM2}
                    size={result.recommendedInletSize}
                    note="Position: ≤0.5 m from floor level"
                    color="oklch(0.62 0.18 220)"
                  />
                  <LouverCard
                    type="Exhaust Louver"
                    area={result.exhaustLouverAreaM2}
                    size={result.recommendedExhaustSize}
                    note="Position: ≥0.3 m from ceiling"
                    color="oklch(0.72 0.18 75)"
                  />
                </div>
              </div>

              {/* Calculation breakdown */}
              <div className="engineering-card">
                <span className="section-label" style={{ display: "block", marginBottom: "0.5rem" }}>
                  Calculation Breakdown
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
                  {[
                    ["Generator kW", `${input.generatorKw} kW`],
                    ["Heat Rejection (30%)", `${result.heatRejectionKw.toFixed(1)} kW`],
                    ["Airflow Formula", "Q = (H × 3600) / (ρ × Cp × ΔT)"],
                    ["Required Airflow", `${result.requiredAirflowM3hr.toFixed(0)} m³/hr`],
                    ["Inlet Louver Area", `${result.inletLouverAreaM2.toFixed(3)} m²`],
                    ["Exhaust Louver Area", `${result.exhaustLouverAreaM2.toFixed(3)} m²`],
                    ["Min Room Volume", `${result.minRoomVolumeM3.toFixed(1)} m³`],
                    ["Actual Room Volume", `${result.actualRoomVolumeM3.toFixed(1)} m³`],
                  ].map(([k, v]) => (
                    <div key={k} style={{
                      display: "flex", justifyContent: "space-between",
                      padding: "0.3rem 0.5rem", borderRadius: 4,
                      background: "oklch(0.20 0.025 248)",
                      fontSize: "0.7rem",
                    }}>
                      <span style={{ color: "oklch(0.55 0.015 230)" }}>{k}</span>
                      <span style={{ fontFamily: "JetBrains Mono, monospace", color: "oklch(0.85 0.01 220)" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: "0.75rem", color: "oklch(0.40 0.015 230)", padding: "3rem",
            }}>
              <Wind size={48} strokeWidth={1} />
              <p style={{ fontSize: "0.8rem", textAlign: "center" }}>
                Enter generator kW and room dimensions<br />to calculate ventilation requirements
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LouverCard({ type, area, size, note, color }: {
  type: string; area: number; size: string; note: string; color: string;
}) {
  return (
    <div style={{
      background: `${color.replace(")", " / 0.08)")}`,
      border: `1px solid ${color.replace(")", " / 0.25)")}`,
      borderRadius: 8, padding: "0.875rem",
    }}>
      <div style={{ fontSize: "0.62rem", color: "oklch(0.50 0.015 230)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>
        {type}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem", marginBottom: "0.4rem" }}>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "1.3rem", fontWeight: 700, color }}>
          {area.toFixed(3)}
        </span>
        <span style={{ fontSize: "0.7rem", color: "oklch(0.50 0.015 230)" }}>m²</span>
      </div>
      <div style={{ fontSize: "0.72rem", color: "oklch(0.75 0.01 220)", fontFamily: "JetBrains Mono, monospace", marginBottom: "0.3rem" }}>
        {size}
      </div>
      <div style={{ fontSize: "0.65rem", color: "oklch(0.45 0.015 230)" }}>{note}</div>
    </div>
  );
}

function InputField({ label, value, onChange, unit }: {
  label: string; value: number; onChange: (v: number) => void; unit: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type="number" min={0} step={10}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          style={{ ...inputStyle, paddingRight: "2.5rem" }}
        />
        <span style={{
          position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)",
          fontSize: "0.65rem", color: "oklch(0.45 0.015 230)", pointerEvents: "none",
        }}>{unit}</span>
      </div>
    </div>
  );
}

function SmallInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label style={{ ...labelStyle, fontSize: "0.58rem" }}>{label}</label>
      <input
        type="number" min={0} step={0.5}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        style={{ ...inputStyle, padding: "0.3rem 0.4rem", fontSize: "0.75rem" }}
      />
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
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "1.3rem", fontWeight: 700, color }}>{value}</span>
        <span style={{ fontSize: "0.7rem", color: "oklch(0.50 0.015 230)", textTransform: "uppercase" }}>{unit}</span>
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
