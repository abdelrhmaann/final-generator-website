import { useState, useEffect } from "react";
import { getSessions, deleteSession, clearSessions, type SessionEntry } from "@/lib/sessionStore";
import { History, Trash2, RefreshCw, ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  onLoadSession: (moduleType: string) => void;
}

const MODULE_COLORS: Record<string, string> = {
  "gen-sizing":  "oklch(0.62 0.18 220)",
  "voltage-dip": "oklch(0.72 0.18 75)",
  "fuel":        "oklch(0.72 0.18 75)",
  "ats":         "oklch(0.65 0.15 280)",
  "ventilation": "oklch(0.60 0.18 145)",
};

const MODULE_LABELS: Record<string, string> = {
  "gen-sizing":  "kVA Sizing",
  "voltage-dip": "Voltage Dip",
  "fuel":        "Fuel",
  "ats":         "ATS",
  "ventilation": "Ventilation",
};

export default function SessionHistory({ onLoadSession }: Props) {
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const handleDelete = (id: string) => {
    deleteSession(id);
    setSessions(getSessions());
  };

  const handleClear = () => {
    clearSessions();
    setSessions([]);
  };

  const handleRefresh = () => setSessions(getSessions());

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
          <History size={16} />
        </div>
        <div>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "oklch(0.93 0.01 220)", margin: 0 }}>
            Session History
          </h2>
          <p style={{ fontSize: "0.68rem", color: "oklch(0.50 0.015 230)", margin: 0 }}>
            Saved calculations from this session (stored locally)
          </p>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
          <button onClick={handleRefresh} style={ghostBtn}>
            <RefreshCw size={13} /> Refresh
          </button>
          {sessions.length > 0 && (
            <button onClick={handleClear} style={{ ...ghostBtn, color: "oklch(0.65 0.22 25)" }}>
              <Trash2 size={13} /> Clear All
            </button>
          )}
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="engineering-card" style={{ textAlign: "center", padding: "3rem" }}>
          <History size={40} style={{ color: "oklch(0.35 0.015 230)", margin: "0 auto 0.75rem" }} />
          <p style={{ color: "oklch(0.45 0.015 230)", fontSize: "0.8rem" }}>
            No saved calculations yet. Run a calculation in any module to save it here.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {sessions.map(session => {
            const color = MODULE_COLORS[session.moduleType] ?? "oklch(0.62 0.18 220)";
            const isExpanded = expanded === session.id;
            return (
              <div key={session.id} style={{
                background: "oklch(0.17 0.025 248)",
                border: "1px solid oklch(0.28 0.03 248)",
                borderRadius: 8, overflow: "hidden",
              }}>
                {/* Header row */}
                <div style={{
                  display: "flex", alignItems: "center", gap: "0.75rem",
                  padding: "0.75rem 1rem", cursor: "pointer",
                }}
                  onClick={() => setExpanded(isExpanded ? null : session.id)}
                >
                  {/* Module badge */}
                  <span style={{
                    padding: "0.15rem 0.5rem", borderRadius: 4,
                    fontSize: "0.65rem", fontWeight: 700,
                    background: `${color.replace(")", " / 0.15)")}`,
                    color, border: `1px solid ${color.replace(")", " / 0.3)")}`,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    whiteSpace: "nowrap",
                  }}>
                    {MODULE_LABELS[session.moduleType] ?? session.moduleType}
                  </span>

                  {/* Label */}
                  <span style={{ flex: 1, fontSize: "0.8rem", color: "oklch(0.85 0.01 220)", fontWeight: 500 }}>
                    {session.label}
                  </span>

                  {/* Date */}
                  <span style={{ fontSize: "0.65rem", color: "oklch(0.45 0.015 230)", whiteSpace: "nowrap" }}>
                    {new Date(session.savedAt).toLocaleString()}
                  </span>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: "0.3rem" }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => onLoadSession(session.moduleType)}
                      style={{
                        padding: "0.25rem 0.6rem", borderRadius: 4,
                        fontSize: "0.68rem", fontWeight: 500, cursor: "pointer",
                        background: `${color.replace(")", " / 0.12)")}`,
                        color, border: `1px solid ${color.replace(")", " / 0.3)")}`,
                      }}
                    >
                      Open Module
                    </button>
                    <button onClick={() => handleDelete(session.id)} style={{
                      padding: "0.25rem 0.4rem", borderRadius: 4,
                      background: "transparent", border: "1px solid oklch(0.28 0.03 248)",
                      color: "oklch(0.55 0.22 25)", cursor: "pointer",
                    }}>
                      <Trash2 size={12} />
                    </button>
                  </div>

                  {isExpanded ? <ChevronDown size={14} style={{ color: "oklch(0.45 0.015 230)" }} /> : <ChevronRight size={14} style={{ color: "oklch(0.45 0.015 230)" }} />}
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div style={{
                    borderTop: "1px solid oklch(0.25 0.03 248)",
                    padding: "0.75rem 1rem",
                    background: "oklch(0.15 0.025 248)",
                  }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                      <div>
                        <div style={{ fontSize: "0.6rem", color: "oklch(0.45 0.015 230)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>
                          Inputs
                        </div>
                        <pre style={{
                          fontSize: "0.65rem", fontFamily: "JetBrains Mono, monospace",
                          color: "oklch(0.70 0.01 220)",
                          background: "oklch(0.18 0.025 248)", borderRadius: 4,
                          padding: "0.5rem", overflow: "auto", maxHeight: 200,
                          margin: 0, border: "1px solid oklch(0.25 0.03 248)",
                        }}>
                          {JSON.stringify(session.inputData, null, 2)}
                        </pre>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.6rem", color: "oklch(0.45 0.015 230)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.4rem" }}>
                          Results
                        </div>
                        <pre style={{
                          fontSize: "0.65rem", fontFamily: "JetBrains Mono, monospace",
                          color: "oklch(0.70 0.01 220)",
                          background: "oklch(0.18 0.025 248)", borderRadius: 4,
                          padding: "0.5rem", overflow: "auto", maxHeight: 200,
                          margin: 0, border: "1px solid oklch(0.25 0.03 248)",
                        }}>
                          {JSON.stringify(session.resultData, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const ghostBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "0.3rem",
  padding: "0.3rem 0.6rem", borderRadius: 5,
  fontSize: "0.72rem", fontWeight: 500, cursor: "pointer",
  background: "transparent", border: "1px solid oklch(0.28 0.03 248)",
  color: "oklch(0.55 0.015 230)",
};
