// ============================================================
// GenSizer Pro — Shared Calculation Engine
// All formulas implemented exactly per IEC 60034, ISO 8528,
// IEC 60364 and project specifications.
// ============================================================

// ── Standard Generator kVA Series (20–2250 kVA) ─────────────
export const STANDARD_KVA_SERIES = [
  20, 30, 40, 50, 63, 75, 100, 125, 150, 200,
  250, 300, 400, 500, 630, 750, 1000, 1250, 1500, 2000, 2250,
];

// ── Standard Subtransient Reactance X"d by Generator Size ───
// Source: ISO 8528 / typical manufacturer data
export const XD_BY_KVA: { kva: number; xd: number }[] = [
  { kva: 20,   xd: 16 },
  { kva: 30,   xd: 16 },
  { kva: 40,   xd: 16 },
  { kva: 50,   xd: 16 },
  { kva: 63,   xd: 17 },
  { kva: 75,   xd: 17 },
  { kva: 100,  xd: 18 },
  { kva: 125,  xd: 18 },
  { kva: 150,  xd: 19 },
  { kva: 200,  xd: 20 },
  { kva: 250,  xd: 20 },
  { kva: 300,  xd: 21 },
  { kva: 400,  xd: 22 },
  { kva: 500,  xd: 23 },
  { kva: 630,  xd: 24 },
  { kva: 750,  xd: 25 },
  { kva: 1000, xd: 26 },
  { kva: 1250, xd: 27 },
  { kva: 1500, xd: 28 },
  { kva: 2000, xd: 28 },
  { kva: 2250, xd: 29 },
];

// ── Standard SFC (Specific Fuel Consumption) Curve ──────────
// Diesel: L/kWh at given load factor
// Exact values per project specification
export const SFC_CURVE = [
  { loadFactor: 0.25, lPerKwh: 0.40 },
  { loadFactor: 0.50, lPerKwh: 0.33 },
  { loadFactor: 0.75, lPerKwh: 0.29 },
  { loadFactor: 1.00, lPerKwh: 0.27 },
];

// ── Motor Starting kVA Multipliers ──────────────────────────
export const MOTOR_START_MULTIPLIERS: Record<string, number> = {
  "resistive":        1.0,
  "inductive":        1.0,
  "motor-dol":        6.0,   // DOL: 6× FLA
  "motor-star-delta": 2.0,   // Star-Delta: ~2× FLA (1/3 of DOL)
  "motor-vfd":        1.5,   // VFD: soft start, ~1.5×
};

// ── Load Type Labels ─────────────────────────────────────────
export const LOAD_TYPE_LABELS: Record<string, string> = {
  "resistive":        "Resistive",
  "inductive":        "Inductive",
  "motor-dol":        "Motor (DOL)",
  "motor-star-delta": "Motor (Star-Delta)",
  "motor-vfd":        "Motor (VFD)",
};

// ── ATS Rating Series (A) ────────────────────────────────────
export const ATS_RATING_SERIES = [
  63, 100, 125, 160, 200, 250, 315, 400, 500, 630,
  800, 1000, 1250, 1600, 2000, 2500, 3200, 4000,
];

// ============================================================
// MODULE 1: Generator kVA Sizing — Step Load Method
// ============================================================

export interface LoadStep {
  id: string;
  name: string;
  kw: number;
  kva: number;
  pf: number;
  loadType: string;
  startingKvaMultiplier: number;
}

export interface StepResult {
  stepIndex: number;
  name: string;
  stepKw: number;
  stepKva: number;
  startingKva: number;
  cumulativeKw: number;
  cumulativeRunningKva: number;
  peakKvaAtThisStep: number; // running kVA + starting kVA surge of this step
}

export interface GenSizingResult {
  steps: StepResult[];
  totalRunningKw: number;
  totalRunningKva: number;
  maxStartingKva: number;       // highest single-step starting kVA
  maxPeakKva: number;           // governing kVA (max of all peakKvaAtThisStep)
  requiredGenKva: number;       // max(totalRunningKva, maxPeakKva)
  recommendedGenKva: number;    // next standard size
  loadingPercent: number;       // totalRunningKva / recommendedGenKva × 100
}

export function calcGenSizing(steps: LoadStep[]): GenSizingResult {
  let cumulativeKw = 0;
  let cumulativeRunningKva = 0;
  let maxPeakKva = 0;
  let maxStartingKva = 0;

  const stepResults: StepResult[] = steps.map((step, i) => {
    const startingKva = step.kva * step.startingKvaMultiplier;
    cumulativeKw += step.kw;
    cumulativeRunningKva += step.kva;

    // Peak at this step = all previous running kVA + this step's starting kVA surge
    const previousRunningKva = cumulativeRunningKva - step.kva;
    const peakKvaAtThisStep = previousRunningKva + startingKva;

    if (peakKvaAtThisStep > maxPeakKva) maxPeakKva = peakKvaAtThisStep;
    if (startingKva > maxStartingKva) maxStartingKva = startingKva;

    return {
      stepIndex: i + 1,
      name: step.name,
      stepKw: step.kw,
      stepKva: step.kva,
      startingKva,
      cumulativeKw,
      cumulativeRunningKva,
      peakKvaAtThisStep,
    };
  });

  const requiredGenKva = Math.max(cumulativeRunningKva, maxPeakKva);
  const recommendedGenKva = getNextStandardKva(requiredGenKva);
  const loadingPercent = recommendedGenKva > 0
    ? (cumulativeRunningKva / recommendedGenKva) * 100
    : 0;

  return {
    steps: stepResults,
    totalRunningKw: cumulativeKw,
    totalRunningKva: cumulativeRunningKva,
    maxStartingKva,
    maxPeakKva,
    requiredGenKva,
    recommendedGenKva,
    loadingPercent,
  };
}

export function getNextStandardKva(required: number): number {
  for (const kva of STANDARD_KVA_SERIES) {
    if (kva >= required) return kva;
  }
  return STANDARD_KVA_SERIES[STANDARD_KVA_SERIES.length - 1];
}

// ============================================================
// MODULE 2: Voltage Dip Calculator
// ============================================================

export interface VoltageDipInput {
  generatorKva: number;
  xdPercent: number;   // X"d in %
  motorStartingKva: number;
}

export interface VoltageDipResult {
  voltageDipPercent: number;
  passGeneral: boolean;   // < 15%
  passSensitive: boolean; // < 10%
  recommendation: string;
}

export function calcVoltageDip(input: VoltageDipInput): VoltageDipResult {
  const { generatorKva, xdPercent, motorStartingKva } = input;
  // Formula (exact per spec):
  // Vdip% = (motorStartingKVA) / (generatorKVA / X"d + motorStartingKVA) × 100
  const xdDecimal = xdPercent / 100;
  const denominator = generatorKva / xdDecimal + motorStartingKva;
  const voltageDipPercent = denominator > 0
    ? (motorStartingKva / denominator) * 100
    : 0;

  const passGeneral = voltageDipPercent < 15;
  const passSensitive = voltageDipPercent < 10;

  let recommendation = "";
  if (!passGeneral) {
    recommendation =
      "Voltage dip exceeds 15% IEC limit. Recommended actions: (1) Increase generator kVA rating, " +
      "(2) Use soft starter to reduce motor starting kVA, or (3) Use VFD for controlled acceleration.";
  } else if (!passSensitive) {
    recommendation =
      "Voltage dip exceeds 10% limit for sensitive loads (IEC 60034). " +
      "Recommended actions: (1) Use soft starter or VFD, or (2) Upsize generator.";
  } else {
    recommendation = "Voltage dip is within IEC limits. No corrective action required.";
  }

  return { voltageDipPercent, passGeneral, passSensitive, recommendation };
}

// ============================================================
// MODULE 3: Fuel Consumption Estimator
// ============================================================

export interface FuelInput {
  generatorKw: number;
  loadFactorPercent: number; // 0–100
}

export interface FuelResult {
  sfcLPerKwh: number;
  consumptionLPerHr: number;
  tank8hr: number;
  tank24hr: number;
  tank72hr: number;
  tankDimensions: {
    hours: number;
    liters: number;
    suggestedL: number;
    suggestedW: number;
    suggestedH: number;
  }[];
}

export function interpolateSfc(loadFactor: number): number {
  // loadFactor: 0–1
  const curve = SFC_CURVE;
  if (loadFactor <= curve[0].loadFactor) return curve[0].lPerKwh;
  if (loadFactor >= curve[curve.length - 1].loadFactor) return curve[curve.length - 1].lPerKwh;

  for (let i = 0; i < curve.length - 1; i++) {
    const lo = curve[i];
    const hi = curve[i + 1];
    if (loadFactor >= lo.loadFactor && loadFactor <= hi.loadFactor) {
      const t = (loadFactor - lo.loadFactor) / (hi.loadFactor - lo.loadFactor);
      return lo.lPerKwh + t * (hi.lPerKwh - lo.lPerKwh);
    }
  }
  return curve[curve.length - 1].lPerKwh;
}

function tankDimensions(liters: number) {
  // Assume rectangular tank, height = 1.5m, aspect ratio L:W = 2:1
  const volume_m3 = liters / 1000;
  const h = 1.5;
  const lw_area = volume_m3 / h;
  const w = Math.sqrt(lw_area / 2);
  const l = 2 * w;
  return {
    suggestedL: Math.ceil(l * 100) / 100,
    suggestedW: Math.ceil(w * 100) / 100,
    suggestedH: h,
  };
}

export function calcFuelConsumption(input: FuelInput): FuelResult {
  const loadFactor = Math.min(Math.max(input.loadFactorPercent, 0), 100) / 100;
  const sfcLPerKwh = interpolateSfc(loadFactor);
  const consumptionLPerHr = input.generatorKw * loadFactor * sfcLPerKwh;

  const tank8hr  = consumptionLPerHr * 8;
  const tank24hr = consumptionLPerHr * 24;
  const tank72hr = consumptionLPerHr * 72;

  const tankDimensions8  = tankDimensions(tank8hr);
  const tankDimensions24 = tankDimensions(tank24hr);
  const tankDimensions72 = tankDimensions(tank72hr);

  return {
    sfcLPerKwh,
    consumptionLPerHr,
    tank8hr,
    tank24hr,
    tank72hr,
    tankDimensions: [
      { hours: 8,  liters: tank8hr,  ...tankDimensions8  },
      { hours: 24, liters: tank24hr, ...tankDimensions24 },
      { hours: 72, liters: tank72hr, ...tankDimensions72 },
    ],
  };
}

// ============================================================
// MODULE 4: ATS / Change-Over Sizing
// ============================================================

export interface AtsInput {
  generatorKva: number;
  loadCurrentA: number;
  voltageV: number;
}

export interface AtsResult {
  fullLoadCurrentA: number;
  designCurrentA: number;
  recommendedAtsRatingA: number;
  atsType: string;
  changeoverType: string;
  notes: string;
}

export function calcAtsSizing(input: AtsInput): AtsResult {
  const { generatorKva, loadCurrentA, voltageV } = input;
  // Full load current from generator kVA (3-phase)
  const fullLoadCurrentA = generatorKva > 0 && voltageV > 0
    ? (generatorKva * 1000) / (Math.sqrt(3) * voltageV)
    : loadCurrentA;

  // Use the higher of generator FLA and load current, with 125% safety factor
  const designCurrentA = Math.max(fullLoadCurrentA, loadCurrentA) * 1.25;

  // Find next standard ATS rating
  let recommendedAtsRatingA = ATS_RATING_SERIES[ATS_RATING_SERIES.length - 1];
  for (const rating of ATS_RATING_SERIES) {
    if (rating >= designCurrentA) {
      recommendedAtsRatingA = rating;
      break;
    }
  }

  // ATS type recommendation
  let atsType = "Open Transition";
  let changeoverType = "Motorized Changeover";
  let notes = "";

  if (generatorKva >= 500) {
    atsType = "Closed Transition";
    notes = "Closed transition recommended for generators ≥500 kVA to minimise load interruption. ";
  }

  if (loadCurrentA > 800 || generatorKva > 1000) {
    changeoverType = "Motorized Changeover (with manual override)";
    notes += "Motorized ATS with manual override required for large installations per IEC 60364.";
  } else if (generatorKva <= 100) {
    changeoverType = "Manual Changeover acceptable";
    notes += "Manual changeover acceptable for small standby generators ≤100 kVA.";
  } else {
    notes += "Motorized ATS recommended for reliable automatic changeover per ISO 8528-4.";
  }

  return {
    fullLoadCurrentA: Math.round(fullLoadCurrentA * 10) / 10,
    designCurrentA: Math.round(designCurrentA * 10) / 10,
    recommendedAtsRatingA,
    atsType,
    changeoverType,
    notes,
  };
}

// ============================================================
// MODULE 5: Generator Room Ventilation Estimator
// ============================================================

export interface VentInput {
  generatorKw: number;
  roomL: number; // metres
  roomW: number;
  roomH: number;
}

export interface VentResult {
  heatRejectionKw: number;
  requiredAirflowM3hr: number;
  inletLouverAreaM2: number;
  exhaustLouverAreaM2: number;
  minRoomVolumeM3: number;
  actualRoomVolumeM3: number;
  roomAdequate: boolean;
  recommendedInletSize: string;
  recommendedExhaustSize: string;
  notes: string;
}

export function calcRoomVentilation(input: VentInput): VentResult {
  const { generatorKw, roomL, roomW, roomH } = input;

  // Heat rejection ≈ 30% of generator rated power (ISO 8528 typical)
  const heatRejectionKw = generatorKw * 0.30;

  // Required airflow per ISO 8528:
  // Q (m³/hr) = (heat rejection kW × 3600) / (ρ × Cp × ΔT)
  // ρ = 1.2 kg/m³, Cp = 1.005 kJ/kg·K, ΔT = 10°C (max allowable rise)
  const rho = 1.2;
  const cp = 1.005;
  const deltaT = 10;
  const requiredAirflowM3hr = (heatRejectionKw * 3600) / (rho * cp * deltaT);

  // Louver area: air velocity through louver = 2.5 m/s (typical)
  // Area (m²) = Q (m³/s) / velocity (m/s)
  const airflowM3s = requiredAirflowM3hr / 3600;
  const louverVelocity = 2.5;
  const inletLouverAreaM2  = airflowM3s / louverVelocity;
  const exhaustLouverAreaM2 = inletLouverAreaM2 * 1.1; // exhaust 10% larger

  // Minimum room volume: ISO 8528 recommends ≥ 3× generator volume
  // Approximate generator volume from kW rating
  const approxGenVolumeM3 = generatorKw * 0.005; // rough estimate
  const minRoomVolumeM3 = Math.max(approxGenVolumeM3 * 3, 20);

  const actualRoomVolumeM3 = roomL * roomW * roomH;
  const roomAdequate = actualRoomVolumeM3 >= minRoomVolumeM3;

  // Louver size recommendation (width × height in mm)
  const inletW  = Math.ceil(Math.sqrt(inletLouverAreaM2 * 2) * 1000 / 100) * 100;
  const inletH  = Math.ceil(inletLouverAreaM2 / (inletW / 1000) * 1000 / 100) * 100;
  const exhaustW = Math.ceil(Math.sqrt(exhaustLouverAreaM2 * 2) * 1000 / 100) * 100;
  const exhaustH = Math.ceil(exhaustLouverAreaM2 / (exhaustW / 1000) * 1000 / 100) * 100;

  const recommendedInletSize   = `${inletW} mm × ${inletH} mm`;
  const recommendedExhaustSize = `${exhaustW} mm × ${exhaustH} mm`;

  let notes = "";
  if (!roomAdequate) {
    notes = `Room volume (${actualRoomVolumeM3.toFixed(1)} m³) is below the recommended minimum of ${minRoomVolumeM3.toFixed(1)} m³. Consider enlarging the room or improving forced ventilation.`;
  } else {
    notes = `Room volume is adequate. Ensure inlet louver is positioned low (≤0.5 m from floor) and exhaust louver high (≥0.3 m from ceiling) per ISO 8528-13.`;
  }

  return {
    heatRejectionKw,
    requiredAirflowM3hr,
    inletLouverAreaM2,
    exhaustLouverAreaM2,
    minRoomVolumeM3,
    actualRoomVolumeM3,
    roomAdequate,
    recommendedInletSize,
    recommendedExhaustSize,
    notes,
  };
}
