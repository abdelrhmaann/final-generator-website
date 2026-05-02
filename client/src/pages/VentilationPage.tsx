import { useMemo, useState } from "react";
import { calcRoomVentilation } from "../../../shared/genCalc";
import { PageHeader, Section, Card, Stat, Field, NumberInput } from "@/components/noir/primitives";

export default function VentilationPage() {
  const [kw, setKw] = useState(400);
  const [l, setL] = useState(8);
  const [w, setW] = useState(5);
  const [h, setH] = useState(3.5);

  const result = useMemo(() => calcRoomVentilation({ generatorKw: kw, roomL: l, roomW: w, roomH: h }), [kw, l, w, h]);

  return (
    <>
      <PageHeader
        eyebrow="05 / Module"
        title="Generator Room Ventilation"
        description="Heat rejection, required airflow and louver sizing per ISO 8528-13. Δt = 10 °C, louver velocity 2.5 m/s."
      />

      <Section title="Inputs">
        <Card>
          <div className="grid md:grid-cols-4 gap-5">
            <Field label="Generator kW"><NumberInput value={kw} onChange={setKw} step={1} min={0} /></Field>
            <Field label="Room Length (m)"><NumberInput value={l} onChange={setL} step={0.1} min={0} /></Field>
            <Field label="Room Width (m)"><NumberInput value={w} onChange={setW} step={0.1} min={0} /></Field>
            <Field label="Room Height (m)"><NumberInput value={h} onChange={setH} step={0.1} min={0} /></Field>
          </div>
        </Card>
      </Section>

      <Section title="Results">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Stat label="Heat Rejection" value={result.heatRejectionKw.toFixed(1)} unit="kW" />
          <Stat label="Required Airflow" value={result.requiredAirflowM3hr.toFixed(0)} unit="m³/hr" accent />
          <Stat label="Inlet Louver" value={result.inletLouverAreaM2.toFixed(2)} unit="m²" hint={result.recommendedInletSize} />
          <Stat label="Exhaust Louver" value={result.exhaustLouverAreaM2.toFixed(2)} unit="m²" hint={result.recommendedExhaustSize} />
        </div>

        <Card>
          <div className="flex items-center gap-3 mb-3">
            <span className="noir-label">Room Volume Check</span>
            <span className={result.roomAdequate ? "badge-pass" : "badge-fail"}>
              {result.roomAdequate ? "Adequate" : "Insufficient"}
            </span>
          </div>
          <div className="grid md:grid-cols-2 gap-4 text-sm mono">
            <div><span className="text-muted-foreground">Actual:</span> {result.actualRoomVolumeM3.toFixed(1)} m³</div>
            <div><span className="text-muted-foreground">Min req:</span> {result.minRoomVolumeM3.toFixed(1)} m³</div>
          </div>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{result.notes}</p>
        </Card>
      </Section>
    </>
  );
}
