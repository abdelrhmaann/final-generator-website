// ============================================================
// GenSizer Pro — Shared Calculation Engine
// All formulas implemented per IEC 60034, ISO 8528, IEC 60364,
// IEC 60909, IEC 60947, IEC 60076, IEC 61800.
// ============================================================

// ── Standard Generator kVA Series ─────────────────────────────
// Source: Cummins, Caterpillar, FG Wilson published kVA ratings.
export const STANDARD_KVA_SERIES = [
  20, 30, 40, 45, 50, 63, 75, 100, 125, 150, 200,
  250, 300, 350, 400, 450, 500, 550, 630, 700, 750, 875,
  1000, 1250, 1500, 2000, 2250,
];

// ── Standard Subtransient Reactance X"d by Generator Size ───
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
// Diesel: L/kWh at given load factor (ISO 8528-5 Annex B)
export const SFC_CURVE = [
  { loadFactor: 0.25, lPerKwh: 0.40 },
  { loadFactor: 0.50, lPerKwh: 0.33 },
  { loadFactor: 0.75, lPerKwh: 0.29 },
  { loadFactor: 1.00, lPerKwh: 0.27 },
];

// ── Motor Starting kVA Multipliers ──────────────────────────
export const MOTOR_START_MULTIPLIERS: Record<string, number> = {
  "resistive":        1.0,
  "inductive":        1.0,   // passive inductive, negligible inrush
  "transformer":      8.0,   // transformer / reactor inrush per IEC 60076-1 (6–12×, 8 conservative midpoint)
  "motor-dol":        6.0,   // DOL: 6× FLA
  "motor-star-delta": 2.0,   // Star-Delta: ~2× FLA (1/3 of DOL)
  "motor-vfd":        1.05,  // VFD: current-limited soft start ~1.0–1.1× FLA per IEC 61800-3
};

// ── Load Type Labels ─────────────────────────────────────────
export const LOAD_TYPE_LABELS: Record<string, string> = {
  "resistive":        "Resistive",
  "inductive":        "Inductive (passive)",
  "transformer":      "Transformer / Reactor (IEC 60076-1)",
  "motor-dol":        "Motor (DOL)",
  "motor-star-delta": "Motor (Star-Delta)",
  "motor-vfd":        "Motor (VFD) — IEC 61800-3",
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
  xdPercent: number;
  motorStartingKva: number;
}

export interface VoltageDipResult {
  voltageDipPercent: number;
  passGeneral: boolean;
  passSensitive: boolean;
  recommendation: string;
}

export function calcVoltageDip(input: VoltageDipInput): VoltageDipResult {
  const { generatorKva, xdPercent, motorStartingKva } = input;

  if (xdPercent <= 0 || generatorKva <= 0) {
    return {
      voltageDipPercent: 0,
      passGeneral: false,
      passSensitive: false,
      recommendation: "Invalid input: generator kVA and X\"d must be greater than zero.",
    };
  }

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
  customSfcLPerKwh?: number; // optional manufacturer SFC override
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
    bulkStorageRequired?: boolean;
    note?: string;
  }[];
  isBelowNoLoad: boolean;
  minIdleConsumptionLPerHr: number;
  sfcWarning?: string;
}

export function interpolateSfc(loadFactor: number): number {
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

const DAY_TANK_MAX_LITERS = 1000; // NFPA 110 §7.9 day tank limit

function tankDimensions(liters: number) {
  const volume_m3 = liters / 1000;
  const h = 1.5;
  const lw_area = volume_m3 / h;
  const w = Math.sqrt(lw_area / 2);
  const l = 2 * w;
  const bulkStorageRequired = liters > DAY_TANK_MAX_LITERS;
  return {
    suggestedL: Math.ceil(l * 100) / 100,
    suggestedW: Math.ceil(w * 100) / 100,
    suggestedH: h,
    bulkStorageRequired,
    note: bulkStorageRequired
      ? "Volume exceeds 1000 L day tank limit. Provide separate bulk storage tank with day-tank transfer pump (NFPA 110 §7.9 / IEC 60364-7-710)."
      : undefined,
  };
}

export function calcFuelConsumption(input: FuelInput): FuelResult {
  if (input.generatorKw <= 0) {
    console.warn("calcFuelConsumption: generatorKw must be > 0");
    return {
      sfcLPerKwh: 0, consumptionLPerHr: 0, tank8hr: 0, tank24hr: 0, tank72hr: 0,
      tankDimensions: [],
      isBelowNoLoad: false, minIdleConsumptionLPerHr: 0,
    };
  }

  const lfClamped = Math.min(Math.max(input.loadFactorPercent, 0), 100);
  const loadFactor = lfClamped / 100;

  let sfcLPerKwh = interpolateSfc(loadFactor);
  let sfcWarning: string | undefined;

  if (input.customSfcLPerKwh !== undefined) {
    if (input.customSfcLPerKwh >= 0.20 && input.customSfcLPerKwh <= 0.60) {
      sfcLPerKwh = input.customSfcLPerKwh;
    } else {
      sfcWarning = "Custom SFC out of expected range [0.20–0.60 L/kWh]. Using standard ISO 8528-5 curve.";
    }
  }

  const consumptionLPerHr = input.generatorKw * loadFactor * sfcLPerKwh;

  // Min no-load consumption: ~28% of full-load consumption (ISO 8528-5 Annex B)
  const minIdleConsumptionLPerHr = input.generatorKw * 0.28 * SFC_CURVE[SFC_CURVE.length - 1].lPerKwh;
  const isBelowNoLoad = consumptionLPerHr < minIdleConsumptionLPerHr;

  const tank8hr  = consumptionLPerHr * 8;
  const tank24hr = consumptionLPerHr * 24;
  const tank72hr = consumptionLPerHr * 72;

  return {
    sfcLPerKwh,
    consumptionLPerHr,
    tank8hr,
    tank24hr,
    tank72hr,
    tankDimensions: [
      { hours: 8,  liters: tank8hr,  ...tankDimensions(tank8hr)  },
      { hours: 24, liters: tank24hr, ...tankDimensions(tank24hr) },
      { hours: 72, liters: tank72hr, ...tankDimensions(tank72hr) },
    ],
    isBelowNoLoad,
    minIdleConsumptionLPerHr,
    sfcWarning,
  };
}

// ============================================================
// MODULE 4: ATS / Change-Over Sizing
// ============================================================

export interface AtsInput {
  generatorKva: number;
  loadCurrentA: number;
  voltageV: number;
  phases: 1 | 3;
  mainsCurrentA?: number;
}

export interface AtsResult {
  fullLoadCurrentA: number;
  designCurrentA: number;
  recommendedAtsRatingA: number;
  atsType: string;
  changeoverType: string;
  notes: string;
  phases: 1 | 3;
  governingCurrent: string;
}

export function calcAtsSizing(input: AtsInput): AtsResult {
  const { generatorKva, loadCurrentA, voltageV, phases, mainsCurrentA } = input;

  if (voltageV <= 0) {
    return {
      fullLoadCurrentA: 0,
      designCurrentA: 0,
      recommendedAtsRatingA: ATS_RATING_SERIES[0],
      atsType: "—",
      changeoverType: "—",
      notes: "Invalid voltage input.",
      phases,
      governingCurrent: "Invalid input",
    };
  }

  const fullLoadCurrentA = generatorKva > 0
    ? phases === 3
      ? (generatorKva * 1000) / (Math.sqrt(3) * voltageV)
      : (generatorKva * 1000) / voltageV
    : loadCurrentA;

  const mains = mainsCurrentA ?? 0;
  const candidates: { v: number; label: string }[] = [
    { v: fullLoadCurrentA, label: "Generator FLA" },
    { v: loadCurrentA,     label: "Load current" },
    { v: mains,            label: "Mains supply current" },
  ];
  const governing = candidates.reduce((a, b) => b.v > a.v ? b : a);
  const designCurrentA = governing.v * 1.25;

  let recommendedAtsRatingA = ATS_RATING_SERIES[ATS_RATING_SERIES.length - 1];
  for (const rating of ATS_RATING_SERIES) {
    if (rating >= designCurrentA) { recommendedAtsRatingA = rating; break; }
  }

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
    notes += "Motorized ATS recommended per ISO 8528-4 / IEC 60947-6-1 §7.1.2.";
  }

  return {
    fullLoadCurrentA: Math.round(fullLoadCurrentA * 10) / 10,
    designCurrentA: Math.round(designCurrentA * 10) / 10,
    recommendedAtsRatingA,
    atsType,
    changeoverType,
    notes,
    phases,
    governingCurrent: governing.label,
  };
}

// ============================================================
// MODULE 5: Generator Room Ventilation Estimator
// ============================================================

export interface VentInput {
  generatorKw: number;
  roomL: number;
  roomW: number;
  roomH: number;
  coolingConfig: "radiator-in-room" | "remote-radiator";
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
  coolingConfig: "radiator-in-room" | "remote-radiator";
  louverAtMinimum?: boolean;
}

export function calcRoomVentilation(input: VentInput): VentResult {
  const { generatorKw, roomL, roomW, roomH, coolingConfig } = input;

  if (roomL <= 0 || roomW <= 0 || roomH <= 0) {
    return {
      heatRejectionKw: 0, requiredAirflowM3hr: 0, inletLouverAreaM2: 0, exhaustLouverAreaM2: 0,
      minRoomVolumeM3: 0, actualRoomVolumeM3: 0, roomAdequate: false,
      recommendedInletSize: "—", recommendedExhaustSize: "—",
      notes: "Invalid room dimensions.",
      coolingConfig,
    };
  }

  // Heat rejection per ISO 8528-13 §5.2
  const heatRejectionKw = coolingConfig === "radiator-in-room"
    ? generatorKw * 0.32   // radiator discharges into room
    : generatorKw * 0.07;  // remote radiator: only engine surface radiation

  const rho = 1.2;
  const cp = 1.005;
  const deltaT = 10;
  const requiredAirflowM3hr = (heatRejectionKw * 3600) / (rho * cp * deltaT);

  const airflowM3s = requiredAirflowM3hr / 3600;
  const louverVelocity = 2.5;
  const inletLouverAreaM2  = airflowM3s / louverVelocity;
  const exhaustLouverAreaM2 = inletLouverAreaM2 * 1.1;

  const approxGenVolumeM3 = generatorKw * 0.005;
  const minRoomVolumeM3 = Math.max(approxGenVolumeM3 * 3, 20);
  const actualRoomVolumeM3 = roomL * roomW * roomH;
  const roomAdequate = actualRoomVolumeM3 >= minRoomVolumeM3;

  const minDimMm = 300;
  let inletW  = Math.ceil(Math.sqrt(inletLouverAreaM2 * 2) * 1000 / 100) * 100;
  let inletH  = Math.ceil(inletLouverAreaM2 / (inletW / 1000) * 1000 / 100) * 100;
  let exhaustW = Math.ceil(Math.sqrt(exhaustLouverAreaM2 * 2) * 1000 / 100) * 100;
  let exhaustH = Math.ceil(exhaustLouverAreaM2 / (exhaustW / 1000) * 1000 / 100) * 100;

  let louverAtMinimum = false;
  if (inletW < minDimMm || inletH < minDimMm || exhaustW < minDimMm || exhaustH < minDimMm) {
    louverAtMinimum = true;
    inletW = Math.max(inletW, minDimMm);
    inletH = Math.max(inletH, minDimMm);
    exhaustW = Math.max(exhaustW, minDimMm);
    exhaustH = Math.max(exhaustH, minDimMm);
  }

  const recommendedInletSize   = `${inletW} mm × ${inletH} mm`;
  const recommendedExhaustSize = `${exhaustW} mm × ${exhaustH} mm`;

  let notes = "";
  if (!roomAdequate) {
    notes = `Room volume (${actualRoomVolumeM3.toFixed(1)} m³) is below the recommended minimum of ${minRoomVolumeM3.toFixed(1)} m³. Consider enlarging the room or improving forced ventilation. `;
  } else {
    notes = `Room volume is adequate. Ensure inlet louver is positioned low (≤0.5 m from floor) and exhaust louver high (≥0.3 m from ceiling) per ISO 8528-13. `;
  }
  if (louverAtMinimum) {
    notes += "Louver sized to minimum practical dimensions (300×300 mm). Actual free area exceeds minimum requirement.";
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
    coolingConfig,
    louverAtMinimum,
  };
}

// ============================================================
// MODULE 6: Generator Site Derating (ISO 8528-1 §12.3)
// ============================================================

export interface DeratingInput {
  ratedKva: number;
  altitudeM: number;
  ambientTempC: number;
}

export interface DeratingResult {
  temperatureFactorKt: number;
  altitudeFactorKa: number;
  combinedDeratingFactor: number;
  deratedKva: number;
  deratedKw: number;
  ratedKva: number;
  deratingPercent: number;
  recommendation: string;
  isStandardConditions: boolean;
}

export function calcDerating(input: DeratingInput): DeratingResult {
  const KT = input.ambientTempC <= 25
    ? 1.0
    : 1.0 - (input.ambientTempC - 25) * 0.010;
  const KA = input.altitudeM <= 1000
    ? 1.0
    : 1.0 - ((input.altitudeM - 1000) / 100) * 0.010;

  const combinedDeratingFactor = Math.max(0, KT * KA);
  const deratedKva = input.ratedKva * combinedDeratingFactor;
  const deratedKw = deratedKva * 0.8;
  const deratingPercent = (1 - combinedDeratingFactor) * 100;
  const isStandardConditions = input.ambientTempC <= 25 && input.altitudeM <= 1000;

  let recommendation = "";
  if (isStandardConditions) {
    recommendation = "Site conditions are within ISO 8528-1 reference conditions. No derating required.";
  } else if (deratingPercent < 5) {
    recommendation = `Minor derating of ${deratingPercent.toFixed(1)}%. Consider the next standard kVA size for comfort margin.`;
  } else if (deratingPercent < 15) {
    recommendation = `Significant derating of ${deratingPercent.toFixed(1)}%. You MUST specify a ${Math.ceil(input.ratedKva / Math.max(combinedDeratingFactor, 0.01))}-kVA rated generator at standard conditions to achieve ${input.ratedKva} kVA at site.`;
  } else {
    recommendation = `Severe derating of ${deratingPercent.toFixed(1)}%. Consult manufacturer for a site-rated (tropicalised) generator set. Standard catalogue ratings will not apply.`;
  }

  return {
    temperatureFactorKt: KT,
    altitudeFactorKa: KA,
    combinedDeratingFactor,
    deratedKva,
    deratedKw,
    ratedKva: input.ratedKva,
    deratingPercent,
    recommendation,
    isStandardConditions,
  };
}

// ============================================================
// MODULE 7: Short-Circuit Current (IEC 60909-0)
// ============================================================

export interface ShortCircuitInput {
  generatorKva: number;
  voltageV: number;
  xdSubtransientPct: number;
  xdTransientPct: number;
  xdSteadyStatePct: number;
}

export interface ShortCircuitResult {
  subtransientFaultCurrentKA: number;
  transientFaultCurrentKA: number;
  steadyStateFaultCurrentKA: number;
  peakFaultCurrentKA: number;
  faultLevelKVA: number;
  recommendation: string;
}

export function calcShortCircuit(input: ShortCircuitInput): ShortCircuitResult {
  if (input.generatorKva <= 0 || input.voltageV <= 0 || input.xdSubtransientPct <= 0) {
    return {
      subtransientFaultCurrentKA: 0, transientFaultCurrentKA: 0, steadyStateFaultCurrentKA: 0,
      peakFaultCurrentKA: 0, faultLevelKVA: 0,
      recommendation: "Invalid input — kVA, voltage and X\"d must be > 0.",
    };
  }

  const Sn = input.generatorKva * 1000;
  const Vn = input.voltageV;
  const Ibase = Sn / (Math.sqrt(3) * Vn);
  const cFactor = 1.05;

  const subtransientFaultCurrentKA = (cFactor * Ibase) / (input.xdSubtransientPct / 100) / 1000;
  const transientFaultCurrentKA    = (cFactor * Ibase) / (Math.max(input.xdTransientPct, 0.01) / 100) / 1000;
  const steadyStateFaultCurrentKA  = (cFactor * Ibase) / (Math.max(input.xdSteadyStatePct, 0.01) / 100) / 1000;

  const kappa = 1.8;
  const peakFaultCurrentKA = kappa * Math.sqrt(2) * subtransientFaultCurrentKA;
  const faultLevelKVA = subtransientFaultCurrentKA * 1000 * Math.sqrt(3) * Vn / 1000;

  let recommendation = "";
  if (subtransientFaultCurrentKA < 1) {
    recommendation = "Low fault current. Verify protection relay settings — overcurrent relays may not detect high-impedance faults.";
  } else if (subtransientFaultCurrentKA > 50) {
    recommendation = `Very high fault current (${subtransientFaultCurrentKA.toFixed(1)} kA). Verify switchgear rated breaking capacity (ICU / ICS) exceeds this value per IEC 60947-2.`;
  } else {
    recommendation = `Generator contributes ${subtransientFaultCurrentKA.toFixed(2)} kA to fault. Size protection relays and switchgear breaking capacity ≥ ${Math.ceil(peakFaultCurrentKA)} kA peak per IEC 60947-2 / IEC 60909-0.`;
  }

  return {
    subtransientFaultCurrentKA,
    transientFaultCurrentKA,
    steadyStateFaultCurrentKA,
    peakFaultCurrentKA,
    faultLevelKVA,
    recommendation,
  };
}
