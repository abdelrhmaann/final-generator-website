import type { ReactNode } from "react";

export function StatCard({
  label, value, unit, sub, tone,
}: { label: string; value: ReactNode; unit?: string; sub?: string; tone?: string }) {
  return (
    <div className="gs-stat" style={tone ? ({ ["--tone" as any]: tone } as React.CSSProperties) : undefined}>
      <div className="gs-stat-label">{label}</div>
      <div className="mt-2 flex items-baseline">
        <span className="gs-stat-value">{value}</span>
        {unit && <span className="gs-stat-unit">{unit}</span>}
      </div>
      {sub && <div className="gs-stat-sub">{sub}</div>}
    </div>
  );
}