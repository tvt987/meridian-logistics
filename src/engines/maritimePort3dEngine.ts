export type PortContainerKind = 'dry-40' | 'reefer-40' | 'hazmat-imo3';

export type SolasStabilityVerdict = 'NOMINAL' | 'ADVISORY' | 'CRITICAL';

export type SeaStateMode = 'calm' | 'storm';

export type CameraPresetId = 'quay-overview' | 'crane-cabin' | 'vessel-bow';

export type CranePhase =
  | 'IDLE'
  | 'SLEW_TO_QUAY'
  | 'LOWER_SPREADER'
  | 'LATCH'
  | 'HOIST'
  | 'TROLLEY_OVER_BAY'
  | 'PLACE_ON_SHIP'
  | 'RETURN';

export interface PortContainerSpec {
  kind: PortContainerKind;
  code: string;
  labelEn: string;
  labelVi: string;
  shortLabel: string;
  weightTonnes: number;
  tareTonnes: number;
  cargoTonnes: number;
  palette: readonly string[];
  accentHex: string;
  reeferTempC: number | null;
  imoClass: string | null;
}

export interface PortContainer {
  id: string;
  kind: PortContainerKind;
  bay: number; // 0..3 (Bow -> Stern)
  col: number; // 0..4 (Port -> Starboard)
  tier: number; // 0..3 (Bottom -> Top)
  weightTonnes: number;
  colorHex: string;
  reeferTempC: number | null;
  imoClass: string | null;
}

export interface VesselStabilityReport {
  containerCount: number;
  teuCount: number;
  maxSlots: number;
  utilizationPct: number;
  totalVgmTonnes: number;
  displacementTonnes: number;
  cgX: number; // Lateral CG in meters (- Port, + Starboard)
  cgY: number; // Vertical KG above keel in meters
  cgZ: number; // Longitudinal CG in meters (- Bow, + Stern)
  gmMeters: number; // Transverse Metacentric Height GM (m)
  heelAngleDeg: number; // Signed roll/heel angle (+ Starboard list, - Port list)
  absHeelAngleDeg: number;
  trimPitchDeg: number; // Signed trim pitch (+ Stern down, - Bow down)
  draftMeters: number;
  portWeightTonnes: number;
  centerWeightTonnes: number;
  starboardWeightTonnes: number;
  dryCount: number;
  reeferCount: number;
  hazmatCount: number;
  verdict: SolasStabilityVerdict;
  solasCompliant: boolean;
  advisoryEn: string;
  advisoryVi: string;
}

export interface Vec3Tuple {
  x: number;
  y: number;
  z: number;
}

export interface CraneJob {
  craneIndex: 0 | 1;
  container: PortContainer;
  pickupPos: Vec3Tuple;
  targetPos: Vec3Tuple;
}

export interface CraneRuntimeState {
  craneIndex: 0 | 1;
  phase: CranePhase;
  phaseElapsedSec: number;
  phaseProgress: number; // 0..1
  gantryZ: number;
  trolleyX: number;
  spreaderY: number;
  swayRad: number;
  twistLockEngaged: boolean;
  carryingContainer: PortContainer | null;
  attachedContainerPos: Vec3Tuple | null;
  activeJob: CraneJob | null;
  queue: CraneJob[];
  completedLifts: number;
}

export interface CraneStepResult {
  nextState: CraneRuntimeState;
  placedContainer: PortContainer | null;
}

export interface OceanMotionSample {
  heaveY: number;
  waveRollRad: number;
  wavePitchRad: number;
  waveHeightM: number;
  windKnots: number;
}

export interface CameraPresetPose {
  id: CameraPresetId;
  position: readonly [number, number, number];
  target: readonly [number, number, number];
}

/* ============================================================================
 * PHYSICAL & GEOMETRIC CONSTANTS — CÁI MÉP – THỊ VẢI DEEP-WATER TERMINAL
 * ============================================================================ */

export const VESSEL_BAY_COUNT = 4;
export const VESSEL_COL_COUNT = 5;
export const VESSEL_TIER_COUNT = 4;
export const VESSEL_MAX_SLOTS =
  VESSEL_BAY_COUNT * VESSEL_COL_COUNT * VESSEL_TIER_COUNT; // 80 FEU (160 TEU active deck block)

// 3D Stage spatial geometry (right-handed Y-up; Quay on -X, Harbor Water on +X, Bow on -Z, Bridge on +Z)
export const SHIP_CENTER_X = 2.4;
export const QUAY_EDGE_X = -5.2;
export const QUAY_PICKUP_X = -10.8;
export const QUAY_DECK_Y = 2.2;
export const SHIP_DECK_Y = 3.15;

export const CONTAINER_LENGTH_M = 4.25; // along Z
export const CONTAINER_WIDTH_M = 1.92; // along X
export const CONTAINER_HEIGHT_M = 1.65; // along Y

export const BAY_SPACING_M = 4.85;
export const COL_SPACING_M = 2.18;
export const TIER_SPACING_M = 1.68;

export const CRANE_BOOM_Y = 16.6;
export const CRANE_SAFE_HOIST_Y = 12.6;
export const CRANE_STANDBY_TROLLEY_X = -6.4;
export const CRANE_HOME_Z: readonly [number, number] = [-4.85, 4.85];
export const SPREADER_HEIGHT_M = 0.52;

// Hydrostatic naval architecture constants (calibrated for active 80-FEU bay block)
const HULL_BALLAST_TONNES = 1700;
const HULL_BASE_KG_M = 2.4;
const TRANSVERSE_KM_M = 6.2;
const LONGITUDINAL_KM_M = 44.0;
const DECK_KEEL_HEIGHT_M = 3.0;
const HYDROSTATIC_TIER_STEP_M = 2.15;
const HYDROSTATIC_COL_ARM_M = 2.8; // ISO 2.44m container + 0.36m cell guide clearance
const HYDROSTATIC_BAY_ARM_M = 13.5; // 40ft container 12.2m + 1.3m bulkhead
const BASE_LIGHTSHIP_DRAFT_M = 10.4;

export const SOLAS_NOMINAL_HEEL_MAX_DEG = 2.0;
export const SOLAS_ADVISORY_HEEL_MAX_DEG = 4.5;
export const SOLAS_MIN_HEALTHY_GM_M = 1.5;
export const SOLAS_CRITICAL_GM_M = 0.8;

export const PORT_CONTAINER_SPECS: Record<PortContainerKind, PortContainerSpec> = {
  'dry-40': {
    kind: 'dry-40',
    code: '40GP',
    labelEn: '40FT DRY',
    labelVi: '40FT KHÔ',
    shortLabel: 'DRY 26.5t',
    weightTonnes: 26.5,
    tareTonnes: 3.7,
    cargoTonnes: 22.8,
    palette: ['#1D4ED8', '#C2410C', '#0F4C81', '#B45309'] as const,
    accentHex: '#38BDF8',
    reeferTempC: null,
    imoClass: null,
  },
  'reefer-40': {
    kind: 'reefer-40',
    code: '40RF',
    labelEn: '40FT REEFER (-18°C)',
    labelVi: '40FT LẠNH (-18°C)',
    shortLabel: 'REEFER 29.2t',
    weightTonnes: 29.2,
    tareTonnes: 4.4,
    cargoTonnes: 24.8,
    palette: ['#F8FAFC'] as const,
    accentHex: '#06B6D4',
    reeferTempC: -18.0,
    imoClass: null,
  },
  'hazmat-imo3': {
    kind: 'hazmat-imo3',
    code: '40DG',
    labelEn: 'HAZMAT IMO-3',
    labelVi: 'NGUY HIỂM IMO-3',
    shortLabel: 'HAZMAT 31.8t',
    weightTonnes: 31.8,
    tareTonnes: 4.1,
    cargoTonnes: 27.7,
    palette: ['#D97706'] as const,
    accentHex: '#DC2626',
    reeferTempC: null,
    imoClass: 'IMO-3',
  },
};

export const CRANE_PHASE_DURATIONS: Record<Exclude<CranePhase, 'IDLE'>, number> = {
  SLEW_TO_QUAY: 0.55,
  LOWER_SPREADER: 0.5,
  LATCH: 0.25,
  HOIST: 0.65,
  TROLLEY_OVER_BAY: 0.9,
  PLACE_ON_SHIP: 0.65,
  RETURN: 0.5,
};

export const CRANE_PHASE_ORDER: readonly CranePhase[] = [
  'IDLE',
  'SLEW_TO_QUAY',
  'LOWER_SPREADER',
  'LATCH',
  'HOIST',
  'TROLLEY_OVER_BAY',
  'PLACE_ON_SHIP',
  'RETURN',
] as const;

export const CAMERA_PRESETS: Record<CameraPresetId, CameraPresetPose> = {
  'quay-overview': {
    id: 'quay-overview',
    position: [37.5, 22.8, -30.5],
    target: [-3.2, 8.8, 0.8],
  },
  'crane-cabin': {
    id: 'crane-cabin',
    position: [-9.2, 15.8, -17.5],
    target: [2.4, 5.2, 1.8],
  },
  'vessel-bow': {
    id: 'vessel-bow',
    position: [18.5, 9.6, -32.5],
    target: [0.4, 6.2, 2.0],
  },
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function easeInOutCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export function slotKey(bay: number, col: number, tier: number): string {
  return `${bay}-${col}-${tier}`;
}

export function getCraneIndexForBay(bay: number): 0 | 1 {
  return bay <= 1 ? 0 : 1;
}

export function getBayZ(bay: number): number {
  return round2((bay - (VESSEL_BAY_COUNT - 1) / 2) * BAY_SPACING_M);
}

export function getColLocalX(col: number): number {
  return round2((col - (VESSEL_COL_COUNT - 1) / 2) * COL_SPACING_M);
}

export function getTierLocalY(tier: number): number {
  return round2(
    SHIP_DECK_Y + CONTAINER_HEIGHT_M / 2 + tier * TIER_SPACING_M,
  );
}

/** Local position of a container center inside the vessel group */
export function getSlotLocalPosition(
  bay: number,
  col: number,
  tier: number,
): Vec3Tuple {
  return {
    x: getColLocalX(col),
    y: getTierLocalY(tier),
    z: getBayZ(bay),
  };
}

/** World position of a container center when vessel is level */
export function getSlotWorldPosition(
  bay: number,
  col: number,
  tier: number,
): Vec3Tuple {
  return {
    x: round2(SHIP_CENTER_X + getColLocalX(col)),
    y: getTierLocalY(tier),
    z: getBayZ(bay),
  };
}

/** Deterministic factory for creating a typed 40ft container */
export function createPortContainer(
  kind: PortContainerKind,
  bay: number,
  col: number,
  tier: number,
  seq: number,
): PortContainer {
  const spec = PORT_CONTAINER_SPECS[kind];
  const prefix =
    kind === 'reefer-40' ? 'MRDR' : kind === 'hazmat-imo3' ? 'MRDH' : 'MRDU';
  const serial = String(401000 + seq * 17 + bay * 7 + col * 3).slice(0, 6);
  const colorHex = spec.palette[Math.abs(seq + bay + col) % spec.palette.length];
  return {
    id: `${prefix}-${serial}`,
    kind,
    bay,
    col,
    tier,
    weightTonnes: spec.weightTonnes,
    colorHex,
    reeferTempC: spec.reeferTempC,
    imoClass: spec.imoClass,
  };
}

/**
 * Generates a realistic, balanced initial 24-container deck stow across 4 bays × 5 columns
 * on MV MERIDIAN VANGUARD berthed at Cái Mép – Thị Vải Deep-Water Terminal.
 * Symmetric port/starboard distribution guarantees NOMINAL heel (< 0.4°) & healthy GM (> 2.6m).
 */
export function createInitialPortContainers(): PortContainer[] {
  const layout: Array<{
    bay: number;
    col: number;
    tier: number;
    kind: PortContainerKind;
  }> = [
    // Bay 0 (Bow): 6 containers symmetric
    { bay: 0, col: 0, tier: 0, kind: 'dry-40' },
    { bay: 0, col: 1, tier: 0, kind: 'reefer-40' },
    { bay: 0, col: 2, tier: 0, kind: 'dry-40' },
    { bay: 0, col: 3, tier: 0, kind: 'reefer-40' },
    { bay: 0, col: 4, tier: 0, kind: 'dry-40' },
    { bay: 0, col: 2, tier: 1, kind: 'dry-40' },

    // Bay 1 (Fore-Mid): 6 containers symmetric
    { bay: 1, col: 0, tier: 0, kind: 'dry-40' },
    { bay: 1, col: 1, tier: 0, kind: 'hazmat-imo3' },
    { bay: 1, col: 2, tier: 0, kind: 'reefer-40' },
    { bay: 1, col: 3, tier: 0, kind: 'hazmat-imo3' },
    { bay: 1, col: 4, tier: 0, kind: 'dry-40' },
    { bay: 1, col: 2, tier: 1, kind: 'dry-40' },

    // Bay 2 (Aft-Mid): 6 containers symmetric
    { bay: 2, col: 0, tier: 0, kind: 'dry-40' },
    { bay: 2, col: 1, tier: 0, kind: 'dry-40' },
    { bay: 2, col: 2, tier: 0, kind: 'hazmat-imo3' },
    { bay: 2, col: 3, tier: 0, kind: 'dry-40' },
    { bay: 2, col: 4, tier: 0, kind: 'dry-40' },
    { bay: 2, col: 2, tier: 1, kind: 'reefer-40' },

    // Bay 3 (Stern): 6 containers symmetric
    { bay: 3, col: 0, tier: 0, kind: 'dry-40' },
    { bay: 3, col: 1, tier: 0, kind: 'reefer-40' },
    { bay: 3, col: 2, tier: 0, kind: 'dry-40' },
    { bay: 3, col: 3, tier: 0, kind: 'reefer-40' },
    { bay: 3, col: 4, tier: 0, kind: 'dry-40' },
    { bay: 3, col: 2, tier: 1, kind: 'dry-40' },
  ];

  return layout.map((item, idx) =>
    createPortContainer(item.kind, item.bay, item.col, item.tier, idx + 1),
  );
}

/**
 * Computes the next available vertical tier for a specific (bay, col),
 * or finds the optimal open slot across the ship if no column is forced.
 */
export function findNextOpenSlot(
  containers: readonly PortContainer[],
  reservedSlots: readonly { bay: number; col: number; tier: number }[] = [],
  preferredBay?: number,
  preferredCol?: number,
): { bay: number; col: number; tier: number } | null {
  const occupied = new Set<string>();
  for (const c of containers) occupied.add(slotKey(c.bay, c.col, c.tier));
  for (const r of reservedSlots) occupied.add(slotKey(r.bay, r.col, r.tier));

  const nextTierInColumn = (bay: number, col: number): number | null => {
    for (let t = 0; t < VESSEL_TIER_COUNT; t++) {
      if (!occupied.has(slotKey(bay, col, t))) {
        return t;
      }
    }
    return null;
  };

  // Direct raycast click on a specific (bay, col)
  if (
    preferredBay !== undefined &&
    preferredCol !== undefined &&
    preferredBay >= 0 &&
    preferredBay < VESSEL_BAY_COUNT &&
    preferredCol >= 0 &&
    preferredCol < VESSEL_COL_COUNT
  ) {
    const tier = nextTierInColumn(preferredBay, preferredCol);
    return tier !== null ? { bay: preferredBay, col: preferredCol, tier } : null;
  }

  // Automatic smart slot selection: prefer lower tier, keeping lateral moment balanced
  let currentMomentX = 0;
  let currentMomentZ = 0;
  for (const c of containers) {
    currentMomentX += c.weightTonnes * (c.col - 2);
    currentMomentZ += c.weightTonnes * (c.bay - 1.5);
  }

  let best: { bay: number; col: number; tier: number } | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (let bay = 0; bay < VESSEL_BAY_COUNT; bay++) {
    for (let col = 0; col < VESSEL_COL_COUNT; col++) {
      const tier = nextTierInColumn(bay, col);
      if (tier === null) continue;
      const newMx = currentMomentX + 28 * (col - 2);
      const newMz = currentMomentZ + 28 * (bay - 1.5);
      // Lower tier heavily favored, then lateral stability, then longitudinal trim
      const score =
        tier * 120 + Math.abs(newMx) * 1.4 + Math.abs(newMz) * 0.45 + Math.abs(col - 2) * 3;
      if (score < bestScore) {
        bestScore = score;
        best = { bay, col, tier };
      }
    }
  }

  return best;
}

/**
 * Pure Hydrostatic Ship Stability & SOLAS VGM Physics Calculator.
 * Computes Total VGM Tonnage, 3D Center of Gravity (cgX, cgY, cgZ),
 * Transverse Metacentric Height GM (m), Heel/Roll Angle (°), Trim Pitch (°),
 * Draft (m), and SOLAS Compliance Verdict.
 */
export function computeVesselStability(
  containers: readonly PortContainer[],
): VesselStabilityReport {
  let totalVgmTonnes = 0;
  let sumMx = 0;
  let sumMy = 0;
  let sumMz = 0;
  let portWeightTonnes = 0;
  let centerWeightTonnes = 0;
  let starboardWeightTonnes = 0;
  let dryCount = 0;
  let reeferCount = 0;
  let hazmatCount = 0;

  for (const c of containers) {
    const w = c.weightTonnes;
    const armX = (c.col - (VESSEL_COL_COUNT - 1) / 2) * HYDROSTATIC_COL_ARM_M;
    const armY =
      DECK_KEEL_HEIGHT_M + (c.tier + 0.5) * HYDROSTATIC_TIER_STEP_M;
    const armZ = (c.bay - (VESSEL_BAY_COUNT - 1) / 2) * HYDROSTATIC_BAY_ARM_M;

    totalVgmTonnes += w;
    sumMx += w * armX;
    sumMy += w * armY;
    sumMz += w * armZ;

    if (c.col < 2) portWeightTonnes += w;
    else if (c.col === 2) centerWeightTonnes += w;
    else starboardWeightTonnes += w;

    if (c.kind === 'dry-40') dryCount += 1;
    else if (c.kind === 'reefer-40') reeferCount += 1;
    else hazmatCount += 1;
  }

  const displacementTonnes = HULL_BALLAST_TONNES + totalVgmTonnes;
  const cgX = sumMx / displacementTonnes;
  const cgY =
    (HULL_BALLAST_TONNES * HULL_BASE_KG_M + sumMy) / displacementTonnes;
  const cgZ = sumMz / displacementTonnes;

  // Transverse & longitudinal metacentric heights
  const gmMeters = Math.max(0.15, TRANSVERSE_KM_M - cgY);
  const gmLongitudinal = Math.max(8.0, LONGITUDINAL_KM_M - cgY);

  // Small-to-moderate angle naval hydrostatic heel: tan(phi) = M_x / (Delta * GM)
  const tanHeel = sumMx / (displacementTonnes * gmMeters);
  const heelAngleDeg = clamp(
    (Math.atan(tanHeel) * 180) / Math.PI,
    -18.0,
    18.0,
  );
  const absHeelAngleDeg = Math.abs(heelAngleDeg);

  // Longitudinal trim pitch: tan(theta) = M_z / (Delta * GM_L)
  const tanTrim = sumMz / (displacementTonnes * gmLongitudinal);
  const trimPitchDeg = clamp(
    (Math.atan(tanTrim) * 180) / Math.PI,
    -6.0,
    6.0,
  );

  // Draft increases proportionally with cargo VGM tonnage
  const draftMeters = BASE_LIGHTSHIP_DRAFT_M + (totalVgmTonnes / 1600) * 2.8;

  let verdict: SolasStabilityVerdict = 'NOMINAL';
  if (
    absHeelAngleDeg > SOLAS_ADVISORY_HEEL_MAX_DEG ||
    gmMeters < SOLAS_CRITICAL_GM_M
  ) {
    verdict = 'CRITICAL';
  } else if (
    absHeelAngleDeg >= SOLAS_NOMINAL_HEEL_MAX_DEG ||
    gmMeters < SOLAS_MIN_HEALTHY_GM_M
  ) {
    verdict = 'ADVISORY';
  }

  const sideEn =
    heelAngleDeg > 0.15 ? 'Starboard' : heelAngleDeg < -0.15 ? 'Port' : 'Even Keel';
  const sideVi =
    heelAngleDeg > 0.15 ? 'Mạn Phải' : heelAngleDeg < -0.15 ? 'Mạn Trái' : 'Cân bằng';

  let advisoryEn: string;
  let advisoryVi: string;
  if (verdict === 'CRITICAL') {
    advisoryEn = `SOLAS CRITICAL: ${absHeelAngleDeg.toFixed(1)}° ${sideEn} list exceeds 4.5° statutory limit (GM ${gmMeters.toFixed(2)}m). Execute Auto-Trim Ballast & Stow immediately.`;
    advisoryVi = `CẢNH BÁO SOLAS: Độ nghiêng ${absHeelAngleDeg.toFixed(1)}° về ${sideVi} vượt ngưỡng 4.5° (GM ${gmMeters.toFixed(2)}m). Kích hoạt Cân bằng Tự động ngay.`;
  } else if (verdict === 'ADVISORY') {
    advisoryEn = `SOLAS ADVISORY: ${absHeelAngleDeg.toFixed(1)}° ${sideEn} list / GM ${gmMeters.toFixed(2)}m approaching operational threshold. Counter-ballast or rebalance opposite wing column.`;
    advisoryVi = `KHUYẾN NGHỊ SOLAS: Độ nghiêng ${absHeelAngleDeg.toFixed(1)}° (${sideVi}) / GM ${gmMeters.toFixed(2)}m tiến sát ngưỡng. Nên xếp đối trọng mạn đối diện.`;
  } else {
    advisoryEn = `SOLAS NOMINAL: Vessel upright at ${absHeelAngleDeg.toFixed(1)}° (${sideEn}), healthy GM ${gmMeters.toFixed(2)}m, VGM ${round2(totalVgmTonnes)}t cleared for departure.`;
    advisoryVi = `ĐẠT CHUẨN SOLAS: Tàu cân bằng ${absHeelAngleDeg.toFixed(1)}° (${sideVi}), GM ${gmMeters.toFixed(2)}m an toàn, tổng VGM ${round2(totalVgmTonnes)}t đủ điều kiện rời cảng.`;
  }

  return {
    containerCount: containers.length,
    teuCount: containers.length * 2,
    maxSlots: VESSEL_MAX_SLOTS,
    utilizationPct: round2((containers.length / VESSEL_MAX_SLOTS) * 100),
    totalVgmTonnes: round2(totalVgmTonnes),
    displacementTonnes: round2(displacementTonnes),
    cgX: round2(cgX),
    cgY: round2(cgY),
    cgZ: round2(cgZ),
    gmMeters: round2(gmMeters),
    heelAngleDeg: round2(heelAngleDeg),
    absHeelAngleDeg: round2(absHeelAngleDeg),
    trimPitchDeg: round2(trimPitchDeg),
    draftMeters: round2(draftMeters),
    portWeightTonnes: round2(portWeightTonnes),
    centerWeightTonnes: round2(centerWeightTonnes),
    starboardWeightTonnes: round2(starboardWeightTonnes),
    dryCount,
    reeferCount,
    hazmatCount,
    verdict,
    solasCompliant: verdict !== 'CRITICAL',
    advisoryEn,
    advisoryVi,
  };
}

/**
 * Injects heavy Starboard containers (HAZMAT IMO-3 & REEFER) onto outer starboard columns (col 4 & 3)
 * to deliberately provoke a dramatic > 6.5° starboard heel and SOLAS CRITICAL alert.
 */
export function injectStarboardImbalance(
  containers: readonly PortContainer[],
  startSeq: number,
): { containers: PortContainer[]; added: PortContainer[]; nextSeq: number } {
  const result = containers.map((c) => ({ ...c }));
  const added: PortContainer[] = [];
  let seq = startSeq;

  const isOccupied = (bay: number, col: number, tier: number): boolean =>
    result.some((c) => c.bay === bay && c.col === col && c.tier === tier);

  const nextTier = (bay: number, col: number): number | null => {
    for (let t = 0; t < VESSEL_TIER_COUNT; t++) {
      if (!isOccupied(bay, col, t)) return t;
    }
    return null;
  };

  // Candidate heavy starboard slots prioritizing outer starboard wing (col 4) across bays
  const candidateCols = [4, 4, 4, 4, 3, 3, 4, 4, 3, 3];
  const candidateBays = [1, 2, 0, 3, 1, 2, 1, 2, 0, 3];
  const kinds: PortContainerKind[] = [
    'hazmat-imo3',
    'hazmat-imo3',
    'reefer-40',
    'hazmat-imo3',
    'hazmat-imo3',
    'reefer-40',
    'hazmat-imo3',
    'hazmat-imo3',
    'reefer-40',
    'hazmat-imo3',
  ];

  for (let i = 0; i < candidateCols.length; i++) {
    const current = computeVesselStability(result);
    if (current.heelAngleDeg >= 7.1 && added.length >= 5) {
      break;
    }
    const bay = candidateBays[i];
    const col = candidateCols[i];
    const tier = nextTier(bay, col);
    if (tier !== null) {
      const box = createPortContainer(kinds[i], bay, col, tier, seq++);
      result.push(box);
      added.push(box);
    }
  }

  // If the deck was already heavily loaded on port and heel is still below 6.8°,
  // offload up to 4 outer port containers (col 0) from top tiers downward to simulate asymmetric discharge.
  let safetyCounter = 0;
  while (computeVesselStability(result).heelAngleDeg < 6.8 && safetyCounter < 12) {
    safetyCounter++;
    // Find highest-tier container on port outer (col 0) or port inner (col 1)
    let removeIdx = -1;
    let bestPriority = -1;
    for (let i = 0; i < result.length; i++) {
      const c = result[i];
      if (c.col > 1) continue;
      const priority = (2 - c.col) * 10 + c.tier;
      if (priority > bestPriority) {
        bestPriority = priority;
        removeIdx = i;
      }
    }
    if (removeIdx === -1) break;
    result.splice(removeIdx, 1);
  }

  return { containers: result, added, nextSeq: seq };
}

/**
 * Deterministic Auto-Trim Stowage Optimizer:
 * Reassigns all onboard containers (heaviest first onto lowest tiers) across bays & columns
 * respecting physical stacking gravity (tier t requires tier t-1 beneath it), minimizing
 * transverse heeling moment, longitudinal trim moment, and vertical KG so Heel < 0.5° and GM > 1.8m.
 */
export function computeBalancedStowPlan(
  containers: readonly PortContainer[],
): PortContainer[] {
  if (containers.length === 0) return [];

  // Sort heaviest containers first so heavy HAZMAT (31.8t) & REEFER (29.2t) sit on lowest tiers (maximizes GM)
  const sorted = [...containers].sort((a, b) => {
    if (b.weightTonnes !== a.weightTonnes) return b.weightTonnes - a.weightTonnes;
    return a.id.localeCompare(b.id);
  });

  // Balanced slot order per tier:
  // Centerline slots (col 2) absorb parity & fine trim; symmetric wing pairs cancel transverse moment!
  const bayOrder = [1, 2, 0, 3];
  const centerSlots = bayOrder.map((bay) => ({ bay, col: 2 }));
  const wingPairs: Array<{
    port: { bay: number; col: number };
    stbd: { bay: number; col: number };
    armFactor: number;
  }> = [
    // Inner wings first (col 1 & col 3) for tight compact moment of inertia
    ...bayOrder.map((bay) => ({
      port: { bay, col: 1 },
      stbd: { bay, col: 3 },
      armFactor: 1,
    })),
    // Outer wings next (col 0 & col 4)
    ...bayOrder.map((bay) => ({
      port: { bay, col: 0 },
      stbd: { bay, col: 4 },
      armFactor: 2,
    })),
  ];

  const SLOTS_PER_TIER = VESSEL_BAY_COUNT * VESSEL_COL_COUNT; // 20
  const placed: PortContainer[] = [];
  let momentX = 0;

  let cursor = 0;
  for (let tier = 0; tier < VESSEL_TIER_COUNT && cursor < sorted.length; tier++) {
    const remaining = sorted.length - cursor;
    const tierCount = Math.min(SLOTS_PER_TIER, remaining);
    const tierBoxes = sorted.slice(cursor, cursor + tierCount);
    cursor += tierCount;

    // Choose how many centerline slots (0..4) to use on this tier so remaining wing count is ALWAYS EVEN.
    // Centerline slots on tier > 0 are always supported because prior tier was completely full (20/20).
    let centerCount: number;
    if (tierCount === SLOTS_PER_TIER) {
      centerCount = 4;
    } else if (tierCount <= 4) {
      centerCount = tierCount;
    } else {
      // Reserve 2 center slots if even (or 4 if > 16), 1 or 3 if odd, so wingCount is strictly even & <= 16
      const minCenter = Math.max(0, tierCount - 16);
      centerCount =
        tierCount % 2 === 1
          ? Math.max(1, minCenter % 2 === 1 ? minCenter : minCenter + 1)
          : Math.max(2, minCenter % 2 === 0 ? minCenter : minCenter + 1);
      if (centerCount > 4) centerCount = 4;
    }

    const wingCount = tierCount - centerCount; // Guaranteed even (0..16)
    const pairCount = wingCount / 2;

    // Assign heaviest boxes to symmetric wing pairs, cancelling any residual momentX
    let idx = 0;
    for (let p = 0; p < pairCount; p++) {
      const pair = wingPairs[p];
      const boxA = tierBoxes[idx++];
      const boxB = tierBoxes[idx++];

      // Put heavier of (boxA, boxB) on whichever side reduces |momentX|
      const heavyFirst = boxA.weightTonnes >= boxB.weightTonnes ? boxA : boxB;
      const lightSecond = heavyFirst === boxA ? boxB : boxA;
      const armX = pair.armFactor * HYDROSTATIC_COL_ARM_M;

      const putHeavyOnPort = momentX >= 0;
      const portBox = putHeavyOnPort ? heavyFirst : lightSecond;
      const stbdBox = putHeavyOnPort ? lightSecond : heavyFirst;

      momentX += (stbdBox.weightTonnes - portBox.weightTonnes) * armX;

      placed.push(
        { ...portBox, bay: pair.port.bay, col: pair.port.col, tier },
        { ...stbdBox, bay: pair.stbd.bay, col: pair.stbd.col, tier },
      );
    }

    // Assign remaining boxes onto centerline (armX = 0 -> zero heel contribution!)
    for (let c = 0; c < centerCount; c++) {
      const slot = centerSlots[c];
      const box = tierBoxes[idx++];
      placed.push({ ...box, bay: slot.bay, col: slot.col, tier });
    }
  }

  return placed;
}

/* ============================================================================
 * ARTICULATED STS GANTRY CRANE 8-PHASE STATE MACHINE
 * IDLE -> SLEW_TO_QUAY -> LOWER_SPREADER -> LATCH -> HOIST -> TROLLEY_OVER_BAY -> PLACE_ON_SHIP -> RETURN
 * ============================================================================ */

export function createInitialCraneState(craneIndex: 0 | 1): CraneRuntimeState {
  return {
    craneIndex,
    phase: 'IDLE',
    phaseElapsedSec: 0,
    phaseProgress: 0,
    gantryZ: CRANE_HOME_Z[craneIndex],
    trolleyX: CRANE_STANDBY_TROLLEY_X,
    spreaderY: CRANE_SAFE_HOIST_Y,
    swayRad: 0,
    twistLockEngaged: false,
    carryingContainer: null,
    attachedContainerPos: null,
    activeJob: null,
    queue: [],
    completedLifts: 0,
  };
}

export function createCraneJob(container: PortContainer): CraneJob {
  const craneIndex = getCraneIndexForBay(container.bay);
  const targetPos = getSlotWorldPosition(
    container.bay,
    container.col,
    container.tier,
  );
  const pickupPos: Vec3Tuple = {
    x: QUAY_PICKUP_X,
    y: round2(QUAY_DECK_Y + CONTAINER_HEIGHT_M / 2),
    z: targetPos.z,
  };
  return {
    craneIndex,
    container,
    pickupPos,
    targetPos,
  };
}

export function enqueueCraneJob(
  state: CraneRuntimeState,
  container: PortContainer,
): CraneRuntimeState {
  const job = createCraneJob(container);
  if (state.phase === 'IDLE' && !state.activeJob) {
    return {
      ...state,
      phase: 'SLEW_TO_QUAY',
      phaseElapsedSec: 0,
      phaseProgress: 0,
      activeJob: job,
      swayRad: 0,
    };
  }
  return {
    ...state,
    queue: [...state.queue, job],
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getNextPhase(phase: Exclude<CranePhase, 'IDLE'>): CranePhase {
  switch (phase) {
    case 'SLEW_TO_QUAY':
      return 'LOWER_SPREADER';
    case 'LOWER_SPREADER':
      return 'LATCH';
    case 'LATCH':
      return 'HOIST';
    case 'HOIST':
      return 'TROLLEY_OVER_BAY';
    case 'TROLLEY_OVER_BAY':
      return 'PLACE_ON_SHIP';
    case 'PLACE_ON_SHIP':
      return 'RETURN';
    case 'RETURN':
      return 'IDLE';
  }
}

/**
 * Pure deterministic step for an articulated STS Gantry Crane.
 * Smoothly interpolates gantryZ, trolleyX, spreaderY, cable sway, twist-lock latch,
 * and carried container coordinates across all 8 phases.
 */
export function stepCraneState(
  state: CraneRuntimeState,
  dtSeconds: number,
): CraneStepResult {
  const dt = Math.max(0, dtSeconds);
  if (state.phase === 'IDLE') {
    if (state.queue.length > 0) {
      const [nextJob, ...rest] = state.queue;
      return {
        nextState: {
          ...state,
          phase: 'SLEW_TO_QUAY',
          phaseElapsedSec: 0,
          phaseProgress: 0,
          activeJob: nextJob,
          queue: rest,
          swayRad: 0,
        },
        placedContainer: null,
      };
    }
    return { nextState: state, placedContainer: null };
  }

  const job = state.activeJob;
  if (!job) {
    return {
      nextState: { ...state, phase: 'IDLE', phaseElapsedSec: 0, phaseProgress: 0 },
      placedContainer: null,
    };
  }

  const duration = CRANE_PHASE_DURATIONS[state.phase];
  const nextElapsed = state.phaseElapsedSec + dt;
  const rawProgress = clamp(nextElapsed / duration, 0, 1);
  const eased = easeInOutCubic(rawProgress);

  const pickupSpreaderY =
    job.pickupPos.y + CONTAINER_HEIGHT_M / 2 + SPREADER_HEIGHT_M / 2;
  const targetSpreaderY =
    job.targetPos.y + CONTAINER_HEIGHT_M / 2 + SPREADER_HEIGHT_M / 2;

  let gantryZ = state.gantryZ;
  let trolleyX = state.trolleyX;
  let spreaderY = state.spreaderY;
  let swayRad = 0;
  let twistLockEngaged = state.twistLockEngaged;
  let carryingContainer = state.carryingContainer;

  switch (state.phase) {
    case 'SLEW_TO_QUAY': {
      // Smoothly move gantry to bay Z & trolley out to quay pickup lane
      const startZ =
        state.phaseElapsedSec === 0 ? state.gantryZ : state.gantryZ;
      gantryZ = lerp(startZ, job.pickupPos.z, Math.min(1, eased * 1.15));
      trolleyX = lerp(state.trolleyX, job.pickupPos.x, Math.min(1, eased * 1.15));
      spreaderY = lerp(state.spreaderY, CRANE_SAFE_HOIST_Y, eased);
      twistLockEngaged = false;
      carryingContainer = null;
      swayRad = Math.sin(rawProgress * Math.PI) * 0.03;
      break;
    }
    case 'LOWER_SPREADER': {
      gantryZ = job.pickupPos.z;
      trolleyX = job.pickupPos.x;
      spreaderY = lerp(CRANE_SAFE_HOIST_Y, pickupSpreaderY, eased);
      twistLockEngaged = false;
      carryingContainer = null;
      swayRad = 0;
      break;
    }
    case 'LATCH': {
      gantryZ = job.pickupPos.z;
      trolleyX = job.pickupPos.x;
      spreaderY = pickupSpreaderY;
      twistLockEngaged = rawProgress >= 0.35;
      carryingContainer = rawProgress >= 0.45 ? job.container : null;
      swayRad = 0;
      break;
    }
    case 'HOIST': {
      gantryZ = job.pickupPos.z;
      trolleyX = job.pickupPos.x;
      spreaderY = lerp(pickupSpreaderY, CRANE_SAFE_HOIST_Y, eased);
      twistLockEngaged = true;
      carryingContainer = job.container;
      swayRad = Math.sin(rawProgress * Math.PI * 2) * 0.015;
      break;
    }
    case 'TROLLEY_OVER_BAY': {
      gantryZ = job.targetPos.z;
      trolleyX = lerp(job.pickupPos.x, job.targetPos.x, eased);
      spreaderY = CRANE_SAFE_HOIST_Y;
      twistLockEngaged = true;
      carryingContainer = job.container;
      // Realistic pendulum lag behind trolley acceleration
      swayRad = -Math.sin(rawProgress * Math.PI) * 0.065;
      break;
    }
    case 'PLACE_ON_SHIP': {
      gantryZ = job.targetPos.z;
      trolleyX = job.targetPos.x;
      spreaderY = lerp(CRANE_SAFE_HOIST_Y, targetSpreaderY, eased);
      twistLockEngaged = rawProgress < 0.92;
      carryingContainer = rawProgress < 0.98 ? job.container : null;
      swayRad = (1 - rawProgress) * 0.015;
      break;
    }
    case 'RETURN': {
      gantryZ = job.targetPos.z;
      trolleyX = lerp(job.targetPos.x, CRANE_STANDBY_TROLLEY_X, eased);
      spreaderY = lerp(targetSpreaderY, CRANE_SAFE_HOIST_Y, Math.min(1, eased * 1.4));
      twistLockEngaged = false;
      carryingContainer = null;
      swayRad = Math.sin(rawProgress * Math.PI) * 0.025;
      break;
    }
  }

  let placedContainer: PortContainer | null = null;
  let nextPhase: CranePhase = state.phase;
  let nextPhaseElapsed = nextElapsed;
  let nextPhaseProgress = rawProgress;
  let nextActiveJob: CraneJob | null = job;
  let nextQueue = state.queue;
  let completedLifts = state.completedLifts;

  if (nextElapsed >= duration) {
    const transitioningTo = getNextPhase(state.phase);
    if (state.phase === 'PLACE_ON_SHIP') {
      placedContainer = job.container;
      carryingContainer = null;
      twistLockEngaged = false;
      completedLifts += 1;
    }

    if (transitioningTo === 'IDLE') {
      if (state.queue.length > 0) {
        const [queuedJob, ...rest] = state.queue;
        nextPhase = 'SLEW_TO_QUAY';
        nextActiveJob = queuedJob;
        nextQueue = rest;
        nextPhaseElapsed = 0;
        nextPhaseProgress = 0;
      } else {
        nextPhase = 'IDLE';
        nextActiveJob = null;
        nextPhaseElapsed = 0;
        nextPhaseProgress = 0;
        trolleyX = CRANE_STANDBY_TROLLEY_X;
        spreaderY = CRANE_SAFE_HOIST_Y;
        swayRad = 0;
      }
    } else {
      nextPhase = transitioningTo;
      nextPhaseElapsed = 0;
      nextPhaseProgress = 0;
      if (transitioningTo === 'LATCH') {
        gantryZ = job.pickupPos.z;
        trolleyX = job.pickupPos.x;
        spreaderY = pickupSpreaderY;
      } else if (transitioningTo === 'HOIST') {
        twistLockEngaged = true;
        carryingContainer = job.container;
      } else if (transitioningTo === 'TROLLEY_OVER_BAY') {
        spreaderY = CRANE_SAFE_HOIST_Y;
        carryingContainer = job.container;
      } else if (transitioningTo === 'PLACE_ON_SHIP') {
        trolleyX = job.targetPos.x;
        gantryZ = job.targetPos.z;
        carryingContainer = job.container;
      }
    }
  }

  const attachedContainerPos: Vec3Tuple | null = carryingContainer
    ? {
        x: round2(trolleyX),
        y: round2(
          spreaderY - SPREADER_HEIGHT_M / 2 - CONTAINER_HEIGHT_M / 2,
        ),
        z: round2(gantryZ),
      }
    : null;

  return {
    nextState: {
      ...state,
      phase: nextPhase,
      phaseElapsedSec: nextPhaseElapsed,
      phaseProgress: round2(nextPhaseProgress),
      gantryZ: round2(gantryZ),
      trolleyX: round2(trolleyX),
      spreaderY: round2(spreaderY),
      swayRad: round2(swayRad),
      twistLockEngaged,
      carryingContainer,
      attachedContainerPos,
      activeJob: nextActiveJob,
      queue: nextQueue,
      completedLifts,
    },
    placedContainer,
  };
}

/**
 * Multi-harmonic harbor swell & Suez storm sea-state dynamics.
 */
export function sampleOceanWaveMotion(
  timeSec: number,
  seaState: SeaStateMode,
): OceanMotionSample {
  if (seaState === 'storm') {
    const heaveY =
      Math.sin(timeSec * 1.65) * 0.44 + Math.cos(timeSec * 2.55) * 0.19;
    const waveRollRad =
      (Math.sin(timeSec * 1.25 + 0.6) * 2.7 +
        Math.cos(timeSec * 2.1) * 0.85) *
      (Math.PI / 180);
    const wavePitchRad =
      (Math.cos(timeSec * 1.55) * 1.9 + Math.sin(timeSec * 2.4) * 0.55) *
      (Math.PI / 180);
    return {
      heaveY: round2(heaveY),
      waveRollRad,
      wavePitchRad,
      waveHeightM: 3.8,
      windKnots: 38,
    };
  }

  const heaveY =
    Math.sin(timeSec * 0.85) * 0.09 + Math.cos(timeSec * 1.35) * 0.04;
  const waveRollRad = Math.sin(timeSec * 0.65) * 0.35 * (Math.PI / 180);
  const wavePitchRad = Math.cos(timeSec * 0.78) * 0.22 * (Math.PI / 180);
  return {
    heaveY: round2(heaveY),
    waveRollRad,
    wavePitchRad,
    waveHeightM: 0.6,
    windKnots: 9,
  };
}

export function getCameraPresetPose(preset: CameraPresetId): CameraPresetPose {
  return CAMERA_PRESETS[preset];
}
