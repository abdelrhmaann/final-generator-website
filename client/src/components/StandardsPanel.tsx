import { useState } from "react";
import { BookOpen, ChevronDown, ChevronRight } from "lucide-react";
import { STANDARD_KVA_SERIES, XD_BY_KVA, SFC_CURVE } from "../../../shared/genCalc";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";

const STANDARDS = [
  {
    code: "IEC 60034",
    title: "Rotating Electrical Machines",
    scope: "Covers performance requirements for rotating machines including generators. Defines voltage dip limits and machine parameters such as subtransient reactance X\"d.",
    keyPoints: [
      "Voltage dip limit: <15% for general loads",
      "Voltage dip limit: <10% for sensitive loads (UPS, medical, IT)",
      "Defines X\"d (subtransient reactance) for transient analysis",
      "Motor starting current and power factor requirements",
      "Temperature rise classification (Class B, F, H)",
    ],
  },
  {
    code: "ISO 8528",
    title: "Reciprocating Internal Combustion Engine Driven Alternating Current Generating Sets",
    scope: "Multi-part standard governing the design, testing, and performance of generator sets. Covers rating, performance, fuel consumption, and installation requirements.",
    keyPoints: [
      "Part 1: Application, ratings and performance",
      "Part 3: Alternating current generators for generating sets",
      "Part 4: Controlgear and switchgear (ATS requirements)",
      "Part 5: Generating sets — performance requirements and test methods",
      "Part 13: Safety requirements for generating sets",
      "Standard kVA ratings and derating factors",
      "Fuel consumption measurement and SFC curves",
      "Room ventilation requirements (ΔT ≤ 10°C)",
    ],
  },
  {
    code: "IEC 60364",
    title: "Low-Voltage Electrical Installations",
    scope: "Governs design, installation, and protection of low-voltage electrical systems. Relevant for standby power connections, ATS sizing, and protection coordination.",
    keyPoints: [
      "Part 5-55: Standby power sources",
      "ATS selection and installation requirements",
      "Protection against overcurrent and fault conditions",
      "Cable sizing for generator circuits",
      "Earthing and bonding requirements for standby systems",
      "Discrimination between mains and generator protection",
    ],
  },
  {
    code: "SEC Standards",
    title: "Saudi Electricity Company — Standby Power Requirements",
    scope: "Saudi Electricity Company requirements for standby and emergency power systems in buildings connected to the SEC grid.",
    keyPoints: [
      "Mandatory standby power for critical loads (hospitals, high-rise, data centres)",
      "Generator sizing: minimum 100% of critical load kVA",
      "Fuel storage: minimum 8-hour autonomy at full load",
      "ATS transfer time: ≤10 seconds for life safety loads",
      "Metering and protection requirements for generator output",
      "Noise limits for generator installations in urban areas",
      "Exhaust emission requirements (Tier 3 / equivalent)",
    ],
  },
];

export default function StandardsPanel() {
  const [openStandard, setOpenStandard] = useState<string | null>("IEC 60034");

  const sfcChartData = SFC_CURVE.map(pt => ({
    load: `${(pt.loadFactor * 100).toFixed(0)}%`,
    sfc: pt.lPerKwh,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <div style={{
          width: 36, height: 36, borderRadius: 8,
          background: "oklch(0.62 0.18 220 / 0.15)",
          border: "1px solid oklch(0.62 0.18 220 / 0.3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "oklch(0.62 0.18 220)",
        }}>
          <BookOpen size={16} />
        </div>
        <div>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "oklch(0.93 0.01 220)", margin: 0 }}>
            Standards Reference
          </h2>
          <p style={{ fontSize: "0.68rem", color: "oklch(0.50 0.015 230)", margin: 0 }}>
            IEC 60034 · ISO 8528 · IEC 60364 · SEC Requirements
          </p>
        </div>
      </div>

      {/* Standards accordion */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {STANDARDS.map(std => {
          const isOpen = openStandard === std.code;
          return (
            <div key={std.code} style={{
              background: "oklch(0.17 0.025 248)",
              border: `1px solid ${isOpen ? "oklch(0.62 0.18 220 / 0.35)" : "oklch(0.28 0.03 248)"}`,
              borderRadius: 8, overflow: "hidden",
            }}>
              <button
                onClick={() => setOpenStandard(isOpen ? null : std.code)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "0.75rem",
                  padding: "0.875rem 1rem", background: "none", border: "none", cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{
                  padding: "0.2rem 0.6rem", borderRadius: 4,
                  fontSize: "0.68rem", fontWeight: 700,
                  background: isOpen ? "oklch(0.62 0.18 220 / 0.15)" : "oklch(0.22 0.03 248)",
                  color: isOpen ? "oklch(0.62 0.18 220)" : "oklch(0.55 0.015 230)",
                  border: `1px solid ${isOpen ? "oklch(0.62 0.18 220 / 0.3)" : "oklch(0.28 0.03 248)"}`,
                  fontFamily: "JetBrains Mono, monospace", whiteSpace: "nowrap",
                }}>
                  {std.code}
                </span>
                <span style={{ flex: 1, fontSize: "0.82rem", fontWeight: 500, color: "oklch(0.85 0.01 220)" }}>
                  {std.title}
                </span>
                {isOpen ? <ChevronDown size={14} style={{ color: "oklch(0.62 0.18 220)" }} /> : <ChevronRight size={14} style={{ color: "oklch(0.45 0.015 230)" }} />}
              </button>

              {isOpen && (
                <div style={{ padding: "0 1rem 1rem", borderTop: "1px solid oklch(0.25 0.03 248)" }}>
                  <p style={{ fontSize: "0.75rem", color: "oklch(0.65 0.01 220)", lineHeight: 1.7, marginTop: "0.75rem", marginBottom: "0.75rem" }}>
                    {std.scope}
                  </p>
                  <div style={{ fontSize: "0.62rem", color: "oklch(0.50 0.015 230)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>
                    Key Requirements
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    {std.keyPoints.map((pt, i) => (
                      <li key={i} style={{ fontSize: "0.75rem", color: "oklch(0.75 0.01 220)", lineHeight: 1.5 }}>{pt}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reference Tables */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        {/* kVA Series */}
        <div className="engineering-card">
          <span className="section-label" style={{ display: "block", marginBottom: "0.75rem" }}>
            Standard Generator kVA Series (ISO 8528)
          </span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
            {STANDARD_KVA_SERIES.map(kva => (
              <span key={kva} style={{
                padding: "0.25rem 0.6rem", borderRadius: 4,
                fontSize: "0.72rem", fontFamily: "JetBrains Mono, monospace",
                background: "oklch(0.22 0.03 248)",
                color: "oklch(0.75 0.01 220)",
                border: "1px solid oklch(0.28 0.03 248)",
              }}>
                {kva}
              </span>
            ))}
          </div>
          <p style={{ fontSize: "0.65rem", color: "oklch(0.40 0.015 230)", marginTop: "0.5rem" }}>
            Range: 20 kVA to 2250 kVA. Values in kVA.
          </p>
        </div>

        {/* SFC Table */}
        <div className="engineering-card">
          <span className="section-label" style={{ display: "block", marginBottom: "0.75rem" }}>
            Diesel SFC Reference Values
          </span>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid oklch(0.28 0.03 248)" }}>
                <th style={thStyle}>Load Factor</th>
                <th style={thStyle}>SFC (L/kWh)</th>
                <th style={thStyle}>Description</th>
              </tr>
            </thead>
            <tbody>
              {SFC_CURVE.map(pt => (
                <tr key={pt.loadFactor} style={{ borderBottom: "1px solid oklch(0.22 0.025 248)" }}>
                  <td style={tdStyle}>{(pt.loadFactor * 100).toFixed(0)}%</td>
                  <td style={{ ...tdStyle, color: "oklch(0.72 0.18 75)", fontWeight: 600 }}>{pt.lPerKwh}</td>
                  <td style={{ ...tdStyle, color: "oklch(0.55 0.015 230)" }}>
                    {pt.loadFactor === 0.25 ? "Light load" : pt.loadFactor === 0.50 ? "Half load" : pt.loadFactor === 0.75 ? "Recommended operating point" : "Full load (rated)"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: "0.65rem", color: "oklch(0.40 0.015 230)", marginTop: "0.5rem" }}>
            Standard specific fuel consumption for diesel generators. Interpolated for intermediate values.
          </p>
        </div>
      </div>

      {/* X"d Table */}
      <div className="engineering-card">
        <span className="section-label" style={{ display: "block", marginBottom: "0.75rem" }}>
          Standard Subtransient Reactance X"d by Generator Size (ISO 8528 / Manufacturer Data)
        </span>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.72rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid oklch(0.28 0.03 248)" }}>
                <th style={thStyle}>kVA</th>
                {XD_BY_KVA.map(e => (
                  <th key={e.kva} style={{ ...thStyle, fontFamily: "JetBrains Mono, monospace" }}>{e.kva}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ ...tdStyle, color: "oklch(0.55 0.015 230)", fontWeight: 600 }}>X"d (%)</td>
                {XD_BY_KVA.map(e => (
                  <td key={e.kva} style={{ ...tdStyle, color: "oklch(0.72 0.18 75)", fontFamily: "JetBrains Mono, monospace" }}>
                    {e.xd}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: "0.65rem", color: "oklch(0.40 0.015 230)", marginTop: "0.5rem" }}>
          X"d used in voltage dip formula: Vdip% = Sm / (Sg/X"d + Sm) × 100. Higher X"d → larger voltage dip for same motor starting kVA.
        </p>
      </div>

      {/* SFC Chart */}
      <div className="engineering-card">
        <span className="section-label" style={{ display: "block", marginBottom: "0.75rem" }}>
          Diesel SFC Curve Visualization
        </span>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={sfcChartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.28 0.03 248)" />
            <XAxis dataKey="load" tick={{ fill: "oklch(0.55 0.015 230)", fontSize: 11 }} axisLine={{ stroke: "oklch(0.28 0.03 248)" }} tickLine={false} />
            <YAxis domain={[0.25, 0.45]} tick={{ fill: "oklch(0.55 0.015 230)", fontSize: 11 }} axisLine={{ stroke: "oklch(0.28 0.03 248)" }} tickLine={false}
              label={{ value: "L/kWh", angle: -90, position: "insideLeft", fill: "oklch(0.45 0.015 230)", fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: "oklch(0.17 0.025 248)", border: "1px solid oklch(0.28 0.03 248)", borderRadius: 6, fontSize: "0.72rem", color: "oklch(0.93 0.01 220)" }}
              formatter={(v: number) => [`${v} L/kWh`, "SFC"]}
            />
            <Line type="monotone" dataKey="sfc" stroke="oklch(0.72 0.18 75)" strokeWidth={2.5}
              dot={{ fill: "oklch(0.72 0.18 75)", r: 5, stroke: "oklch(0.17 0.025 248)", strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "0.4rem 0.5rem", textAlign: "center",
  color: "oklch(0.45 0.015 230)", fontWeight: 600,
  fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.06em",
};
const tdStyle: React.CSSProperties = {
  padding: "0.35rem 0.5rem", textAlign: "center",
  fontFamily: "JetBrains Mono, monospace", fontSize: "0.72rem",
  color: "oklch(0.80 0.01 220)",
};
