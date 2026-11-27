import type {
  CargoSkuItem,
  ContainerLoadBay,
  ContainerPackingResult,
  ContainerSpec,
  ContainerTypeId,
  PlacedCartonBox,
  SkuPackingSummary,
  SolasViolationCode,
} from '../types/logistics';

export const CONTAINER_SPECS: Record<ContainerTypeId, ContainerSpec> = {
  '20ft-std': {
    id: '20ft-std',
    code: "20'GP",
    nameEn: '20ft Standard Dry',
    nameVi: 'Container 20ft Tiêu chuẩn',
    innerLengthCm: 589,
    innerWidthCm: 235,
    innerHeightCm: 239,
    maxPayloadKg: 28200,
    tareWeightKg: 2200,
    internalVolumeCbm: 33.1,
    isReefer: false,
    linkedQuoteMode: 'sea-fcl-20',
  },
  '40ft-std': {
    id: '40ft-std',
    code: "40'GP",
    nameEn: '40ft Standard Dry',
    nameVi: 'Container 40ft Tiêu chuẩn',
    innerLengthCm: 1203,
    innerWidthCm: 235,
    innerHeightCm: 239,
    maxPayloadKg: 26700,
    tareWeightKg: 3750,
    internalVolumeCbm: 67.6,
    isReefer: false,
    linkedQuoteMode: 'sea-fcl-40',
  },
  '40ft-hc': {
    id: '40ft-hc',
    code: "40'HC",
    nameEn: '40ft High Cube',
    nameVi: 'Container 40ft Cao (HC)',
    innerLengthCm: 1203,
    innerWidthCm: 235,
    innerHeightCm: 269,
    maxPayloadKg: 26500,
    tareWeightKg: 3900,
    internalVolumeCbm: 76.1,
    isReefer: false,
    linkedQuoteMode: 'sea-fcl-40',
  },
  '40ft-reefer': {
    id: '40ft-reefer',
    code: "40'RF",
    nameEn: '40ft Reefer Cold-Chain',
    nameVi: 'Container 40ft Lạnh (Reefer)',
    innerLengthCm: 1158,
    innerWidthCm: 229,
    innerHeightCm: 225,
    maxPayloadKg: 27400,
    tareWeightKg: 4800,
    internalVolumeCbm: 59.7,
    isReefer: true,
    linkedQuoteMode: 'sea-fcl-40',
  },
};

export const CONTAINER_LIST: ContainerSpec[] = [
  CONTAINER_SPECS['20ft-std'],
  CONTAINER_SPECS['40ft-std'],
  CONTAINER_SPECS['40ft-hc'],
  CONTAINER_SPECS['40ft-reefer'],
];

export const SKU_PALETTE = [
  '#0ea5e9', // cyan
  '#f59e0b', // amber
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#f43f5e', // rose
  '#06b6d4', // teal
] as const;

export interface StuffingPreset {
  id: string;
  labelEn: string;
  labelVi: string;
  containerType: ContainerTypeId;
  skus: CargoSkuItem[];
}

export const STUFFING_PRESETS: StuffingPreset[] = [
  {
    id: 'electronics-export',
    labelEn: 'AI Servers & Industrial Electronics',
    labelVi: 'Máy chủ AI & Điện tử Công nghiệp',
    containerType: '40ft-hc',
    skus: [
      {
        id: 'sku-srv',
        skuCode: 'SRV-4U',
        name: '4U Rack Server Crates',
        lengthCm: 118,
        widthCm: 76,
        heightCm: 84,
        weightKg: 145,
        qty: 36,
        stackable: true,
        color: '#0ea5e9',
      },
      {
        id: 'sku-ups',
        skuCode: 'UPS-HV',
        name: 'HV Battery & UPS Units',
        lengthCm: 95,
        widthCm: 75,
        heightCm: 80,
        weightKg: 210,
        qty: 24,
        stackable: true,
        color: '#f59e0b',
      },
      {
        id: 'sku-lid',
        skuCode: 'LDR-PRO',
        name: 'Precision LiDAR Calibration Cases',
        lengthCm: 110,
        widthCm: 76,
        heightCm: 90,
        weightKg: 82,
        qty: 12,
        stackable: false,
        color: '#10b981',
      },
    ],
  },
  {
    id: 'apparel-consol',
    labelEn: 'Vietnam Apparel & Footwear Consol',
    labelVi: 'Gom hàng May mặc & Da giày VN',
    containerType: '20ft-std',
    skus: [
      {
        id: 'sku-jkt',
        skuCode: 'TEX-6201',
        name: 'Technical Outerwear Cartons',
        lengthCm: 64,
        widthCm: 46,
        heightCm: 56,
        weightKg: 16,
        qty: 84,
        stackable: true,
        color: '#0ea5e9',
      },
      {
        id: 'sku-ftw',
        skuCode: 'FTW-6404',
        name: 'Export Athletic Footwear Cases',
        lengthCm: 58,
        widthCm: 45,
        heightCm: 46,
        weightKg: 14,
        qty: 60,
        stackable: true,
        color: '#8b5cf6',
      },
    ],
  },
  {
    id: 'reefer-coldchain',
    labelEn: 'EU Reefer Seafood & Pharma Pallets',
    labelVi: 'Pallet Thủy sản & Dược phẩm Lạnh EU',
    containerType: '40ft-reefer',
    skus: [
      {
        id: 'sku-iqf',
        skuCode: 'IQF-0306',
        name: 'IQF Frozen Shrimp Euro-Pallets',
        lengthCm: 120,
        widthCm: 100,
        heightCm: 105,
        weightKg: 680,
        qty: 26,
        stackable: true,
        color: '#06b6d4',
      },
      {
        id: 'sku-bio',
        skuCode: 'GDP-3504',
        name: 'Chilled Marine Collagen Crates',
        lengthCm: 100,
        widthCm: 100,
        heightCm: 98,
        weightKg: 420,
        qty: 10,
        stackable: true,
        color: '#10b981',
      },
    ],
  },
];

function round1(n: number): number {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function round3(n: number): number {
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}

function sanitizeSku(raw: CargoSkuItem): CargoSkuItem {
  return {
    ...raw,
    lengthCm: Math.max(5, Math.round(Number(raw.lengthCm) || 10)),
    widthCm: Math.max(5, Math.round(Number(raw.widthCm) || 10)),
    heightCm: Math.max(5, Math.round(Number(raw.heightCm) || 10)),
    weightKg: Math.max(0.5, round2(Number(raw.weightKg) || 1)),
    qty: Math.max(0, Math.min(2000, Math.floor(Number(raw.qty) || 0))),
  };
}

/**
 * Computes exact maximum cartons of a single SKU that fit inside one container
 * considering best horizontal rotation (L x W vs W x L), stackability, and max payload weight.
 */
export function computeMaxCartonsInSingleContainer(
  container: ContainerSpec,
  rawSku: CargoSkuItem,
): number {
  const sku = sanitizeSku(rawSku);
  if (sku.heightCm > container.innerHeightCm) return 0;
  if (sku.weightKg > container.maxPayloadKg) return 0;

  const layers = sku.stackable
    ? Math.floor(container.innerHeightCm / sku.heightCm)
    : 1;
  if (layers <= 0) return 0;

  const orientA =
    Math.floor(container.innerLengthCm / sku.lengthCm) *
    Math.floor(container.innerWidthCm / sku.widthCm);
  const orientB =
    Math.floor(container.innerLengthCm / sku.widthCm) *
    Math.floor(container.innerWidthCm / sku.lengthCm);

  const maxPerFloor = Math.max(orientA, orientB);
  const maxByGeometry = maxPerFloor * layers;
  const maxByPayload = Math.floor(container.maxPayloadKg / sku.weightKg);

  return Math.max(0, Math.min(maxByGeometry, maxByPayload));
}

function cartonCanEverFit(container: ContainerSpec, sku: CargoSkuItem): boolean {
  if (sku.heightCm > container.innerHeightCm) return false;
  if (sku.weightKg > container.maxPayloadKg) return false;
  const fitsA =
    sku.lengthCm <= container.innerLengthCm &&
    sku.widthCm <= container.innerWidthCm;
  const fitsB =
    sku.widthCm <= container.innerLengthCm &&
    sku.lengthCm <= container.innerWidthCm;
  return fitsA || fitsB;
}

interface ActiveColumn {
  x: number;
  y: number;
  colL: number;
  colW: number;
  zTop: number;
  topL: number;
  topW: number;
  topSkuId: string;
  topStackable: boolean;
}

interface ActiveBay {
  xStart: number;
  bayLength: number;
  yUsed: number;
  skuHint: string;
  columns: ActiveColumn[];
}

interface WorkingContainer {
  index: number;
  nextX: number;
  usedWeightKg: number;
  usedVolumeCm3: number;
  momentXKgCm: number;
  momentYKgCm: number;
  momentZKgCm: number;
  bays: ActiveBay[];
  placedBoxes: PlacedCartonBox[];
}

function createWorkingContainer(index: number): WorkingContainer {
  return {
    index,
    nextX: 0,
    usedWeightKg: 0,
    usedVolumeCm3: 0,
    momentXKgCm: 0,
    momentYKgCm: 0,
    momentZKgCm: 0,
    bays: [],
    placedBoxes: [],
  };
}

function getValidOrientations(
  l: number,
  w: number,
  maxL: number,
  maxW: number,
): { l: number; w: number }[] {
  const result: { l: number; w: number }[] = [];
  if (l <= maxL && w <= maxW) {
    result.push({ l, w });
  }
  if (w !== l && w <= maxL && l <= maxW) {
    result.push({ l: w, w: l });
  }
  return result;
}

function tryPlaceInContainer(
  wc: WorkingContainer,
  container: ContainerSpec,
  sku: CargoSkuItem,
  boxSeq: number,
): boolean {
  if (wc.usedWeightKg + sku.weightKg > container.maxPayloadKg + 1e-6) {
    return false;
  }

  // 1. Try stacking onto an existing stackable column (prefer same SKU, then tightest footprint fit)
  let bestCol: { col: ActiveColumn; l: number; w: number; score: number } | null =
    null;

  for (const bay of wc.bays) {
    for (const col of bay.columns) {
      if (!col.topStackable) continue;
      if (col.zTop + sku.heightCm > container.innerHeightCm) continue;
      const orients = getValidOrientations(
        sku.lengthCm,
        sku.widthCm,
        col.topL,
        col.topW,
      );
      for (const o of orients) {
        const waste = col.topL * col.topW - o.l * o.w;
        const sameSkuBonus = col.topSkuId === sku.id ? -1_000_000 : 0;
        const score = sameSkuBonus + waste + col.x * 2;
        if (!bestCol || score < bestCol.score) {
          bestCol = { col, l: o.l, w: o.w, score };
        }
      }
    }
  }

  if (bestCol) {
    const { col, l, w } = bestCol;
    const z = col.zTop;
    col.zTop += sku.heightCm;
    col.topL = l;
    col.topW = w;
    col.topSkuId = sku.id;
    col.topStackable = sku.stackable;

    recordBox(wc, sku, boxSeq, col.x, col.y, z, l, w, sku.heightCm);
    return true;
  }

  // 2. Try placing a new floor column inside an existing transverse bay
  let bestBay: { bay: ActiveBay; l: number; w: number; score: number } | null =
    null;

  for (const bay of wc.bays) {
    const remW = container.innerWidthCm - bay.yUsed;
    const orients = getValidOrientations(
      sku.lengthCm,
      sku.widthCm,
      bay.bayLength,
      remW,
    );
    for (const o of orients) {
      const lengthWaste = bay.bayLength - o.l;
      const sameSkuBonus = bay.skuHint === sku.id ? -500_000 : 0;
      const score = sameSkuBonus + lengthWaste * 100 + bay.xStart;
      if (!bestBay || score < bestBay.score) {
        bestBay = { bay, l: o.l, w: o.w, score };
      }
    }
  }

  if (bestBay) {
    const { bay, l, w } = bestBay;
    const col: ActiveColumn = {
      x: bay.xStart,
      y: bay.yUsed,
      colL: l,
      colW: w,
      zTop: sku.heightCm,
      topL: l,
      topW: w,
      topSkuId: sku.id,
      topStackable: sku.stackable,
    };
    bay.yUsed += w;
    bay.columns.push(col);
    recordBox(wc, sku, boxSeq, col.x, col.y, 0, l, w, sku.heightCm);
    return true;
  }

  // 3. Open a new transverse bay along container length X
  const remL = container.innerLengthCm - wc.nextX;
  const newBayOrients = getValidOrientations(
    sku.lengthCm,
    sku.widthCm,
    remL,
    container.innerWidthCm,
  );
  if (newBayOrients.length === 0) {
    return false;
  }

  // Pick orientation that maximizes transverse width utilization (highest columns across width)
  newBayOrients.sort((a, b) => {
    const colsA = Math.floor(container.innerWidthCm / a.w);
    const colsB = Math.floor(container.innerWidthCm / b.w);
    const widthEffA = (colsA * a.w) / container.innerWidthCm;
    const widthEffB = (colsB * b.w) / container.innerWidthCm;
    if (Math.abs(widthEffB - widthEffA) > 0.02) {
      return widthEffB - widthEffA;
    }
    return a.l - b.l;
  });

  const chosen = newBayOrients[0];
  const bay: ActiveBay = {
    xStart: wc.nextX,
    bayLength: chosen.l,
    yUsed: chosen.w,
    skuHint: sku.id,
    columns: [
      {
        x: wc.nextX,
        y: 0,
        colL: chosen.l,
        colW: chosen.w,
        zTop: sku.heightCm,
        topL: chosen.l,
        topW: chosen.w,
        topSkuId: sku.id,
        topStackable: sku.stackable,
      },
    ],
  };
  wc.nextX += chosen.l;
  wc.bays.push(bay);
  recordBox(wc, sku, boxSeq, bay.xStart, 0, 0, chosen.l, chosen.w, sku.heightCm);
  return true;
}

function recordBox(
  wc: WorkingContainer,
  sku: CargoSkuItem,
  boxSeq: number,
  x: number,
  y: number,
  z: number,
  l: number,
  w: number,
  h: number,
): void {
  wc.usedWeightKg += sku.weightKg;
  wc.usedVolumeCm3 += l * w * h;
  wc.momentXKgCm += (x + l / 2) * sku.weightKg;
  wc.momentYKgCm += (y + w / 2) * sku.weightKg;
  wc.momentZKgCm += (z + h / 2) * sku.weightKg;
  wc.placedBoxes.push({
    id: `${sku.id}-${boxSeq}`,
    containerIndex: wc.index,
    skuId: sku.id,
    skuCode: sku.skuCode,
    skuName: sku.name,
    color: sku.color,
    x,
    y,
    z,
    l,
    w,
    h,
    weightKg: sku.weightKg,
    stackable: sku.stackable,
  });
}

/**
 * Evaluates IMO/ILO/UNECE CTU Code & SOLAS Chapter VI Regulation 2 (e-VGM)
 * structural compliance for a loaded ISO container bay.
 */
export function evaluateSolasVgmCompliance(params: {
  container: ContainerSpec;
  usedWeightKg: number;
  cgXPct: number;
  cgYPct: number;
  cgZPct: number;
  cartonCount: number;
  unfitCartons?: number;
}): {
  vgmGrossKg: number;
  maxGrossSolasKg: number;
  solasVgmCompliant: boolean;
  solasViolations: SolasViolationCode[];
} {
  const { container, usedWeightKg, cgXPct, cgYPct, cgZPct, cartonCount } =
    params;
  const unfitCartons = params.unfitCartons ?? 0;
  const vgmGrossKg = round2(container.tareWeightKg + usedWeightKg);
  const maxGrossSolasKg = round2(container.tareWeightKg + container.maxPayloadKg);
  const violations: SolasViolationCode[] = [];

  if (usedWeightKg > container.maxPayloadKg + 1e-6) {
    violations.push('OVERWEIGHT_PAYLOAD');
  }
  if (unfitCartons > 0) {
    violations.push('OVERSIZE_CARGO');
  }
  if (cartonCount > 0) {
    if (cgXPct < 36 || cgXPct > 64) {
      violations.push('LONGITUDINAL_IMBALANCE');
    }
    if (cgYPct < 38 || cgYPct > 62) {
      violations.push('LATERAL_IMBALANCE');
    }
    if (cgZPct > 58) {
      violations.push('HIGH_VERTICAL_CG');
    }
  }

  return {
    vgmGrossKg,
    maxGrossSolasKg,
    solasVgmCompliant: violations.length === 0,
    solasViolations: violations,
  };
}

/**
 * Optimizes multi-SKU carton stuffing across one or more ISO containers.
 */
export function optimizeContainerLoad(
  containerType: ContainerTypeId,
  rawSkus: CargoSkuItem[],
): ContainerPackingResult {
  const container = CONTAINER_SPECS[containerType] ?? CONTAINER_SPECS['40ft-hc'];
  const sanitizedSkus = rawSkus.map(sanitizeSku);

  // Order SKUs: stackable heavier/larger bases first so fragile non-stackable items can crown columns cleanly!
  const orderedSkus = [...sanitizedSkus].sort((a, b) => {
    if (a.stackable !== b.stackable) {
      return a.stackable ? -1 : 1;
    }
    const volA = a.lengthCm * a.widthCm * a.heightCm;
    const volB = b.lengthCm * b.widthCm * b.heightCm;
    if (volB !== volA) return volB - volA;
    return b.weightKg - a.weightKg;
  });

  const workingContainers: WorkingContainer[] = [];
  const loadedBySku = new Map<string, number>();
  const unfitBySku = new Map<string, number>();

  let boxSeq = 1;

  for (const sku of orderedSkus) {
    if (sku.qty <= 0) {
      loadedBySku.set(sku.id, 0);
      unfitBySku.set(sku.id, 0);
      continue;
    }

    if (!cartonCanEverFit(container, sku)) {
      loadedBySku.set(sku.id, 0);
      unfitBySku.set(sku.id, sku.qty);
      continue;
    }

    let loadedCount = 0;
    for (let i = 0; i < sku.qty; i += 1) {
      let placed = false;
      for (const wc of workingContainers) {
        if (tryPlaceInContainer(wc, container, sku, boxSeq)) {
          placed = true;
          boxSeq += 1;
          break;
        }
      }
      if (!placed) {
        const nextContainer = createWorkingContainer(workingContainers.length);
        workingContainers.push(nextContainer);
        if (tryPlaceInContainer(nextContainer, container, sku, boxSeq)) {
          placed = true;
          boxSeq += 1;
        }
      }
      if (placed) {
        loadedCount += 1;
      }
    }

    loadedBySku.set(sku.id, loadedCount);
    unfitBySku.set(sku.id, sku.qty - loadedCount);
  }

  if (workingContainers.length === 0) {
    workingContainers.push(createWorkingContainer(0));
  }

  const containerInternalCm3 =
    container.innerLengthCm * container.innerWidthCm * container.innerHeightCm;

  const totalRequestedCartons = sanitizedSkus.reduce((acc, s) => acc + s.qty, 0);
  const totalLoadedRaw = workingContainers.reduce(
    (acc, wc) => acc + wc.placedBoxes.length,
    0,
  );
  const unfitCartons = totalRequestedCartons - totalLoadedRaw;

  const containers: ContainerLoadBay[] = workingContainers.map((wc, idx) => {
    const usedVolumeCbm = round3(wc.usedVolumeCm3 / 1_000_000);
    const usedWeightKg = round2(wc.usedWeightKg);
    const volumeUtilizationPct = Math.min(
      100,
      round1((wc.usedVolumeCm3 / containerInternalCm3) * 100),
    );
    const payloadUtilizationPct = Math.min(
      100,
      round1((usedWeightKg / container.maxPayloadKg) * 100),
    );
    const cgXPct =
      usedWeightKg > 0
        ? round1(
            (wc.momentXKgCm / (usedWeightKg * container.innerLengthCm)) * 100,
          )
        : 50;
    const cgYPct =
      usedWeightKg > 0
        ? round1(
            (wc.momentYKgCm / (usedWeightKg * container.innerWidthCm)) * 100,
          )
        : 50;
    const cgZPct =
      usedWeightKg > 0
        ? round1(
            (wc.momentZKgCm / (usedWeightKg * container.innerHeightCm)) * 100,
          )
        : 0;

    // Statically determinate beam reaction along container length (X=0 kingpin/front, X=L rear tandem)
    const rearAxleSharePct = usedWeightKg > 0 ? cgXPct : 50;
    const frontAxleSharePct = round1(100 - rearAxleSharePct);
    const rightSideSharePct = usedWeightKg > 0 ? cgYPct : 50;
    const leftSideSharePct = round1(100 - rightSideSharePct);

    const solasAudit = evaluateSolasVgmCompliance({
      container,
      usedWeightKg,
      cgXPct,
      cgYPct,
      cgZPct,
      cartonCount: wc.placedBoxes.length,
      unfitCartons: idx === 0 ? unfitCartons : 0,
    });

    return {
      index: wc.index,
      cartonCount: wc.placedBoxes.length,
      usedVolumeCbm,
      volumeUtilizationPct,
      usedWeightKg,
      payloadUtilizationPct,
      centerOfGravityPct: cgXPct,
      cgXPct,
      cgYPct,
      cgZPct,
      frontAxleSharePct,
      rearAxleSharePct,
      leftSideSharePct,
      rightSideSharePct,
      vgmGrossKg: solasAudit.vgmGrossKg,
      maxGrossSolasKg: solasAudit.maxGrossSolasKg,
      solasVgmCompliant: solasAudit.solasVgmCompliant,
      solasViolations: solasAudit.solasViolations,
      placedBoxes: wc.placedBoxes,
    };
  });

  const totalLoadedCartons = containers.reduce(
    (acc, c) => acc + c.cartonCount,
    0,
  );
  const totalCargoVolumeCbm = round3(
    containers.reduce((acc, c) => acc + c.usedVolumeCbm, 0),
  );
  const totalCargoWeightKg = round2(
    containers.reduce((acc, c) => acc + c.usedWeightKg, 0),
  );

  const activeContainerCount = totalLoadedCartons > 0 ? containers.length : 1;
  const volumeUtilizationPct = Math.min(
    100,
    round1(
      (totalCargoVolumeCbm /
        (activeContainerCount * container.internalVolumeCbm)) *
        100,
    ),
  );
  const payloadUtilizationPct = Math.min(
    100,
    round1(
      (totalCargoWeightKg / (activeContainerCount * container.maxPayloadKg)) *
        100,
    ),
  );

  let limitingFactor: ContainerPackingResult['limitingFactor'] = 'volume';
  if (unfitCartons > 0 && totalLoadedCartons === 0) {
    limitingFactor = 'dimensions';
  } else if (payloadUtilizationPct > volumeUtilizationPct) {
    limitingFactor = 'payload';
  }

  const firstBay = containers[0];
  const firstCog = firstBay?.cgXPct ?? 50;
  let balanceStatus: ContainerPackingResult['balanceStatus'] = 'balanced';
  if (totalLoadedCartons > 0) {
    if (firstCog < 36) balanceStatus = 'nose-heavy';
    else if (firstCog > 64) balanceStatus = 'tail-heavy';
  }

  const allViolations = Array.from(
    new Set(containers.flatMap((c) => c.solasViolations)),
  );
  const allCompliant =
    unfitCartons === 0 && containers.every((c) => c.solasVgmCompliant);

  const skuBreakdown: SkuPackingSummary[] = sanitizedSkus.map((sku) => {
    const loadedQty = loadedBySku.get(sku.id) ?? 0;
    const unfitQty = unfitBySku.get(sku.id) ?? 0;
    const unitVolumeCbm = round3(
      (sku.lengthCm * sku.widthCm * sku.heightCm) / 1_000_000,
    );
    const totalVolumeCbm = round3(unitVolumeCbm * loadedQty);
    const totalWeightKg = round2(sku.weightKg * loadedQty);
    const volumeSharePct =
      totalCargoVolumeCbm > 0
        ? round1((totalVolumeCbm / totalCargoVolumeCbm) * 100)
        : 0;
    return {
      skuId: sku.id,
      skuCode: sku.skuCode,
      name: sku.name,
      color: sku.color,
      requestedQty: sku.qty,
      loadedQty,
      unfitQty,
      maxPerSingleContainer: computeMaxCartonsInSingleContainer(container, sku),
      unitVolumeCbm,
      totalVolumeCbm,
      totalWeightKg,
      volumeSharePct,
      stackable: sku.stackable,
    };
  });

  return {
    container,
    containersRequired: totalLoadedCartons > 0 ? containers.length : 0,
    totalRequestedCartons,
    totalLoadedCartons,
    unfitCartons,
    totalCargoVolumeCbm,
    totalCargoWeightKg,
    volumeUtilizationPct,
    payloadUtilizationPct,
    limitingFactor,
    centerOfGravityPct: firstCog,
    cgXPct: firstBay?.cgXPct ?? 50,
    cgYPct: firstBay?.cgYPct ?? 50,
    cgZPct: firstBay?.cgZPct ?? 0,
    frontAxleSharePct: firstBay?.frontAxleSharePct ?? 50,
    rearAxleSharePct: firstBay?.rearAxleSharePct ?? 50,
    vgmGrossKg: firstBay?.vgmGrossKg ?? container.tareWeightKg,
    maxGrossSolasKg:
      firstBay?.maxGrossSolasKg ??
      container.tareWeightKg + container.maxPayloadKg,
    solasVgmCompliant: allCompliant,
    solasViolations: allViolations,
    balanceStatus,
    skuBreakdown,
    containers,
  };
}
