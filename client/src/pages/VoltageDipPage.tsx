import { useMemo, useState } from "react";
import { calcVoltageDip, XD_BY_KVA } from "../../../shared/genCalc";
import { PageHeader, Section, Card, Stat, Field, NumberInput } from "@/components/noir/primitives";

export default function VoltageDipPage() {
  const [genKva, setGenKva] = useState(500);
  const [xd, setXd] = useState(23);
  const [motorKva, setMotorKva] = useState(150);

  const result = useMemo(() => calcVoltageDip({ generatorKva: genKva, xdPercent: xd, motorStartingKva: motorKva }), [genKva, xd, motorKva]);
  const dip = result.voltageDipPercent;
  const angle = Math.min(dip / 30, 1) * 180; // 0-30% → 0-180°
  const tone =
    !result.passGeneral ? "var(--destructive)"
    : !result.passSensitive ? "var(--warning)"
    : "var(--success)";

  return (
    <>
      <PageHeader
        eyebrow="02 / Module"
        title="Voltage Dip Calculator"
        description="Compute starting voltage dip on the generator bus from motor in-rush kVA and X″d, per IEC 60034 limits."
      />

      <Section title="Inputs">
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Field label="Generator kVA" hint="Standby rating">
              <NumberInput value={genKva} onChange={setGenKva} step={1} min={0} />
            </Field>
            <Field label='Subtransient X″d (%)' hint="Typical 16–29% by size">
              <NumberInput value={xd} onChange={setXd} step={0.1} min={1} />
            </Field>
            <Field label="Motor Starting kVA" hint="In-rush kVA on switching">
              <NumberInput value={motorKva} onChange={setMotorKva} step={1} min={0} />
            </Field>
          </div>
        </Card>
      </Section>

      <Section title="Result">
        <div className="grid md:grid-cols-2 gap-6">
          <Card accent>
            <div className="noir-label">Voltage Dip</div>
            <div className="mt-3 flex items-end gap-3">
              <span className="font-display text-6xl font-bold tabular-nums" style={{ color: tone }}>
                {dip.toFixed(2)}
              </span>
              <span className="mono text-xl text-muted-foreground pb-2">%</span>
            </div>
            <div className="mt-6 flex gap-2">
              <span className={result.passGeneral ? "badge-pass" : "badge-fail"}>
                {result.passGeneral ? "Pass < 15%" : "Fail ≥ 15%"}
              </span>
              <span className={result.passSensitive ? "badge-pass" : "badge-warn"}>
                {result.passSensitive ? "Sensitive OK" : "Sensitive Risk"}
              </span>
            </div>
            <p className="mt-5 text-sm text-muted-foreground leading-relaxed">{result.recommendation}</p>
          </Card>

          <Card>
            <div className="noir-label mb-4">Gauge</div>
            <svg viewBox="0 0 200 130" className="w-full">
              <defs>
                <linearGradient id="gaugeGrad" x1="0" x2="1">
                  <stop offset="0%" stopColor="var(--success)" />
                  <stop offset="33%" stopColor="var(--warning)" />
                  <stop offset="66%" stopColor="var(--destructive)" />
                </linearGradient>
              </defs>
              <path d="M20,110 A80,80 0 0 1 180,110" fill="none" stroke="var(--border)" strokeWidth="14" strokeLinecap="round" />
              <path d="M20,110 A80,80 0 0 1 180,110" fill="none" stroke="url(#gaugeGrad)" strokeWidth="14" strokeLinecap="round"
                strokeDasharray={`${(angle / 180) * 251} 251`} />
              <line x1="100" y1="110" x2={100 + 70 * Math.cos(Math.PI - (angle * Math.PI) / 180)}
                y2={110 - 70 * Math.sin(Math.PI - (angle * Math.PI) / 180)}
                stroke="var(--foreground)" strokeWidth="2" strokeLinecap="round" />
              <circle cx="100" cy="110" r="5" fill="var(--primary)" />
              <text x="100" y="128" textAnchor="middle" fill="var(--muted-foreground)" fontSize="10" fontFamily="JetBrains Mono">
                0% — 30%
              </text>
            </svg>
          </Card>
        </div>
      </Section>

      <Section title='Standard X″d by Generator Size'>
        <Card>
          <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
            {XD_BY_KVA.map(({ kva, xd }) => (
              <button key={kva}
                onClick={() => { setGenKva(kva); setXd(xd); }}
                className="text-left p-2 rounded border border-border hover:border-primary transition-colors">
                <div className="mono text-xs text-muted-foreground">{kva} kVA</div>
                <div className="mono text-sm text-primary">{xd}%</div>
              </button>
            ))}
          </div>
        </Card>
      </Section>
    </>
  );
}
