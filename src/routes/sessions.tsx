import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { History, Trash2, ArrowRight, RefreshCw } from "lucide-react";
import { ProjectHeader } from "@/components/noir/ProjectHeader";
import { ModuleTitle } from "./sizing";
import { getSessions, deleteSession, clearSessions, MODULE_META, type SessionEntry } from "@/lib/sessions";

export const Route = createFileRoute("/sessions")({
  head: () => ({ meta: [{ title: "Session History — GenSizer Pro" }] }),
  component: Page,
});

function Page() {
  const [list, setList] = useState<SessionEntry[]>([]);
  const refresh = () => setList(getSessions());
  useEffect(() => { refresh(); }, []);
  return (
    <>
      <ProjectHeader />
      <div className="flex items-end justify-between mb-4">
        <ModuleTitle icon={<History className="w-5 h-5" />} tone="var(--primary)" title="Session History" subtitle="Saved calculations from this session (stored locally)" />
        <div className="flex gap-2 mb-6">
          <button className="noir-btn noir-btn-ghost" onClick={refresh}><RefreshCw className="w-3.5 h-3.5" /> Refresh</button>
          <button className="noir-btn noir-btn-ghost text-destructive" onClick={() => { clearSessions(); refresh(); }}><Trash2 className="w-3.5 h-3.5" /> Clear All</button>
        </div>
      </div>
      <div className="space-y-2">
        {list.length === 0 && <div className="noir-card p-8 text-center text-sm text-muted-foreground">No saved calculations yet. Use the Save button on any module.</div>}
        {list.map((s) => {
          const m = MODULE_META[s.moduleType];
          return (
            <div key={s.id} className="noir-card p-3 flex items-center gap-3">
              <span className="px-2 py-1 rounded text-[10px] mono font-bold tracking-wider"
                style={{ background: `color-mix(in oklab, ${m.tone} 18%, transparent)`, color: m.tone, border: `1px solid color-mix(in oklab, ${m.tone} 35%, transparent)` }}>
                {m.tag}
              </span>
              <span className="text-sm">{s.projectName || "Untitled"} — {m.label}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] mono text-muted-foreground border border-border">{m.standard}</span>
              <span className="ml-auto text-[11px] mono text-muted-foreground">{new Date(s.savedAt).toLocaleString()}</span>
              <Link to={m.route} className="noir-btn noir-btn-ghost" style={{ borderColor: m.tone, color: m.tone }}>Open <ArrowRight className="w-3.5 h-3.5" /></Link>
              <button className="p-2 text-destructive hover:bg-secondary rounded" onClick={() => { deleteSession(s.id); refresh(); }}><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          );
        })}
      </div>
    </>
  );
}