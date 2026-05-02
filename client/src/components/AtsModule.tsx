import { useState } from "react";
import { calcAtsSizing, ATS_RATING_SERIES, type AtsInput, type AtsResult } from "../../../shared/genCalc";
import type { ProjectInfo } from "@/types/project";
import { ArrowLeftRight, CheckCircle, Info } from "lucide-react";
import { saveSession } from "@/lib/sessionStore";

interface Props { projectInfo: ProjectInfo; }

export default function AtsModule({ projectInfo }: Props) {
  const [input, setInput] = useState<AtsInput>({ generatorKva: 500, loadCurrentA: 600, voltageV: 415 });
  const [result, setResult] = useState<AtsResult | null>(null);

  const calculate = () => {
    const r = calcAtsSizing(input);
    setResult(r);
    saveSession({ moduleType: "ats", projectInfo, inputData: input, resultData: r });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: "oklch(0.65 0.15 280 / 0.15)",
          border: "1px solid oklch(0.65 0.15 280 / 0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "oklch(0.65 0.15 280)",
        }}>
          <ArrowLeftRight size={16} />
        </div>
        <div>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "oklch(0.93 0.01 220)", margin: 0 }}>
            ATS / Change-Over Sizing
          </h2>
          <p style={{ fontSize: "0.68rem", color: "oklch(0.50 0.015 230)", margin: 0 }}>
            Automatic Transfer Switch — IEC 60364 / ISO 8528-4
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
            <InputField label="Generator Rating (kVA)" value={input.generatorKva}
              onChange={v => setInput(p => ({ ...p, generatorKva: v }))} unit="kVA" />
            <InputField label="Load Current (A)" value={input.loadCurrentA}
              onChange={v => setInput(p => ({ ...p, loadCurrentA: v }))} unit="A" />
            <InputField label="System Voltage (V)" value={input.voltageV}
              onChange={v => setInput(p => ({ ...p, voltageV: v }))} unit="V"
              hint="Typical: 415V (3-phase), 230V (1-phase)" />

            <button onClick={calculate} style={{
              background: "oklch(0.65 0.15 280)", color: "white",
              border: "none", borderRadius: 6, padding: "0.5rem",
              fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
            }}>
              <ArrowLeftRight size={14} /> Size ATS
            </button>
          </div>

          {/* Standards note */}
          <div style={{ marginTop: "1rem", padding: "0.75rem", background: "oklch(0.20 0.025 248)", borderRadius: 6 }}>
            <div style={{ fontSize: "0.6rem", color: "oklch(0.50 0.015 230)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>
              Design Basis
            </div>
            <ul style={{ fontSize: "0.68rem", color: "oklch(0.60 0.015 230)", margin: 0, paddingLeft: "1rem", lineHeight: 2 }}>
              <li>125% safety factor on design current</li>
              <li>Open transition: standard standby</li>
              <li>Closed transition: ≥500 kVA generators</li>
              <li>Motorized ATS: per ISO 8528-4</li>
            </ul>
          </div>
        </div>

        {/* Results */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {result ? (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <ResultCard label="Generator Full Load Current" value={result.fullLoadCurrentA.toFixed(1)} unit="A" color="oklch(0.62 0.18 220)" />
                <ResultCard label="Recommended ATS Rating" value={result.recommendedAtsRatingA.toString()} unit="A" color="oklch(0.65 0.15 280)" highlight />
              </div>

              <div className="engineering-card">
                <span className="section-label" style={{ display: "block", marginBottom: "0.75rem" }}>
                  ATS Specification
                </span>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <SpecRow icon="⚡" label="ATS Type" value={result.atsType}
                    color={result.atsType.includes("Closed") ? "oklch(0.72 0.18 75)" : "oklch(0.62 0.18 220)"} />
                  <SpecRow icon="🔄" label="Changeover Type" value={result.changeoverType} color="oklch(0.65 0.15 280)" />
                  <SpecRow icon="📊" label="Rated Current" value={`${result.recommendedAtsRatingA} A`} color="oklch(0.60 0.18 145)" />
                  <SpecRow icon="⚙️" label="Design Current (×1.25)" value={`${(Math.max(result.fullLoadCurrentA, input.loadCurrentA) * 1.25).toFixed(1)} A`} color="oklch(0.55 0.015 230)" />
                </div>
              </div>

              <div style={{
                padding: "0.875rem", borderRadius: 8,
                background: "oklch(0.62 0.18 220 / 0.06)",
                border: "1px solid oklch(0.62 0.18 220 / 0.2)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem", color: "oklch(0.62 0.18 220)", fontSize: "0.72rem", fontWeight: 600 }}>
                  <Info size={13} /> Engineering Notes
                </div>
                <p style={{ fontSize: "0.72rem", color: "oklch(0.70 0.01 220)", margin: 0, lineHeight: 1.7 }}>
                  {result.notes}
                </p>
              </div>

              {/* ATS Rating Series */}
              <div className="engineering-card">
                <span className="section-label" style={{ display: "block", marginBottom: "0.5rem" }}>
                  Standard ATS Rating Series (A)
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                  {ATS_RATING_SERIES.map(r => (
                    <span key={r} style={{
                      padding: "0.2rem 0.5rem", borderRadius: 4,
                      fontSize: "0.7rem", fontFamily: "JetBrains Mono, monospace",
                      background: r === result.recommendedAtsRatingA ? "oklch(0.65 0.15 280 / 0.2)" : "oklch(0.22 0.03 248)",
                      color: r === result.recommendedAtsRatingA ? "oklch(0.75 0.15 280)" : "oklch(0.60 0.01 220)",
                      border: r === result.recommendedAtsRatingA ? "1px solid oklch(0.65 0.15 280 / 0.4)" : "1px solid oklch(0.28 0.03 248)",
                      fontWeight: r === result.recommendedAtsRatingA ? 700 : 400,
                    }}>
                      {r}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <EmptyState icon={<ArrowLeftRight size={48} strokeWidth={1} />} text="Enter parameters and click Size ATS to see recommendations" />
          )}
        </div>
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, unit, hint }: {
  label: string; value: number; onChange: (v: number) => void; unit: string; hint?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          type="number" min={0} step={1}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          style={{ ...inputStyle, paddingRight: "2.5rem" }}
        />
        <span style={{
          position: "absolute", right: "0.6rem", top: "50%", transform: "translateY(-50%)",
          fontSize: "0.65rem", color: "oklch(0.45 0.015 230)", pointerEvents: "none",
        }}>{unit}</span>
      </div>
      {hint && <p style={hintStyle}>{hint}</p>}
    </div>
  );
}

function SpecRow({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0.5rem 0.75rem", borderRadius: 6,
      background: "oklch(0.20 0.025 248)",
      border: "1px solid oklch(0.25 0.03 248)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "1rem" }}>{icon}</span>
        <span style={{ fontSize: "0.72rem", color: "oklch(0.55 0.015 230)" }}>{label}</span>
      </div>
      <span style={{ fontSize: "0.8rem", fontWeight: 600, color }}>{value}</span>
    </div>
  );
}

function ResultCard({ label, value, unit, color, highlight }: {
  label: string; value: string; unit: string; color: string; highlight?: boolean;
}) {
  return (
    <div style={{
      background: highlight ? `${color.replace(")", " / 0.08)")}` : "oklch(0.17 0.025 248)",
      border: `1px solid ${highlight ? color.replace(")", " / 0.3)") : "oklch(0.28 0.03 248)"}`,
      borderRadius: 8, padding: "0.875rem",
    }}>
      <div style={{ fontSize: "0.62rem", color: "oklch(0.50 0.015 230)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.3rem" }}>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "1.5rem", fontWeight: 700, color }}>{value}</span>
        <span style={{ fontSize: "0.7rem", color: "oklch(0.50 0.015 230)", textTransform: "uppercase" }}>{unit}</span>
      </div>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", gap: "0.75rem", color: "oklch(0.40 0.015 230)",
      padding: "3rem",
    }}>
      {icon}
      <p style={{ fontSize: "0.8rem", textAlign: "center" }}>{text}</p>
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
