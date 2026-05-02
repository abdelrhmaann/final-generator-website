import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from "recharts";
import { calcFuelConsumption, SFC_CURVE } from "../../../shared/genCalc";
import { PageHeader, Section, Card, Stat, Field, NumberInput } from "@/components/noir/primitives";

export default function FuelPage() {
  const [kw, setKw] = useState(400);
  const [lf, setLf] = useState(75);

  const result = useMemo(() => calcFuelConsumption(kw, lf), [kw, lf]);

  const sfcChart = SFC_CURVE.map((p) => ({
    load: p.loadFactor * 100,
    sfc: p.lPerKwh,
  }));

  return (
    <>
      <PageHeader
        eyebrow="03 / Module"
        title="Fuel Consumption Estimator"
        description="Diesel fuel burn and tank sizing from the standard SFC curve. Interpolated linearly between 25%, 50%, 75% and 100% load factors."
      />

      <Section title="Inputs">
        <Card>
          <div className="grid md:grid-cols-2 gap-5">
            <Field label="Generator kW" hint="Prime / standby kW rating">
              <NumberInput value={kw} onChange={setKw} step={1} min={0} />
            </Field>
            <Field label="Load Factor (%)" hint="Average operating load">
              <NumberInput value={lf} onChange={setLf} step={1} min={0} />
            </Field>
          </div>
        </Card>
      </Section>

      <Section title="Results">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <Stat label="SFC" value={result.sfcLPerKwh.toFixed(3)} unit="L/kWh" />
          <Stat label="Consumption" value={result.consumptionLPerHr.toFixed(1)} unit="L/hr" accent />
          <Stat label="Per Day" value={(result.consumptionLPerHr * 24).toFixed(0)} unit="L / 24h" />
        </div>

        <Card className="p-6">
          <div className="noir-label mb-4">Specific Fuel Consumption Curve</div>
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={sfcChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="load" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} unit="%" />
                <YAxis stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} unit=" L/kWh" domain={[0.2, 0.45]} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
                <Line type="monotone" dataKey="sfc" stroke="var(--primary)" strokeWidth={2} dot={{ fill: "var(--primary)" }} />
                <ReferenceDot x={lf} y={result.sfcLPerKwh} r={6} fill="var(--warning)" stroke="var(--background)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Section>

      <Section title="Recommended Tank Sizes">
        <div className="grid md:grid-cols-3 gap-4">
          {result.tanks.map((t) => (
            <Card key={t.hours}>
              <div className="flex items-baseline justify-between">
                <div>
                  <div className="noir-label">{t.hours}-hour autonomy</div>
                  <div className="mt-2 font-display text-3xl font-bold tabular-nums">
                    {t.liters.toFixed(0)} <span className="text-sm mono text-muted-foreground">L</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border text-xs mono text-muted-foreground space-y-1">
                <div>L × W × H</div>
                <div className="text-foreground">{t.suggestedL} × {t.suggestedW} × {t.suggestedH} m</div>
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
