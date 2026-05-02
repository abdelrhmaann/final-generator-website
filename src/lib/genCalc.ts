// ============================================================
// Generator Sizing Calculation Engine
// IEC 60034 · ISO 8528 · IEC 60364
// Pure functions — no UI deps.
// ============================================================

export const STANDARD_KVA_SERIES = [
  20, 30, 40, 50, 63, 75, 100, 125, 150, 200,
  250, 300, 400, 500, 630, 750, 1000, 1250, 1500, 2000, 2250,
];

export const XD_BY_KVA: { kva: number; xd: number }[] = [
  { kva: 20, xd: 16 }, { kva: 30, xd: 16 }, { kva: 40, xd: 16 }, { kva: 50, xd: 16 },
  { kva: 63, xd: 17 }, { kva: 75, xd: 17 }, { kva: 100, xd: 18 }, { kva: 125, xd: 18 },
  { kva: 150, xd: 19 }, { kva: 200, xd: 20 }, { kva: 250, xd: 20 }, { kva: 300, xd: 21 },
  { kva: 400, xd: 22 }, { kva: 500, xd: 23 }, { kva: 630, xd: 24 }, { kva: 750, xd: 25 },
  { kva: 1000, xd: 26 }, { kva: 1250, xd: 27 }, { kva: 1500, xd: 28 },
  { kva: 2000, xd: 28 }, { kva: 2250, xd: 29 },
];

export const SFC_CURVE = [
  { loadFactor: 0.25, lPerKwh: 0.40 },
  { loadFactor: 0.50, lPerKwh: 0.33 },
  { loadFactor: 0.75, lPerKwh: 0.29 },
  { loadFactor: 1.00, lPerKwh: 0.27 },
];

export const MOTOR_START_MULTIPLIERS: Record<string, number> = {
  "resistive": 1.0,
  "inductive": 1.0,
  "motor-dol": 6.0,
  "motor-star-delta": 2.0,
  "motor-vfd": 1.5,
};

export const LOAD_TYPE_LABELS: Record<string, string> = {
  "resistive": "Resistive",
  "inductive": "Inductive",
  "motor-dol": "Motor (DOL)",
  "motor-star-delta": "Motor (Star-Delta)",
  "motor-vfd": "Motor (VFD)",
};

export const ATS_RATING_SERIES = [
  63, 100, 125, 160, 200, 250, 315, 400, 500, 630,
  800, 1000, 1250, 1600, 2000, 2500, 3200, 4000,
];

export function getNextStandardKva(required: number): number {
  for (const kva of STANDARD_KVA_SERIES) if (kva >= required) return kva;
  return STANDARD_KVA_SERIES[STANDARD_KVA_SERIES.length - 1];
}

// ── Module 1: Generator kVA Sizing (Step Load) ────────────
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
  peakKvaAtThisStep: number;
}

export interface GenSizingResult {
  steps: StepResult[];
  totalRunningKw: number;
  totalRunningKva: number;
  maxStartingKva: number;
  maxPeakKva: number;
  requiredGenKva: number;
  recommendedGenKva: number;
  loadingPercent: number;
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
    ? (cumulativeRunningKva / recommendedGenKva) * 100 : 0;

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

// ── Module 2: Voltage Dip ────────────
export interface VoltageDipResult {
  voltageDipPercent: number;
  passGeneral: boolean;
  passSensitive: boolean;
  recommendation: string;
}

export function calcVoltageDip(
  generatorKva: number, xdPercent: number, motorStartingKva: number,
): VoltageDipResult {
  const xdDecimal = xdPercent / 100;
  const denominator = generatorKva / xdDecimal + motorStartingKva;
  const voltageDipPercent = denominator > 0
    ? (motorStartingKva / denominator) * 100 : 0;
  const passGeneral = voltageDipPercent < 15;
  const passSensitive = voltageDipPercent < 10;
  let recommendation = "";
  if (!passGeneral) {
    recommendation = "Voltage dip exceeds 15% IEC limit. Increase generator kVA, use a soft starter, or specify a VFD.";
  } else if (!passSensitive) {
    recommendation = "Voltage dip exceeds 10% limit for sensitive loads. Soft starter / VFD recommended, or upsize generator.";
  } else {
    recommendation = "Voltage dip within IEC limits. No corrective action required.";
  }
  return { voltageDipPercent, passGeneral, passSensitive, recommendation };
}

// ── Module 3: Fuel Consumption ────────────
export function interpolateSfc(loadFactor: number): number {
  const c = SFC_CURVE;
  if (loadFactor <= c[0].loadFactor) return c[0].lPerKwh;
  if (loadFactor >= c[c.length - 1].loadFactor) return c[c.length - 1].lPerKwh;
  for (let i = 0; i < c.length - 1; i++) {
    const lo = c[i], hi = c[i + 1];
    if (loadFactor >= lo.loadFactor && loadFactor <= hi.loadFactor) {
      const t = (loadFactor - lo.loadFactor) / (hi.loadFactor - lo.loadFactor);
      return lo.lPerKwh + t * (hi.lPerKwh - lo.lPerKwh);
    }
  }
  return c[c.length - 1].lPerKwh;
}

function tankDimensions(liters: number) {
  const volume_m3 = liters / 1000;
  const h = 1.5;
  const w = Math.sqrt((volume_m3 / h) / 2);
  const l = 2 * w;
  return {
    suggestedL: Math.ceil(l * 100) / 100,
    suggestedW: Math.ceil(w * 100) / 100,
    suggestedH: h,
  };
}

export interface FuelResult {
  sfcLPerKwh: number;
  consumptionLPerHr: number;
  tanks: { hours: number; liters: number; suggestedL: number; suggestedW: number; suggestedH: number }[];
}

export function calcFuelConsumption(generatorKw: number, loadFactorPercent: number): FuelResult {
  const lf = Math.min(Math.max(loadFactorPercent, 0), 100) / 100;
  const sfcLPerKwh = interpolateSfc(lf);
  const consumptionLPerHr = generatorKw * lf * sfcLPerKwh;
  return {
    sfcLPerKwh,
    consumptionLPerHr,
    tanks: [8, 24, 72].map(h => {
      const liters = consumptionLPerHr * h;
      return { hours: h, liters, ...tankDimensions(liters) };
    }),
  };
}

// ── Module 4: ATS ────────────
export interface AtsResult {
  fullLoadCurrentA: number;
  designCurrentA: number;
  recommendedAtsRatingA: number;
  atsType: string;
  changeoverType: string;
  notes: string;
}

export function calcAtsSizing(generatorKva: number, loadCurrentA: number, voltageV: number): AtsResult {
  const fullLoadCurrentA = generatorKva > 0 && voltageV > 0
    ? (generatorKva * 1000) / (Math.sqrt(3) * voltageV) : loadCurrentA;
  const designCurrentA = Math.max(fullLoadCurrentA, loadCurrentA) * 1.25;
  let recommendedAtsRatingA = ATS_RATING_SERIES[ATS_RATING_SERIES.length - 1];
  for (const rating of ATS_RATING_SERIES) if (rating >= designCurrentA) { recommendedAtsRatingA = rating; break; }

  let atsType = "Open Transition";
  let changeoverType = "Motorized Changeover";
  let notes = "";
  if (generatorKva >= 500) {
    atsType = "Closed Transition";
    notes = "Closed transition recommended for generators ≥500 kVA to minimise load interruption. ";
  }
  if (loadCurrentA > 800 || generatorKva > 1000) {
    changeoverType = "Motorized (with manual override)";
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
    recommendedAtsRatingA, atsType, changeoverType, notes,
  };
}

// ── Module 5: Room Ventilation ────────────
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

export function calcRoomVentilation(generatorKw: number, roomL: number, roomW: number, roomH: number): VentResult {
  const heatRejectionKw = generatorKw * 0.30;
  const rho = 1.2, cp = 1.005, deltaT = 10;
  const requiredAirflowM3hr = (heatRejectionKw * 3600) / (rho * cp * deltaT);
  const airflowM3s = requiredAirflowM3hr / 3600;
  const louverVelocity = 2.5;
  const inletLouverAreaM2 = airflowM3s / louverVelocity;
  const exhaustLouverAreaM2 = inletLouverAreaM2 * 1.1;
  const approxGenVolumeM3 = generatorKw * 0.005;
  const minRoomVolumeM3 = Math.max(approxGenVolumeM3 * 3, 20);
  const actualRoomVolumeM3 = roomL * roomW * roomH;
  const roomAdequate = actualRoomVolumeM3 >= minRoomVolumeM3;
  const inletW = Math.ceil(Math.sqrt(inletLouverAreaM2 * 2) * 1000 / 100) * 100;
  const inletH = Math.ceil(inletLouverAreaM2 / (inletW / 1000) * 1000 / 100) * 100;
  const exhaustW = Math.ceil(Math.sqrt(exhaustLouverAreaM2 * 2) * 1000 / 100) * 100;
  const exhaustH = Math.ceil(exhaustLouverAreaM2 / (exhaustW / 1000) * 1000 / 100) * 100;
  const notes = roomAdequate
    ? `Room volume adequate. Position inlet louver low (≤0.5 m from floor) and exhaust high (≥0.3 m from ceiling) per ISO 8528-13.`
    : `Room volume (${actualRoomVolumeM3.toFixed(1)} m³) below the recommended minimum of ${minRoomVolumeM3.toFixed(1)} m³. Enlarge the room or improve forced ventilation.`;
  return {
    heatRejectionKw, requiredAirflowM3hr,
    inletLouverAreaM2, exhaustLouverAreaM2,
    minRoomVolumeM3, actualRoomVolumeM3, roomAdequate,
    recommendedInletSize: `${inletW} mm × ${inletH} mm`,
    recommendedExhaustSize: `${exhaustW} mm × ${exhaustH} mm`,
    notes,
  };
}
