import type { ReactNode } from "react";

export function PageHeader({
  eyebrow, title, description,
}: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mb-10 border-b border-border pb-8">
      <div className="noir-eyebrow mb-3">{eyebrow}</div>
      <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight">{title}</h1>
      {description && (
        <p className="mt-4 text-base text-muted-foreground max-w-2xl leading-relaxed">{description}</p>
      )}
    </div>
  );
}

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      {title && <h2 className="noir-eyebrow mb-4">{title}</h2>}
      {children}
    </section>
  );
}

export function Card({
  children, className = "", accent = false,
}: { children: ReactNode; className?: string; accent?: boolean }) {
  return (
    <div
      className={`noir-card p-6 ${className} ${accent ? "border-primary/40" : ""}`}
      style={accent ? { boxShadow: "var(--shadow-ember)" } : undefined}
    >
      {children}
    </div>
  );
}

export function Stat({
  label, value, unit, accent, hint,
}: { label: string; value: string | number; unit?: string; accent?: boolean; hint?: string }) {
  return (
    <Card accent={accent}>
      <div className="noir-label">{label}</div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <span
          className={`font-display text-3xl font-bold tabular-nums tracking-tight ${
            accent ? "text-primary" : "text-foreground"
          }`}
        >
          {value}
        </span>
        {unit && <span className="text-sm mono text-muted-foreground">{unit}</span>}
      </div>
      {hint && <div className="mt-2 text-xs text-muted-foreground">{hint}</div>}
    </Card>
  );
}

export function Field({
  label, children, hint,
}: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <div className="noir-label mb-1.5">{label}</div>
      {children}
      {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
    </label>
  );
}

export function NumberInput({
  value, onChange, step = 1, min, placeholder,
}: {
  value: number; onChange: (v: number) => void;
  step?: number; min?: number; placeholder?: string;
}) {
  return (
    <input
      type="number"
      className="noir-input"
      value={Number.isFinite(value) ? value : ""}
      step={step}
      min={min}
      placeholder={placeholder}
      onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
    />
  );
}

export function Select({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select className="noir-input" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function TextInput({
  value, onChange, placeholder,
}: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      className="noir-input"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
