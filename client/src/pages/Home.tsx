import { useState } from "react";
import ProjectHeader from "@/components/ProjectHeader";
import GenSizingModule from "@/components/GenSizingModule";
import VoltageDipModule from "@/components/VoltageDipModule";
import FuelConsumptionModule from "@/components/FuelConsumptionModule";
import AtsModule from "@/components/AtsModule";
import VentilationModule from "@/components/VentilationModule";
import SessionHistory from "@/components/SessionHistory";
import StandardsPanel from "@/components/StandardsPanel";
import ExportPanel from "@/components/ExportPanel";
import type { ProjectInfo } from "@/types/project";
import {
  Zap, Gauge, Fuel, ArrowLeftRight, Wind,
  History, BookOpen, FileDown, Menu, X,
} from "lucide-react";

type TabId =
  | "gen-sizing"
  | "voltage-dip"
  | "fuel"
  | "ats"
  | "ventilation"
  | "history"
  | "standards"
  | "export";

interface Tab {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  color: string;
}

const TABS: Tab[] = [
  { id: "gen-sizing",   label: "Generator kVA Sizing",   shortLabel: "kVA Sizing",   icon: <Zap size={15} />,          color: "oklch(0.62 0.18 220)" },
  { id: "voltage-dip",  label: "Voltage Dip Calculator", shortLabel: "Voltage Dip",  icon: <Gauge size={15} />,        color: "oklch(0.72 0.18 75)" },
  { id: "fuel",         label: "Fuel Consumption",       shortLabel: "Fuel",         icon: <Fuel size={15} />,         color: "oklch(0.72 0.18 75)" },
  { id: "ats",          label: "ATS / Change-Over",      shortLabel: "ATS",          icon: <ArrowLeftRight size={15} />, color: "oklch(0.65 0.15 280)" },
  { id: "ventilation",  label: "Room Ventilation",       shortLabel: "Ventilation",  icon: <Wind size={15} />,         color: "oklch(0.60 0.18 145)" },
  { id: "history",      label: "Session History",        shortLabel: "History",      icon: <History size={15} />,      color: "oklch(0.55 0.015 230)" },
  { id: "standards",    label: "Standards Reference",    shortLabel: "Standards",    icon: <BookOpen size={15} />,     color: "oklch(0.55 0.015 230)" },
  { id: "export",       label: "Export",                 shortLabel: "Export",       icon: <FileDown size={15} />,     color: "oklch(0.55 0.015 230)" },
];

const today = new Date().toISOString().split("T")[0];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("gen-sizing");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({
    projectName: "",
    engineerName: "",
    projectRef: "",
    date: today,
  });

  const switchToModule = (moduleType: string) => {
    const tab = TABS.find(t => t.id === moduleType);
    if (tab) setActiveTab(tab.id);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "oklch(0.13 0.02 248)",
      color: "oklch(0.93 0.01 220)",
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* ── Top Bar ── */}
      <header style={{
        background: "oklch(0.15 0.025 248)",
        borderBottom: "1px solid oklch(0.25 0.03 248)",
        padding: "0 1.25rem",
        height: 52,
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        position: "sticky",
        top: 0,
        zIndex: 100,
        flexShrink: 0,
      }}>
        {/* Sidebar toggle */}
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{
            background: "transparent", border: "none", cursor: "pointer",
            color: "oklch(0.55 0.015 230)", padding: "0.25rem",
            display: "flex", alignItems: "center",
          }}
        >
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: "oklch(0.62 0.18 220)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Zap size={15} color="white" />
          </div>
          <div>
            <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "oklch(0.95 0.01 220)" }}>
              GenSizer Pro
            </span>
            <span style={{
              marginLeft: "0.5rem",
              fontSize: "0.6rem", color: "oklch(0.45 0.015 230)",
              textTransform: "uppercase", letterSpacing: "0.1em",
            }}>
              Generator Sizing Tool
            </span>
          </div>
        </div>

        {/* Active module indicator */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {(() => {
            const tab = TABS.find(t => t.id === activeTab);
            if (!tab) return null;
            return (
              <span style={{
                display: "flex", alignItems: "center", gap: "0.3rem",
                padding: "0.2rem 0.6rem", borderRadius: 5,
                fontSize: "0.68rem", fontWeight: 600,
                background: `${tab.color.replace(")", " / 0.12)")}`,
                color: tab.color,
                border: `1px solid ${tab.color.replace(")", " / 0.25)")}`,
              }}>
                {tab.icon} {tab.label}
              </span>
            );
          })()}
          <span style={{
            fontSize: "0.65rem", color: "oklch(0.40 0.015 230)",
            fontFamily: "JetBrains Mono, monospace",
          }}>
            IEC 60034 · ISO 8528 · IEC 60364
          </span>
        </div>
      </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* ── Sidebar ── */}
        {sidebarOpen && (
          <aside style={{
            width: 220,
            background: "oklch(0.15 0.025 248)",
            borderRight: "1px solid oklch(0.25 0.03 248)",
            display: "flex",
            flexDirection: "column",
            flexShrink: 0,
            overflowY: "auto",
          }}>
            {/* Modules section */}
            <div style={{ padding: "1rem 0.75rem 0.5rem" }}>
              <div style={{
                fontSize: "0.58rem", fontWeight: 700,
                color: "oklch(0.40 0.015 230)",
                textTransform: "uppercase", letterSpacing: "0.1em",
                marginBottom: "0.5rem", paddingLeft: "0.5rem",
              }}>
                Calculator Modules
              </div>
              {TABS.slice(0, 5).map(tab => (
                <SidebarItem
                  key={tab.id}
                  tab={tab}
                  active={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                />
              ))}
            </div>

            <div style={{ height: 1, background: "oklch(0.25 0.03 248)", margin: "0.25rem 0.75rem" }} />

            {/* Tools section */}
            <div style={{ padding: "0.5rem 0.75rem" }}>
              <div style={{
                fontSize: "0.58rem", fontWeight: 700,
                color: "oklch(0.40 0.015 230)",
                textTransform: "uppercase", letterSpacing: "0.1em",
                marginBottom: "0.5rem", paddingLeft: "0.5rem",
              }}>
                Tools & Reference
              </div>
              {TABS.slice(5).map(tab => (
                <SidebarItem
                  key={tab.id}
                  tab={tab}
                  active={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                />
              ))}
            </div>

            {/* Standards footer */}
            <div style={{
              marginTop: "auto",
              padding: "0.75rem",
              borderTop: "1px solid oklch(0.22 0.025 248)",
            }}>
              <div style={{ fontSize: "0.6rem", color: "oklch(0.35 0.015 230)", lineHeight: 1.8, textAlign: "center" }}>
                IEC 60034 · ISO 8528<br />IEC 60364 · SEC Standards<br />
                <span style={{ color: "oklch(0.30 0.015 230)" }}>v1.0 — MEP Engineering</span>
              </div>
            </div>
          </aside>
        )}

        {/* ── Main Content ── */}
        <main style={{ flex: 1, overflow: "auto", padding: "1.25rem" }}>
          {/* Project Header */}
          <div style={{ marginBottom: "1.25rem" }}>
            <ProjectHeader info={projectInfo} onChange={setProjectInfo} />
          </div>

          {/* Module Content */}
          {activeTab === "gen-sizing"  && <GenSizingModule projectInfo={projectInfo} />}
          {activeTab === "voltage-dip" && <VoltageDipModule projectInfo={projectInfo} />}
          {activeTab === "fuel"        && <FuelConsumptionModule projectInfo={projectInfo} />}
          {activeTab === "ats"         && <AtsModule projectInfo={projectInfo} />}
          {activeTab === "ventilation" && <VentilationModule projectInfo={projectInfo} />}
          {activeTab === "history"     && <SessionHistory onLoadSession={switchToModule} />}
          {activeTab === "standards"   && <StandardsPanel />}
          {activeTab === "export"      && <ExportPanel projectInfo={projectInfo} />}
        </main>
      </div>
    </div>
  );
}

// ── Sidebar Item ─────────────────────────────────────────────

function SidebarItem({ tab, active, onClick }: { tab: Tab; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        display: "flex", alignItems: "center", gap: "0.6rem",
        padding: "0.5rem 0.6rem",
        borderRadius: 6,
        border: "none",
        background: active ? `${tab.color.replace(")", " / 0.12)")}` : "transparent",
        color: active ? tab.color : "oklch(0.60 0.015 230)",
        cursor: "pointer",
        fontSize: "0.78rem",
        fontWeight: active ? 600 : 400,
        textAlign: "left",
        transition: "all 0.15s",
        borderLeft: active ? `2px solid ${tab.color}` : "2px solid transparent",
        marginBottom: "0.15rem",
      }}
    >
      <span style={{ opacity: active ? 1 : 0.7, flexShrink: 0 }}>{tab.icon}</span>
      {tab.label}
    </button>
  );
}
