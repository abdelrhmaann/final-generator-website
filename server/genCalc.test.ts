import { describe, it, expect } from "vitest";
import {
  calcGenSizing,
  calcVoltageDip,
  calcFuelConsumption,
  calcAtsSizing,
  calcRoomVentilation,
  interpolateSfc,
  getNextStandardKva,
  STANDARD_KVA_SERIES,
  SFC_CURVE,
} from "../shared/genCalc";

// ── Generator kVA Sizing ──────────────────────────────────────────────────────

describe("calcGenSizing", () => {
  it("calculates a single resistive step correctly", () => {
    const result = calcGenSizing([
      { id: "1", name: "Lighting", kw: 50, kva: 62.5, pf: 0.8, loadType: "resistive", startingKvaMultiplier: 1.0 },
    ]);
    expect(result.totalRunningKva).toBeCloseTo(62.5);
    expect(result.maxPeakKva).toBeCloseTo(62.5);
    expect(result.requiredGenKva).toBeCloseTo(62.5);
    expect(result.recommendedGenKva).toBe(63); // next standard above 62.5 in series
  });

  it("calculates DOL motor starting surge correctly", () => {
    // Step 1: 100 kVA resistive, Step 2: 50 kVA motor DOL (multiplier 6)
    const result = calcGenSizing([
      { id: "1", name: "HVAC", kw: 80, kva: 100, pf: 0.8, loadType: "resistive", startingKvaMultiplier: 1.0 },
      { id: "2", name: "Pump", kw: 40, kva: 50, pf: 0.8, loadType: "motor-dol", startingKvaMultiplier: 6.0 },
    ]);
    // Step 1 peak: 0 (previous) + 100×1.0 = 100 kVA
    // Step 2 peak: 100 (previous) + 50×6.0 = 400 kVA
    expect(result.steps[0].peakKvaAtThisStep).toBeCloseTo(100);
    expect(result.steps[1].peakKvaAtThisStep).toBeCloseTo(400);
    expect(result.maxPeakKva).toBeCloseTo(400);
    expect(result.requiredGenKva).toBeCloseTo(400);
    expect(result.recommendedGenKva).toBe(400);
  });

  it("loading percentage is based on running kVA / recommended gen kVA", () => {
    const result = calcGenSizing([
      { id: "1", name: "Load", kw: 80, kva: 100, pf: 0.8, loadType: "resistive", startingKvaMultiplier: 1.0 },
    ]);
    // 100 kVA running: 100 is an exact match in the standard series
    expect(result.recommendedGenKva).toBe(100);
    expect(result.loadingPercent).toBeCloseTo(100, 0);
  });

  it("cumulative kW accumulates across steps", () => {
    const result = calcGenSizing([
      { id: "1", name: "A", kw: 100, kva: 125, pf: 0.8, loadType: "resistive", startingKvaMultiplier: 1.0 },
      { id: "2", name: "B", kw: 50, kva: 62.5, pf: 0.8, loadType: "resistive", startingKvaMultiplier: 1.0 },
    ]);
    expect(result.steps[0].cumulativeKw).toBeCloseTo(100);
    expect(result.steps[1].cumulativeKw).toBeCloseTo(150);
    expect(result.totalRunningKw).toBeCloseTo(150);
  });
});

// ── Standard kVA Series ───────────────────────────────────────────────────────

describe("getNextStandardKva", () => {
  it("returns exact match if in series", () => {
    expect(getNextStandardKva(500)).toBe(500);
    expect(getNextStandardKva(1000)).toBe(1000);
  });

  it("returns next standard size above required", () => {
    expect(getNextStandardKva(101)).toBe(125);
    expect(getNextStandardKva(450)).toBe(500);
    expect(getNextStandardKva(1)).toBe(20);
  });

  it("covers full range 20–2250 kVA", () => {
    expect(STANDARD_KVA_SERIES[0]).toBe(20);
    expect(STANDARD_KVA_SERIES[STANDARD_KVA_SERIES.length - 1]).toBe(2250);
  });
});

// ── Voltage Dip Calculator ────────────────────────────────────────────────────

describe("calcVoltageDip", () => {
  it("applies the exact IEC formula: Vdip% = Sm / (Sg/X\"d + Sm) × 100", () => {
    // Sg=500 kVA, X"d=22%, Sm=150 kVA
    // Denominator = 500/0.22 + 150 = 2272.7 + 150 = 2422.7
    // Vdip = 150 / 2422.7 × 100 = 6.19%
    const result = calcVoltageDip({ generatorKva: 500, xdPercent: 22, motorStartingKva: 150 });
    expect(result.voltageDipPercent).toBeCloseTo(6.19, 1);
  });

  it("passes general loads when dip < 15%", () => {
    const result = calcVoltageDip({ generatorKva: 500, xdPercent: 22, motorStartingKva: 150 });
    expect(result.passGeneral).toBe(true);
    expect(result.passSensitive).toBe(true);
  });

  it("fails sensitive loads when dip is between 10% and 15%", () => {
    // Tune inputs to produce ~12% dip
    const result = calcVoltageDip({ generatorKva: 200, xdPercent: 25, motorStartingKva: 80 });
    // Denominator = 200/0.25 + 80 = 800 + 80 = 880
    // Vdip = 80/880 × 100 = 9.09% — actually passes both; let's use a higher Sm
    const result2 = calcVoltageDip({ generatorKva: 200, xdPercent: 25, motorStartingKva: 120 });
    // Denominator = 800 + 120 = 920; Vdip = 120/920 × 100 = 13.04%
    expect(result2.passGeneral).toBe(true);
    expect(result2.passSensitive).toBe(false);
  });

  it("fails general loads when dip >= 15%", () => {
    // Large motor relative to generator
    const result = calcVoltageDip({ generatorKva: 100, xdPercent: 25, motorStartingKva: 200 });
    // Denominator = 100/0.25 + 200 = 400 + 200 = 600; Vdip = 200/600 × 100 = 33.3%
    expect(result.voltageDipPercent).toBeCloseTo(33.3, 0);
    expect(result.passGeneral).toBe(false);
    expect(result.passSensitive).toBe(false);
  });

  it("returns 0 dip for zero motor starting kVA", () => {
    const result = calcVoltageDip({ generatorKva: 500, xdPercent: 22, motorStartingKva: 0 });
    expect(result.voltageDipPercent).toBe(0);
  });
});

// ── SFC Interpolation ─────────────────────────────────────────────────────────

describe("interpolateSfc", () => {
  it("returns exact values at defined points", () => {
    expect(interpolateSfc(1.00)).toBeCloseTo(0.27);
    expect(interpolateSfc(0.75)).toBeCloseTo(0.29);
    expect(interpolateSfc(0.50)).toBeCloseTo(0.33);
    expect(interpolateSfc(0.25)).toBeCloseTo(0.40);
  });

  it("interpolates linearly between points", () => {
    // Between 75% (0.29) and 100% (0.27): at 87.5% should be ~0.28
    const mid = interpolateSfc(0.875);
    expect(mid).toBeGreaterThan(0.27);
    expect(mid).toBeLessThan(0.29);
    expect(mid).toBeCloseTo(0.28, 2);
  });

  it("clamps to boundary values outside range", () => {
    expect(interpolateSfc(0)).toBeCloseTo(SFC_CURVE[0].lPerKwh);
    expect(interpolateSfc(1.5)).toBeCloseTo(0.27);
  });
});

// ── Fuel Consumption ──────────────────────────────────────────────────────────

describe("calcFuelConsumption", () => {
  it("calculates consumption at 75% load correctly", () => {
    // 400 kW × 0.75 × 0.29 L/kWh = 87 L/hr
    const result = calcFuelConsumption({ generatorKw: 400, loadFactorPercent: 75 });
    expect(result.sfcLPerKwh).toBeCloseTo(0.29);
    expect(result.consumptionLPerHr).toBeCloseTo(87, 0);
  });

  it("calculates tank sizes for 8, 24, and 72 hours", () => {
    const result = calcFuelConsumption({ generatorKw: 400, loadFactorPercent: 75 });
    expect(result.tankDimensions).toHaveLength(3);
    expect(result.tankDimensions[0].hours).toBe(8);
    expect(result.tankDimensions[1].hours).toBe(24);
    expect(result.tankDimensions[2].hours).toBe(72);
    // 8hr tank: 87 L/hr × 8 = ~696 L
    expect(result.tank8hr).toBeCloseTo(87 * 8, 0);
    expect(result.tank24hr).toBeCloseTo(87 * 24, 0);
    expect(result.tank72hr).toBeCloseTo(87 * 72, 0);
  });

  it("uses 0.27 L/kWh at 100% load", () => {
    const result = calcFuelConsumption({ generatorKw: 1000, loadFactorPercent: 100 });
    expect(result.sfcLPerKwh).toBeCloseTo(0.27);
    expect(result.consumptionLPerHr).toBeCloseTo(270, 0);
  });
});

// ── ATS Sizing ────────────────────────────────────────────────────────────────

describe("calcAtsSizing", () => {
  it("calculates full load current correctly (3-phase)", () => {
    // 500 kVA, 415 V: I = 500000 / (√3 × 415) = 695.6 A
    const result = calcAtsSizing({ generatorKva: 500, loadCurrentA: 600, voltageV: 415 });
    expect(result.fullLoadCurrentA).toBeCloseTo(695.6, 0);
  });

  it("applies 125% safety factor to design current", () => {
    const result = calcAtsSizing({ generatorKva: 500, loadCurrentA: 600, voltageV: 415 });
    // Design current = max(695.6, 600) × 1.25 = 869.5 A
    expect(result.designCurrentA).toBeCloseTo(695.6 * 1.25, 0);
  });

  it("selects next standard ATS rating above design current", () => {
    const result = calcAtsSizing({ generatorKva: 500, loadCurrentA: 600, voltageV: 415 });
    // Design ~869.5 A → next standard is 1000 A
    expect(result.recommendedAtsRatingA).toBe(1000);
  });

  it("recommends closed transition for generators >= 500 kVA", () => {
    const result = calcAtsSizing({ generatorKva: 500, loadCurrentA: 400, voltageV: 415 });
    expect(result.atsType).toContain("Closed");
  });

  it("recommends open transition for generators < 500 kVA", () => {
    const result = calcAtsSizing({ generatorKva: 400, loadCurrentA: 300, voltageV: 415 });
    expect(result.atsType).toContain("Open");
  });
});

// ── Room Ventilation ──────────────────────────────────────────────────────────

describe("calcRoomVentilation", () => {
  it("calculates heat rejection as 30% of generator kW", () => {
    const result = calcRoomVentilation({ generatorKw: 400, roomL: 10, roomW: 6, roomH: 4 });
    expect(result.heatRejectionKw).toBeCloseTo(120);
  });

  it("calculates airflow using ISO 8528 formula", () => {
    // Q = (120 × 3600) / (1.2 × 1.005 × 10) = 432000 / 12.06 = 35821 m³/hr
    const result = calcRoomVentilation({ generatorKw: 400, roomL: 10, roomW: 6, roomH: 4 });
    expect(result.requiredAirflowM3hr).toBeCloseTo(35821, -2);
  });

  it("exhaust louver is 10% larger than inlet louver", () => {
    const result = calcRoomVentilation({ generatorKw: 400, roomL: 10, roomW: 6, roomH: 4 });
    expect(result.exhaustLouverAreaM2).toBeCloseTo(result.inletLouverAreaM2 * 1.1, 4);
  });

  it("reports room as adequate when volume meets minimum", () => {
    // Large room: 10×6×4 = 240 m³
    const result = calcRoomVentilation({ generatorKw: 400, roomL: 10, roomW: 6, roomH: 4 });
    expect(result.actualRoomVolumeM3).toBeCloseTo(240);
    // minRoomVolumeM3 = max(400 × 0.005 × 3, 20) = max(6, 20) = 20
    expect(result.roomAdequate).toBe(true);
  });

  it("reports room as inadequate when volume is too small", () => {
    const result = calcRoomVentilation({ generatorKw: 400, roomL: 2, roomW: 2, roomH: 2 });
    expect(result.actualRoomVolumeM3).toBeCloseTo(8);
    expect(result.roomAdequate).toBe(false);
  });
});
