export interface SessionEntry {
  id: string;
  moduleType: "gen-sizing" | "voltage-dip" | "fuel" | "ats" | "ventilation";
  projectName: string;
  inputs: unknown;
  result: unknown;
  savedAt: string;
}
const KEY = "gensizer.sessions";

export function getSessions(): SessionEntry[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionEntry[]) : [];
  } catch { return []; }
}

export function saveSession(e: Omit<SessionEntry, "id" | "savedAt">) {
  const next: SessionEntry = { ...e, id: `${Date.now()}`, savedAt: new Date().toISOString() };
  const all = [next, ...getSessions()].slice(0, 50);
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* noop */ }
  return next;
}

export function deleteSession(id: string) {
  const all = getSessions().filter((s) => s.id !== id);
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* noop */ }
}

export function clearSessions() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}

export const MODULE_META: Record<SessionEntry["moduleType"], { label: string; route: string; tone: string; tag: string }> = {
  "gen-sizing":  { label: "Generator kVA Sizing", route: "/sizing",       tone: "var(--mod-sizing)", tag: "SIZING" },
  "voltage-dip": { label: "Voltage Dip",           route: "/voltage-dip",  tone: "var(--mod-dip)",    tag: "VOLTAGE DIP" },
  "fuel":        { label: "Fuel Consumption",      route: "/fuel",         tone: "var(--mod-fuel)",   tag: "FUEL" },
  "ats":         { label: "ATS Sizing",            route: "/ats",          tone: "var(--mod-ats)",    tag: "ATS" },
  "ventilation": { label: "Room Ventilation",      route: "/ventilation",  tone: "var(--mod-vent)",   tag: "VENTILATION" },
};