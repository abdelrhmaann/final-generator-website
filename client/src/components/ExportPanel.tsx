import { useState } from "react";
import { FileDown, FileText, Table, CheckCircle, AlertCircle } from "lucide-react";
import { getSessions, type SessionEntry } from "@/lib/sessionStore";
import type { ProjectInfo } from "@/types/project";

interface Props { projectInfo: ProjectInfo; }

// Helper to format parameter names and values for PDF
function formatParamName(key: string): string {
  const labels: Record<string, string> = {
    // Generator Sizing
    "stepKw": "Running Load (kW)",
    "stepKva": "Apparent Load (kVA)",
    "stepPf": "Power Factor",
    "stepLoadType": "Load Type",
    "startingKvaMultiplier": "Starting kVA Multiplier",
    "cumulativeKw": "Cumulative Running Load (kW)",
    "cumulativeRunningKva": "Cumulative Running Load (kVA)",
    "startingKva": "Starting Surge (kVA)",
    "peakKvaAtThisStep": "Peak kVA at This Step",
    "totalRunningKw": "Total Running Load (kW)",
    "totalRunningKva": "Total Running Load (kVA)",
    "maxStartingKva": "Maximum Starting Surge (kVA)",
    "maxPeakKva": "Maximum Peak Demand (kVA)",
    "requiredGenKva": "Required Generator kVA",
    "recommendedGenKva": "Recommended Standard Size (kVA)",
    "loadingPercent": "Generator Loading (%)",
    
    // Voltage Dip
    "generatorKva": "Generator Rating (kVA)",
    "xdPercent": "Subtransient Reactance X\"d (%)",
    "motorStartingKva": "Motor Starting kVA",
    "loadType": "Load Type",
    "voltageDipPercent": "Voltage Dip (%)",
    "passGeneral": "IEC General Loads (<15%)",
    "passSensitive": "IEC Sensitive Loads (<10%)",
    "recommendation": "Recommendation",
    
    // Fuel Consumption
    "generatorKw": "Generator Output (kW)",
    "loadFactorPercent": "Load Factor (%)",
    "sfcPerKwh": "Specific Fuel Consumption (L/kWh)",
    "consumptionPerHr": "Fuel Consumption (L/hr)",
    "tank8hr": "8-Hour Tank Capacity (L)",
    "tank24hr": "24-Hour Tank Capacity (L)",
    "tank72hr": "72-Hour Tank Capacity (L)",
    
    // ATS Sizing
    "loadCurrentA": "Load Current (A)",
    "systemVoltage": "System Voltage (V)",
    "fullLoadCurrentA": "Full Load Current (A)",
    "designCurrentA": "Design Current with Margin (A)",
    "recommendedAtsRating": "Recommended ATS Rating (A)",
    "atsType": "ATS Type",
    "changeoverType": "Changeover Type",
    
    // Ventilation
    "roomL": "Room Length (m)",
    "roomW": "Room Width (m)",
    "roomH": "Room Height (m)",
    "heatRejectionKw": "Heat Rejection (kW)",
    "requiredAirflowM3hr": "Required Airflow (m³/hr)",
    "inletLouverAreaM2": "Inlet Louver Area (m²)",
    "exhaustLouverAreaM2": "Exhaust Louver Area (m²)",
    "minRoomVolumeM3": "Minimum Room Volume (m³)",
    "actualRoomVolumeM3": "Actual Room Volume (m³)",
    "roomAdequate": "Room Dimensions Adequate",
    "recommendedInletSize": "Recommended Inlet Louver Size",
    "recommendedExhaustSize": "Recommended Exhaust Louver Size",
  };
  return labels[key] || key.replace(/([A-Z])/g, " $1").trim();
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    if (Number.isInteger(value)) return value.toString();
    return value.toFixed(4).replace(/\.?0+$/, "");
  }
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === "object") return "[Object]";
  return String(value);
}

// Format module-specific sections
function formatGenSizingSection(data: Record<string, unknown>): string[] {
  const lines: string[] = [];
  lines.push("GENERATOR kVA SIZING — STEP LOAD METHOD");
  lines.push("Methodology: IEC 60034 | ISO 8528");
  lines.push("");
  
  if (data.steps && Array.isArray(data.steps)) {
    lines.push("LOAD STEPS ANALYSIS:");
    (data.steps as any[]).forEach((step, i) => {
      lines.push(`Step ${i + 1}: ${step.name || "Load"}`);
      lines.push(`  • Running Load: ${step.stepKw} kW, ${step.stepKva} kVA (PF: ${step.stepPf})`);
      lines.push(`  • Load Type: ${step.stepLoadType}`);
      lines.push(`  • Starting Surge: ${step.startingKva} kVA (Multiplier: ${step.startingKvaMultiplier}x)`);
      lines.push(`  • Cumulative: ${step.cumulativeKw} kW, ${step.cumulativeRunningKva} kVA`);
      lines.push(`  • Peak Demand at This Step: ${step.peakKvaAtThisStep} kVA`);
      lines.push("");
    });
  }
  
  lines.push("FINAL SIZING RESULTS:");
  lines.push(`Total Running Load: ${data.totalRunningKw} kW, ${data.totalRunningKva} kVA`);
  lines.push(`Maximum Starting Surge: ${data.maxStartingKva} kVA`);
  lines.push(`Maximum Peak Demand: ${data.maxPeakKva} kVA`);
  lines.push(`Required Generator kVA: ${data.requiredGenKva} kVA (Governing Demand)`);
  lines.push(`Recommended Standard Size: ${data.recommendedGenKva} kVA`);
  lines.push(`Generator Loading: ${data.loadingPercent}%`);
  
  return lines;
}

function formatVoltageDipSection(data: Record<string, unknown>): string[] {
  const lines: string[] = [];
  lines.push("VOLTAGE DIP CALCULATION");
  lines.push("Methodology: IEC 60034 | Formula: Vdip% = (Sm / (Sg/X\"d + Sm)) × 100");
  lines.push("");
  lines.push("INPUT PARAMETERS:");
  lines.push(`Generator Rating: ${data.generatorKva} kVA`);
  lines.push(`Subtransient Reactance X"d: ${data.xdPercent}%`);
  lines.push(`Motor Starting kVA: ${data.motorStartingKva} kVA`);
  lines.push(`Load Type: ${data.loadType}`);
  lines.push("");
  lines.push("RESULTS:");
  lines.push(`Voltage Dip: ${data.voltageDipPercent}%`);
  lines.push(`IEC General Loads (<15%): ${data.passGeneral ? "PASS ✓" : "FAIL ✗"}`);
  lines.push(`IEC Sensitive Loads (<10%): ${data.passSensitive ? "PASS ✓" : "FAIL ✗"}`);
  lines.push(`Recommendation: ${data.recommendation}`);
  
  return lines;
}

function formatFuelSection(data: Record<string, unknown>): string[] {
  const lines: string[] = [];
  lines.push("FUEL CONSUMPTION ESTIMATION");
  lines.push("Methodology: ISO 8528 | Standard Diesel SFC Curve");
  lines.push("");
  lines.push("INPUT PARAMETERS:");
  lines.push(`Generator Output: ${data.generatorKw} kW`);
  lines.push(`Load Factor: ${data.loadFactorPercent}%`);
  lines.push("");
  lines.push("FUEL CONSUMPTION:");
  lines.push(`Specific Fuel Consumption (SFC): ${data.sfcPerKwh} L/kWh`);
  lines.push(`Consumption Rate: ${data.consumptionPerHr} L/hr`);
  lines.push("");
  lines.push("FUEL TANK SIZING:");
  lines.push(`8-Hour Autonomy: ${data.tank8hr} liters`);
  lines.push(`24-Hour Autonomy: ${data.tank24hr} liters`);
  lines.push(`72-Hour Autonomy: ${data.tank72hr} liters`);
  
  return lines;
}

function formatAtsSection(data: Record<string, unknown>): string[] {
  const lines: string[] = [];
  lines.push("ATS / CHANGEOVER SIZING");
  lines.push("Methodology: IEC 60364 | ISO 8528-4");
  lines.push("");
  lines.push("INPUT PARAMETERS:");
  lines.push(`Generator Rating: ${data.generatorKva} kVA`);
  lines.push(`Load Current: ${data.loadCurrentA} A`);
  lines.push(`System Voltage: ${data.systemVoltage} V`);
  lines.push("");
  lines.push("SIZING CALCULATIONS:");
  lines.push(`Full Load Current: ${data.fullLoadCurrentA} A`);
  lines.push(`Design Current (with 1.25 margin): ${data.designCurrentA} A`);
  lines.push("");
  lines.push("RECOMMENDATIONS:");
  lines.push(`Recommended ATS Rating: ${data.recommendedAtsRating} A`);
  lines.push(`ATS Type: ${data.atsType}`);
  lines.push(`Changeover Type: ${data.changeoverType}`);
  
  return lines;
}

function formatVentilationSection(data: Record<string, unknown>): string[] {
  const lines: string[] = [];
  lines.push("GENERATOR ROOM VENTILATION");
  lines.push("Methodology: ISO 8528-13 | Heat Rejection & Airflow Calculation");
  lines.push("");
  lines.push("INPUT PARAMETERS:");
  lines.push(`Generator Output: ${data.generatorKw} kW`);
  lines.push(`Room Dimensions: ${data.roomL} m (L) × ${data.roomW} m (W) × ${data.roomH} m (H)`);
  lines.push("");
  lines.push("CALCULATIONS:");
  lines.push(`Heat Rejection: ${data.heatRejectionKw} kW (30% of rated kW)`);
  lines.push(`Required Airflow: ${data.requiredAirflowM3hr} m³/hr`);
  lines.push(`Inlet Louver Area: ${data.inletLouverAreaM2} m²`);
  lines.push(`Exhaust Louver Area: ${data.exhaustLouverAreaM2} m²`);
  lines.push("");
  lines.push("ROOM ADEQUACY CHECK:");
  lines.push(`Minimum Room Volume: ${data.minRoomVolumeM3} m³`);
  lines.push(`Actual Room Volume: ${data.actualRoomVolumeM3} m³`);
  lines.push(`Room Dimensions Adequate: ${data.roomAdequate ? "YES ✓" : "NO ✗"}`);
  lines.push("");
  lines.push("LOUVER SIZING RECOMMENDATIONS:");
  lines.push(`Inlet Louver Size: ${data.recommendedInletSize}`);
  lines.push(`Exhaust Louver Size: ${data.recommendedExhaustSize}`);
  
  return lines;
}

export default function ExportPanel({ projectInfo }: Props) {
  const [exporting, setExporting] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const sessions = getSessions();

  const exportPdf = async () => {
    setExporting("pdf");
    setStatus(null);
    try {
      const { default: jsPDF } = await import("jspdf");

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      let y = 15;

      // ── TITLE PAGE ──
      doc.setFillColor(13, 27, 52);
      doc.rect(0, 0, pageW, 50, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("GenSizer Pro", 15, 20);

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("Generator Sizing Calculation Report", 15, 30);

      doc.setFontSize(9);
      doc.setTextColor(180, 200, 220);
      doc.text("IEC 60034 | ISO 8528 | IEC 60364 | SEC Standards", 15, 38);

      // Project Info
      y = 65;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("PROJECT INFORMATION", 15, y);
      y += 8;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Project Name: ${projectInfo.projectName || "—"}`, 15, y);
      y += 6;
      doc.text(`Engineer: ${projectInfo.engineerName || "—"}`, 15, y);
      y += 6;
      doc.text(`Reference: ${projectInfo.projectRef || "—"}`, 15, y);
      y += 6;
      doc.text(`Date: ${projectInfo.date || new Date().toLocaleDateString()}`, 15, y);
      y += 6;
      doc.text(`Report Generated: ${new Date().toLocaleString()}`, 15, y);

      // Standards & Methodology
      y += 12;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("APPLICABLE STANDARDS", 15, y);
      y += 8;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const standards = [
        "IEC 60034: Rotating Electrical Machines — Voltage dip limits and machine parameters",
        "ISO 8528: Reciprocating Internal Combustion Engine Driven Alternating Current Generating Sets",
        "IEC 60364: Low-Voltage Electrical Installations — Design and protection requirements",
        "SEC Standards: Saudi Electricity Company — Standby Power Requirements",
      ];
      standards.forEach(std => {
        doc.text(`• ${std}`, 18, y, { maxWidth: pageW - 36 });
        y += 6;
      });

      // ── CALCULATION SECTIONS ──
      sessions.forEach((session, idx) => {
        if (y > pageH - 40) {
          doc.addPage();
          y = 15;
        }

        // Section header
        doc.setFillColor(20, 40, 80);
        doc.rect(10, y - 3, pageW - 20, 10, "F");
        doc.setTextColor(100, 180, 255);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`${idx + 1}. ${session.label}`, 15, y + 4);
        y += 12;

        // Format section based on module type
        let sectionLines: string[] = [];
        const data = session.resultData as Record<string, unknown>;

        if (session.moduleType === "gen-sizing") {
          sectionLines = formatGenSizingSection(data);
        } else if (session.moduleType === "voltage-dip") {
          sectionLines = formatVoltageDipSection(data);
        } else if (session.moduleType === "fuel") {
          sectionLines = formatFuelSection(data);
        } else if (session.moduleType === "ats") {
          sectionLines = formatAtsSection(data);
        } else if (session.moduleType === "ventilation") {
          sectionLines = formatVentilationSection(data);
        }

        // Add section text
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");

        sectionLines.forEach(line => {
          if (y > pageH - 15) {
            doc.addPage();
            y = 15;
          }

          if (line.startsWith("  •")) {
            doc.text(line, 20, y);
          } else if (line.includes(":") && !line.startsWith("•")) {
            doc.setFont("helvetica", "bold");
            const [key, value] = line.split(":");
            doc.text(`${key}:`, 15, y);
            doc.setFont("helvetica", "normal");
            doc.text(value.trim(), 80, y);
          } else if (line === "") {
            y += 2;
          } else {
            doc.setFont("helvetica", "bold");
            doc.text(line, 15, y);
            doc.setFont("helvetica", "normal");
          }
          y += 5;
        });

        y += 5;
      });

      // ── FOOTER ──
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(100, 120, 150);
        doc.text(
          `GenSizer Pro — Generator Sizing Report | Page ${i} of ${totalPages}`,
          15,
          pageH - 8
        );
        doc.text("IEC 60034 | ISO 8528 | IEC 60364", pageW - 60, pageH - 8);
      }

      const filename = `GenSizer_${(projectInfo.projectRef || "Report").replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(filename);
      setStatus({ type: "success", msg: `PDF exported: ${filename}` });
    } catch (err) {
      setStatus({ type: "error", msg: `PDF export failed: ${String(err)}` });
    } finally {
      setExporting(null);
    }
  };

  const exportExcel = async () => {
    setExporting("excel");
    setStatus(null);
    try {
      const XLSX = await import("xlsx");

      const wb = XLSX.utils.book_new();

      // Project info sheet
      const projData = [
        ["GenSizer Pro — Generator Sizing Report"],
        [],
        ["Project Name", projectInfo.projectName || ""],
        ["Engineer", projectInfo.engineerName || ""],
        ["Reference", projectInfo.projectRef || ""],
        ["Date", projectInfo.date || ""],
        ["Generated", new Date().toLocaleString()],
        [],
        ["Applicable Standards"],
        ["IEC 60034 - Rotating Electrical Machines"],
        ["ISO 8528 - Reciprocating Internal Combustion Engine Driven Generating Sets"],
        ["IEC 60364 - Low-Voltage Electrical Installations"],
        ["SEC Standards - Saudi Electricity Company Standby Power Requirements"],
      ];
      const projWs = XLSX.utils.aoa_to_sheet(projData);
      XLSX.utils.book_append_sheet(wb, projWs, "Project Info");

      // One sheet per session
      sessions.forEach((session, idx) => {
        const rows: (string | number | boolean)[][] = [
          [`${idx + 1}. ${session.label}`],
          ["Saved At", new Date(session.savedAt).toLocaleString()],
          ["Module Type", session.moduleType],
          [],
          ["=== INPUT PARAMETERS ==="],
        ];

        // Format inputs
        const inputs = session.inputData as Record<string, unknown>;
        Object.entries(inputs).forEach(([key, value]) => {
          rows.push([formatParamName(key), formatValue(value)]);
        });

        rows.push([]);
        rows.push(["=== CALCULATION RESULTS ==="], []);

        // Format results
        const results = session.resultData as Record<string, unknown>;
        Object.entries(results).forEach(([key, value]) => {
          rows.push([formatParamName(key), formatValue(value)]);
        });

        const ws = XLSX.utils.aoa_to_sheet(rows);
        const sheetName = `${idx + 1}_${session.moduleType}`.slice(0, 31);
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
      });

      const filename = `GenSizer_${(projectInfo.projectRef || "Export").replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
      setStatus({ type: "success", msg: `Excel exported: ${filename}` });
    } catch (err) {
      setStatus({ type: "error", msg: `Excel export failed: ${String(err)}` });
    } finally {
      setExporting(null);
    }
  };

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
          <FileDown size={16} />
        </div>
        <div>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "oklch(0.93 0.01 220)", margin: 0 }}>
            Export
          </h2>
          <p style={{ fontSize: "0.68rem", color: "oklch(0.50 0.015 230)", margin: 0 }}>
            Generate formal submittal reports and data exports
          </p>
        </div>
      </div>

      {status && (
        <div style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          padding: "0.75rem 1rem", borderRadius: 8,
          background: status.type === "success" ? "oklch(0.60 0.18 145 / 0.1)" : "oklch(0.55 0.22 25 / 0.1)",
          border: `1px solid ${status.type === "success" ? "oklch(0.60 0.18 145 / 0.3)" : "oklch(0.55 0.22 25 / 0.3)"}`,
          color: status.type === "success" ? "oklch(0.70 0.18 145)" : "oklch(0.70 0.22 25)",
          fontSize: "0.78rem",
        }}>
          {status.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
          {status.msg}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div className="engineering-card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <FileText size={20} style={{ color: "oklch(0.55 0.22 25)" }} />
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "oklch(0.93 0.01 220)" }}>PDF Report</div>
              <div style={{ fontSize: "0.65rem", color: "oklch(0.50 0.015 230)" }}>Formal submittal document</div>
            </div>
          </div>
          <p style={{ fontSize: "0.72rem", color: "oklch(0.60 0.015 230)", lineHeight: 1.6, marginBottom: "0.75rem" }}>
            Professional A4 PDF with project header, standards reference, calculation methodology, and detailed engineering results for formal submittals.
          </p>
          <button
            onClick={exportPdf}
            disabled={exporting === "pdf"}
            style={{
              width: "100%", padding: "0.5rem",
              background: sessions.length === 0 ? "oklch(0.25 0.03 248)" : "oklch(0.55 0.22 25)",
              color: sessions.length === 0 ? "oklch(0.45 0.015 230)" : "white",
              border: "none", borderRadius: 6,
              fontSize: "0.8rem", fontWeight: 600, cursor: sessions.length === 0 ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
              opacity: exporting === "pdf" ? 0.7 : 1,
            }}
          >
            <FileText size={14} />
            {exporting === "pdf" ? "Generating PDF..." : sessions.length === 0 ? "No calculations" : "Export PDF"}
          </button>
        </div>

        <div className="engineering-card">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <Table size={20} style={{ color: "oklch(0.60 0.18 145)" }} />
            <div>
              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "oklch(0.93 0.01 220)" }}>Excel Export</div>
              <div style={{ fontSize: "0.65rem", color: "oklch(0.50 0.015 230)" }}>Structured data workbook</div>
            </div>
          </div>
          <p style={{ fontSize: "0.72rem", color: "oklch(0.60 0.015 230)", lineHeight: 1.6, marginBottom: "0.75rem" }}>
            Excel workbook with project info, standards reference, and separate sheets for each calculation with formatted inputs and results.
          </p>
          <button
            onClick={exportExcel}
            disabled={exporting === "excel"}
            style={{
              width: "100%", padding: "0.5rem",
              background: sessions.length === 0 ? "oklch(0.25 0.03 248)" : "oklch(0.60 0.18 145)",
              color: sessions.length === 0 ? "oklch(0.45 0.015 230)" : "white",
              border: "none", borderRadius: 6,
              fontSize: "0.8rem", fontWeight: 600, cursor: sessions.length === 0 ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem",
              opacity: exporting === "excel" ? 0.7 : 1,
            }}
          >
            <Table size={14} />
            {exporting === "excel" ? "Generating Excel..." : sessions.length === 0 ? "No calculations" : "Export Excel"}
          </button>
        </div>
      </div>
    </div>
  );
}
