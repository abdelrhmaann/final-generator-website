import type { ProjectInfo } from "@/types/project";
import { FolderOpen, User, Hash, Calendar } from "lucide-react";

interface Props {
  info: ProjectInfo;
  onChange: (info: ProjectInfo) => void;
}

export default function ProjectHeader({ info, onChange }: Props) {
  const update = (key: keyof ProjectInfo, value: string) =>
    onChange({ ...info, [key]: value });

  return (
    <div style={{
      background: "oklch(0.17 0.025 248)",
      border: "1px solid oklch(0.28 0.03 248)",
      borderRadius: 8,
      padding: "0.875rem 1rem",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "0.4rem",
        marginBottom: "0.75rem",
        paddingBottom: "0.6rem",
        borderBottom: "1px solid oklch(0.28 0.03 248)",
      }}>
        <FolderOpen size={14} style={{ color: "oklch(0.62 0.18 220)" }} />
        <span style={{
          fontSize: "0.65rem", fontWeight: 700,
          color: "oklch(0.62 0.18 220)",
          textTransform: "uppercase", letterSpacing: "0.1em",
        }}>
          Project Information
        </span>
        <span style={{
          marginLeft: "auto",
          fontSize: "0.6rem", color: "oklch(0.45 0.015 230)",
        }}>
          For formal submittal documentation
        </span>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
        gap: "0.75rem",
      }}>
        <Field
          icon={<FolderOpen size={12} />}
          label="Project Name"
          value={info.projectName}
          placeholder="e.g. Al Noor Tower — Standby Power"
          onChange={v => update("projectName", v)}
        />
        <Field
          icon={<User size={12} />}
          label="Engineer Name"
          value={info.engineerName}
          placeholder="e.g. Eng. Ahmed Al-Rashid"
          onChange={v => update("engineerName", v)}
        />
        <Field
          icon={<Hash size={12} />}
          label="Project Reference"
          value={info.projectRef}
          placeholder="e.g. MEP-E-001-Rev.A"
          onChange={v => update("projectRef", v)}
        />
        <Field
          icon={<Calendar size={12} />}
          label="Date"
          value={info.date}
          type="date"
          onChange={v => update("date", v)}
        />
      </div>
    </div>
  );
}

function Field({
  icon, label, value, placeholder, onChange, type = "text",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label style={{
        display: "flex", alignItems: "center", gap: "0.3rem",
        fontSize: "0.65rem", fontWeight: 600,
        color: "oklch(0.55 0.015 230)",
        textTransform: "uppercase", letterSpacing: "0.08em",
        marginBottom: "0.3rem",
      }}>
        <span style={{ color: "oklch(0.62 0.18 220)" }}>{icon}</span>
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={{
          width: "100%",
          background: "oklch(0.20 0.025 248)",
          border: "1px solid oklch(0.28 0.03 248)",
          borderRadius: 5,
          padding: "0.4rem 0.6rem",
          fontSize: "0.8rem",
          color: "oklch(0.93 0.01 220)",
          outline: "none",
          fontFamily: "inherit",
        }}
        onFocus={e => (e.target.style.borderColor = "oklch(0.62 0.18 220)")}
        onBlur={e => (e.target.style.borderColor = "oklch(0.28 0.03 248)")}
      />
    </div>
  );
}
