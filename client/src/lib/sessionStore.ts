import type { ProjectInfo } from "@/types/project";

export interface SessionEntry {
  id: string;
  moduleType: string;
  projectInfo: ProjectInfo;
  inputData: unknown;
  resultData: unknown;
  savedAt: string;
  label: string;
}

const STORAGE_KEY = "gensizer_sessions";

export function saveSession(entry: {
  moduleType: string;
  projectInfo: ProjectInfo;
  inputData: unknown;
  resultData: unknown;
}) {
  const sessions = getSessions();
  const newEntry: SessionEntry = {
    id: Date.now().toString(),
    ...entry,
    savedAt: new Date().toISOString(),
    label: entry.projectInfo.projectName
      ? `${entry.projectInfo.projectName} — ${moduleLabel(entry.moduleType)}`
      : `${moduleLabel(entry.moduleType)} — ${new Date().toLocaleString()}`,
  };
  sessions.unshift(newEntry);
  // Keep last 50 sessions
  const trimmed = sessions.slice(0, 50);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  return newEntry;
}

export function getSessions(): SessionEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function deleteSession(id: string) {
  const sessions = getSessions().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function clearSessions() {
  localStorage.removeItem(STORAGE_KEY);
}

function moduleLabel(type: string): string {
  const labels: Record<string, string> = {
    "gen-sizing":  "Generator kVA Sizing",
    "voltage-dip": "Voltage Dip",
    "fuel":        "Fuel Consumption",
    "ats":         "ATS Sizing",
    "ventilation": "Room Ventilation",
  };
  return labels[type] ?? type;
}
