interface StatProps {
  label: string;
  value: string | number;
  unit?: string;
  accent?: boolean;
  hint?: string;
}

export function Stat({ label, value, unit, accent, hint }: StatProps) {
  return (
    <div
      className={[
        "rounded-lg border p-5 bg-card",
        accent ? "border-primary/40" : "border-border",
      ].join(" ")}
      style={accent ? { boxShadow: "var(--shadow-ember)" } : undefined}
    >
      <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className={[
            "font-display text-3xl font-bold tabular-nums tracking-tight",
            accent ? "text-primary" : "text-foreground",
          ].join(" ")}
        >
          {value}
        </span>
        {unit && <span className="text-sm font-mono text-muted-foreground">{unit}</span>}
      </div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
