import { useMemo, useState } from "react";
import { calcAtsSizing, ATS_RATING_SERIES } from "../../../shared/genCalc";
import { PageHeader, Section, Card, Stat, Field, NumberInput } from "@/components/noir/primitives";

export default function AtsPage() {
  const [genKva, setGenKva] = useState(500);
  const [loadA, setLoadA] = useState(600);
  const [voltage, setVoltage] = useState(400);

  const result = useMemo(() => calcAtsSizing({ generatorKva: genKva, loadCurrentA: loadA, voltageV: voltage, phases: 3 }), [genKva, loadA, voltage]);

  return (
    <>
      <PageHeader
        eyebrow="04 / Module"
        title="ATS / Change-Over Sizing"
        description="Recommends ATS current rating, transition type and operation mode per IEC 60364 and ISO 8528-4."
      />

      <Section title="Inputs">
        <Card>
          <div className="grid md:grid-cols-3 gap-5">
            <Field label="Generator kVA"><NumberInput value={genKva} onChange={setGenKva} step={1} min={0} /></Field>
            <Field label="Load Current (A)"><NumberInput value={loadA} onChange={setLoadA} step={1} min={0} /></Field>
            <Field label="Voltage (V, line-to-line)"><NumberInput value={voltage} onChange={setVoltage} step={1} min={0} /></Field>
          </div>
        </Card>
      </Section>

      <Section title="Results">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Stat label="Generator FLA" value={result.fullLoadCurrentA.toFixed(1)} unit="A" />
          <Stat label="Design Current (×1.25)" value={result.designCurrentA.toFixed(1)} unit="A" />
          <Stat label="Recommended ATS" value={result.recommendedAtsRatingA} unit="A" accent />
          <Stat label="Transition" value={result.atsType.split(" ")[0]} hint={result.atsType} />
        </div>

        <Card>
          <div className="noir-label mb-2">Changeover</div>
          <div className="font-display text-xl">{result.changeoverType}</div>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{result.notes}</p>
        </Card>
      </Section>

      <Section title="Standard ATS Rating Series (A)">
        <Card>
          <div className="flex flex-wrap gap-1.5">
            {ATS_RATING_SERIES.map((r) => (
              <span key={r}
                className={`mono text-xs px-2.5 py-1 rounded border tabular-nums ${
                  r === result.recommendedAtsRatingA
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground"
                }`}>
                {r}
              </span>
            ))}
          </div>
        </Card>
      </Section>
    </>
  );
}
