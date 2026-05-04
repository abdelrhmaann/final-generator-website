import { Folder, User, Hash, Calendar } from "lucide-react";
import { useProject } from "@/lib/project";

export function ProjectHeader() {
  const [p, set] = useProject();
  const Field = ({ icon: Icon, label, value, onChange, type = "text", placeholder }: any) => (
    <label className="block">
      <div className="flex items-center gap-1.5 mb-1.5 noir-label">
        <Icon className="w-3 h-3" /> {label}
      </div>
      <input
        type={type}
        className="noir-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
  return (
    <div className="noir-card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 gs-section-label">
          <Folder className="w-3.5 h-3.5" /> Project Information
        </div>
        <div className="text-[11px] mono text-muted-foreground">For formal submittal documentation</div>
      </div>
      <div className="grid md:grid-cols-4 gap-4">
        <Field icon={Folder}   label="Project Name"      value={p.projectName}   onChange={(v: string) => set({ ...p, projectName: v })}   placeholder="e.g. Tower A — Standby Power" />
        <Field icon={User}     label="Engineer Name"     value={p.engineerName}  onChange={(v: string) => set({ ...p, engineerName: v })}  placeholder="Name, signature" />
        <Field icon={Hash}     label="Project Reference" value={p.projectRef}    onChange={(v: string) => set({ ...p, projectRef: v })}    placeholder="REF-2026-..." />
        <Field icon={Calendar} label="Date"              value={p.date}          onChange={(v: string) => set({ ...p, date: v })}          type="date" />
      </div>
    </div>
  );
}