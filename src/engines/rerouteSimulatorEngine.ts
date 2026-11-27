import { FX_USD_TO_VND } from '../data/corridors';
import type {
  DisruptionScenarioId,
  DisruptionScenarioMeta,
  RerouteCargoProfile,
  RerouteModeId,
  RerouteOptionResult,
  RerouteSimulationInput,
  RerouteSimulationResult,
} from '../types/logistics';
import { getCorridorById } from './freight';

export const DISRUPTION_SCENARIOS: DisruptionScenarioMeta[] = [
  {
    id: 'red-sea-suez',
    code: 'SUEZ-CAPE',
    severity: 'critical',
    titleEn: 'Red Sea / Suez Transit Closure',
    titleVi: 'Đóng tuyến Biển Đỏ / Kênh đào Suez',
    subtitleEn:
      'Vessels divert around Cape of Good Hope (+12d EU ocean transit, +34% war-risk & bunker surcharge, +22% ocean CO2e).',
    subtitleVi:
      'Tàu biển vòng qua Mũi Hảo Vọng (+12 ngày tuyến Âu, +34% phụ phí rủi ro chiến tranh & nhiên liệu, +22% phát thải CO2e).',
    affectedRegionsEn: 'VN ↔ EU / Mediterranean',
    affectedRegionsVi: 'Việt Nam ↔ Châu Âu / Địa Trung Hải',
    oceanDelayBadge: '+12d EU / +2d Global',
  },
  {
    id: 'cat-lai-congestion',
    code: 'VNSGN-PEAK',
    severity: 'high',
    titleEn: 'Cat Lai Peak-Season Congestion (+4d)',
    titleVi: 'Ùn tắc Cao điểm Cảng Cát Lái (+4 ngày)',
    subtitleEn:
      'Yard density >92% at VNSGN triggers +4d vessel berth dwell, container detention & terminal priority surcharges.',
    subtitleVi:
      'Mật độ bãi >92% tại Cát Lái gây chờ cầu bến +4 ngày, phát sinh phí lưu bãi/DEM-DET & ưu tiên hạ bãi.',
    affectedRegionsEn: 'Ho Chi Minh City Export Gateways',
    affectedRegionsVi: 'Cửa ngõ Xuất khẩu TP.HCM',
    oceanDelayBadge: '+4d Berth Dwell',
  },
  {
    id: 'uswc-port-strike',
    code: 'USWC-ILWU',
    severity: 'critical',
    titleEn: 'US West Coast Port Strike',
    titleVi: 'Đình công Cảng Bờ Tây Hoa Kỳ (USWC)',
    subtitleEn:
      'Terminal lockout at Los Angeles / Long Beach adds +9d Pacific anchorage queue & $1,450 diversion/chassis fees.',
    subtitleVi:
      'Tê liệt xếp dỡ tại Los Angeles / Long Beach gây xếp hàng neo đậu +9 ngày & phụ phí chuyển cảng $1,450.',
    affectedRegionsEn: 'VN ↔ US West Coast (USLAX / USLGB)',
    affectedRegionsVi: 'Việt Nam ↔ Bờ Tây Mỹ (USLAX / USLGB)',
    oceanDelayBadge: '+9d USWC / +2d Ripple',
  },
];

export const REROUTE_CARGO_PROFILES: RerouteCargoProfile[] = [
  {
    id: 'ai-semiconductor-eu',
    labelEn: 'EU AI Servers ($180k · 24d SLA)',
    labelVi: 'Máy chủ AI xuất EU ($180k · SLA 24 ngày)',
    corridorId: 'vn-eu-sea',
    cargoWeightKg: 4200,
    cargoVolumeCbm: 22,
    cargoValueUsd: 180000,
    slaDeadlineDays: 24,
  },
  {
    id: 'us-industrial-cnc',
    labelEn: 'US CNC Robotics ($220k · 20d SLA)',
    labelVi: 'Robot CNC xuất Mỹ ($220k · SLA 20 ngày)',
    corridorId: 'vn-us-sea',
    cargoWeightKg: 5800,
    cargoVolumeCbm: 26,
    cargoValueUsd: 220000,
    slaDeadlineDays: 20,
  },
  {
    id: 'eu-apparel-drop',
    labelEn: 'Seasonal Apparel Drop ($95k · 30d SLA)',
    labelVi: 'Thời trang Mùa vụ EU ($95k · SLA 30 ngày)',
    corridorId: 'vn-eu-sea',
    cargoWeightKg: 6400,
    cargoVolumeCbm: 32,
    cargoValueUsd: 95000,
    slaDeadlineDays: 30,
  },
];

interface CorridorProfileSpec {
  oceanDays: number;
  seaAirDays: number;
  airDays: number;
  oceanKm: number;
  airKm: number;
  hubCode: string;
  hubNameEn: string;
  hubNameVi: string;
  isEuropeLane: boolean;
  isUsWestCoastLane: boolean;
}

const CORRIDOR_PROFILES: Record<string, CorridorProfileSpec> = {
  'vn-eu-sea': {
    oceanDays: 28,
    seaAirDays: 14,
    airDays: 3,
    oceanKm: 16480,
    airKm: 9660,
    hubCode: 'DXB',
    hubNameEn: 'Dubai (Jebel Ali -> DXB)',
    hubNameVi: 'Dubai (Jebel Ali -> DXB)',
    isEuropeLane: true,
    isUsWestCoastLane: false,
  },
  'vn-us-sea': {
    oceanDays: 20,
    seaAirDays: 11,
    airDays: 3,
    oceanKm: 12150,
    airKm: 13120,
    hubCode: 'SIN',
    hubNameEn: 'Singapore (PSA -> Changi SIN)',
    hubNameVi: 'Singapore (PSA -> Changi SIN)',
    isEuropeLane: false,
    isUsWestCoastLane: true,
  },
  'vn-jp-sea': {
    oceanDays: 6,
    seaAirDays: 4,
    airDays: 2,
    oceanKm: 3920,
    airKm: 4320,
    hubCode: 'SIN',
    hubNameEn: 'Singapore (Regional Hub SIN)',
    hubNameVi: 'Singapore (Trung chuyển SIN)',
    isEuropeLane: false,
    isUsWestCoastLane: false,
  },
  'vn-de-air': {
    oceanDays: 27,
    seaAirDays: 13,
    airDays: 2,
    oceanKm: 16480,
    airKm: 9660,
    hubCode: 'DXB',
    hubNameEn: 'Dubai (Jebel Ali -> DXB)',
    hubNameVi: 'Dubai (Jebel Ali -> DXB)',
    isEuropeLane: true,
    isUsWestCoastLane: false,
  },
};

function round1(n: number): number {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Simulates port/corridor disruptions across Ocean Direct, Sea-Air Hybrid (Dubai/Singapore),
 * and Direct Air Freight on Lead Time, Total Landed Cost (USD/VND), Inventory Holding & SLA Penalty,
 * and kg CO2e carbon footprint.
 */
export function simulateCorridorReroute(
  rawInput: RerouteSimulationInput,
): RerouteSimulationResult {
  const corridor = getCorridorById(rawInput.corridorId);
  const profile =
    CORRIDOR_PROFILES[corridor.id] ?? CORRIDOR_PROFILES['vn-eu-sea'];

  const cargoWeightKg = Math.max(50, round2(Number(rawInput.cargoWeightKg) || 50));
  const cargoVolumeCbm = Math.max(
    0.5,
    round2(Number(rawInput.cargoVolumeCbm) || 0.5),
  );
  const cargoValueUsd = Math.max(
    1000,
    round2(Number(rawInput.cargoValueUsd) || 1000),
  );
  const slaDeadlineDays = Math.max(
    1,
    Math.floor(Number(rawInput.slaDeadlineDays) || 1),
  );

  const activeSet = new Set<DisruptionScenarioId>(
    (rawInput.activeDisruptions ?? []).filter(
      (id): id is DisruptionScenarioId =>
        id === 'red-sea-suez' ||
        id === 'cat-lai-congestion' ||
        id === 'uswc-port-strike',
    ),
  );
  const activeDisruptions = Array.from(activeSet);

  // Chargeable weight calculations (IATA air divisor 6000; Ocean W/M & FCL container tiers)
  const airVolumetricKg = (cargoVolumeCbm * 1_000_000) / 6000;
  const airChargeableKg = Math.max(1, Math.ceil(Math.max(cargoWeightKg, airVolumetricKg)));
  const revenueTons = Math.max(1, cargoVolumeCbm, cargoWeightKg / 1000);

  let oceanBaseFreightUsd: number;
  if (cargoVolumeCbm >= 18 || cargoWeightKg >= 10000) {
    if (cargoVolumeCbm <= 33.1 && cargoWeightKg <= 28200) {
      oceanBaseFreightUsd = round2(corridor.baseRateFcl20Usd * 1.12 + 260);
    } else {
      const fcl40Count = Math.max(
        1,
        Math.ceil(cargoVolumeCbm / 76.1),
        Math.ceil(cargoWeightKg / 26500),
      );
      oceanBaseFreightUsd = round2(
        fcl40Count * (corridor.baseRateFcl40Usd * 1.12 + 380),
      );
    }
  } else {
    oceanBaseFreightUsd = round2(
      Math.max(240, revenueTons * corridor.baseRateLclCbmUsd) * 1.12 + 165,
    );
  }

  const seaAirBaseFreightUsd = round2(
    oceanBaseFreightUsd * 0.36 +
      240 +
      Math.max(320, airChargeableKg * corridor.baseRateAirKgUsd * 0.52) * 1.12 +
      110,
  );

  const directAirBaseFreightUsd = round2(
    Math.max(480, airChargeableKg * corridor.baseRateAirKgUsd * 1.18) * 1.16 +
      145,
  );

  // Disruption shock accumulators per mode
  const shocks: Record<
    RerouteModeId,
    { delayDays: number; surchargePct: number; flatSurchargeUsd: number; co2Mult: number }
  > = {
    'ocean-direct': { delayDays: 0, surchargePct: 0, flatSurchargeUsd: 0, co2Mult: 0 },
    'sea-air-hybrid': { delayDays: 0, surchargePct: 0, flatSurchargeUsd: 0, co2Mult: 0 },
    'direct-air': { delayDays: 0, surchargePct: 0, flatSurchargeUsd: 0, co2Mult: 0 },
  };

  if (activeSet.has('red-sea-suez')) {
    if (profile.isEuropeLane) {
      shocks['ocean-direct'].delayDays += 12;
      shocks['ocean-direct'].surchargePct += 0.34;
      shocks['ocean-direct'].co2Mult += 0.22;

      shocks['sea-air-hybrid'].delayDays += 1;
      shocks['sea-air-hybrid'].surchargePct += 0.08;
      shocks['sea-air-hybrid'].co2Mult += 0.03;

      shocks['direct-air'].delayDays += 0;
      shocks['direct-air'].surchargePct += 0.04;
      shocks['direct-air'].co2Mult += 0.02;
    } else {
      shocks['ocean-direct'].delayDays += 2;
      shocks['ocean-direct'].surchargePct += 0.06;
      shocks['ocean-direct'].co2Mult += 0.04;

      shocks['sea-air-hybrid'].delayDays += 0.5;
      shocks['sea-air-hybrid'].surchargePct += 0.02;
      shocks['sea-air-hybrid'].co2Mult += 0.01;

      shocks['direct-air'].surchargePct += 0.02;
    }
  }

  if (activeSet.has('cat-lai-congestion')) {
    shocks['ocean-direct'].delayDays += 4;
    shocks['ocean-direct'].flatSurchargeUsd += 480;
    shocks['ocean-direct'].co2Mult += 0.03;

    shocks['sea-air-hybrid'].delayDays += 1.5;
    shocks['sea-air-hybrid'].flatSurchargeUsd += 180;
    shocks['sea-air-hybrid'].co2Mult += 0.01;

    shocks['direct-air'].delayDays += 0.5;
    shocks['direct-air'].flatSurchargeUsd += 95;
  }

  if (activeSet.has('uswc-port-strike')) {
    if (profile.isUsWestCoastLane) {
      shocks['ocean-direct'].delayDays += 9;
      shocks['ocean-direct'].flatSurchargeUsd += 1450;
      shocks['ocean-direct'].co2Mult += 0.08;

      shocks['sea-air-hybrid'].delayDays += 1;
      shocks['sea-air-hybrid'].flatSurchargeUsd += 260;
      shocks['sea-air-hybrid'].co2Mult += 0.02;

      shocks['direct-air'].delayDays += 0.5;
      shocks['direct-air'].flatSurchargeUsd += 140;
      shocks['direct-air'].co2Mult += 0.01;
    } else {
      shocks['ocean-direct'].delayDays += 2;
      shocks['ocean-direct'].flatSurchargeUsd += 220;
      shocks['ocean-direct'].co2Mult += 0.02;

      shocks['sea-air-hybrid'].delayDays += 0.5;
      shocks['sea-air-hybrid'].flatSurchargeUsd += 60;

      shocks['direct-air'].flatSurchargeUsd += 35;
    }
  }

  const dailySlaPenaltyUsd =
    rawInput.dailyPenaltyOverrideUsd !== undefined &&
    Number.isFinite(rawInput.dailyPenaltyOverrideUsd) &&
    rawInput.dailyPenaltyOverrideUsd >= 0
      ? round2(rawInput.dailyPenaltyOverrideUsd)
      : Math.max(120, round2(cargoValueUsd * 0.0045));

  const weightTons = Math.max(0.05, cargoWeightKg / 1000);

  const rawDefinitions: {
    modeId: RerouteModeId;
    labelEn: string;
    labelVi: string;
    routingPathEn: string;
    routingPathVi: string;
    hubCode: string;
    hubNameEn: string;
    hubNameVi: string;
    baseLeadTimeDays: number;
    baseFreightUsd: number;
    baseCo2Kg: number;
    linkedQuoteMode: RerouteOptionResult['linkedQuoteMode'];
  }[] = [
    {
      modeId: 'ocean-direct',
      labelEn: 'Ocean Direct (FCL / LCL)',
      labelVi: 'Đường biển Trực tiếp (FCL / LCL)',
      routingPathEn: `${corridor.originCode} -> Direct Sea -> ${corridor.destCode}`,
      routingPathVi: `${corridor.originCode} -> Tàu biển Thẳng -> ${corridor.destCode}`,
      hubCode: corridor.destCode,
      hubNameEn: `Direct Marine (${corridor.destNameEn})`,
      hubNameVi: `Cảng biển Đích (${corridor.destNameVi})`,
      baseLeadTimeDays: profile.oceanDays,
      baseFreightUsd: oceanBaseFreightUsd,
      baseCo2Kg: weightTons * profile.oceanKm * 0.015,
      linkedQuoteMode: cargoVolumeCbm >= 33 ? 'sea-fcl-40' : cargoVolumeCbm >= 18 ? 'sea-fcl-20' : 'sea-lcl',
    },
    {
      modeId: 'sea-air-hybrid',
      labelEn: `Sea-Air Hybrid (${profile.hubCode})`,
      labelVi: `Kết hợp Biển–Hàng không (${profile.hubCode})`,
      routingPathEn: `${corridor.originCode} -> Sea -> ${profile.hubCode} -> Air -> ${corridor.destCode}`,
      routingPathVi: `${corridor.originCode} -> Biển -> ${profile.hubCode} -> Bay -> ${corridor.destCode}`,
      hubCode: profile.hubCode,
      hubNameEn: profile.hubNameEn,
      hubNameVi: profile.hubNameVi,
      baseLeadTimeDays: profile.seaAirDays,
      baseFreightUsd: seaAirBaseFreightUsd,
      baseCo2Kg:
        weightTons *
        (profile.oceanKm * 0.42 * 0.015 + profile.airKm * 0.56 * 0.565),
      linkedQuoteMode: 'air-standard',
    },
    {
      modeId: 'direct-air',
      labelEn: 'Direct Air Freight (B777F)',
      labelVi: 'Hàng không Chuyên cơ (B777F)',
      routingPathEn: `SGN -> Main-Deck Freighter -> ${corridor.destCode}`,
      routingPathVi: `SGN -> Chuyên cơ Hàng hóa -> ${corridor.destCode}`,
      hubCode: 'SGN',
      hubNameEn: 'Direct Air Cargo Ramp',
      hubNameVi: 'Bay thẳng Cảng Hàng không',
      baseLeadTimeDays: profile.airDays,
      baseFreightUsd: directAirBaseFreightUsd,
      baseCo2Kg: weightTons * profile.airKm * 0.602,
      linkedQuoteMode: 'air-express',
    },
  ];

  const preliminary: RerouteOptionResult[] = rawDefinitions.map((def) => {
    const shock = shocks[def.modeId];
    const disruptionDelayDays = round1(shock.delayDays);
    const totalLeadTimeDays = round1(def.baseLeadTimeDays + disruptionDelayDays);
    const slaBreachDays = Math.max(0, Math.ceil(totalLeadTimeDays - slaDeadlineDays));
    const slaCompliant = slaBreachDays === 0;

    const disruptionSurchargeUsd = round2(
      def.baseFreightUsd * shock.surchargePct + shock.flatSurchargeUsd,
    );
    const workingCapitalCarryUsd = round2(
      cargoValueUsd * (0.18 / 365) * totalLeadTimeDays,
    );
    const slaBreachPenaltyUsd = round2(slaBreachDays * dailySlaPenaltyUsd);
    const inventoryHoldingPenaltyUsd = round2(
      workingCapitalCarryUsd + slaBreachPenaltyUsd,
    );
    const totalLandedCostUsd = round2(
      def.baseFreightUsd + disruptionSurchargeUsd + inventoryHoldingPenaltyUsd,
    );
    const totalLandedCostVnd = Math.round(totalLandedCostUsd * FX_USD_TO_VND);

    const estimatedCo2Kg = Math.max(
      1,
      Math.round(def.baseCo2Kg * (1 + shock.co2Mult)),
    );
    const carbonIntensityKgPerTon = round1(estimatedCo2Kg / weightTons);

    return {
      modeId: def.modeId,
      labelEn: def.labelEn,
      labelVi: def.labelVi,
      routingPathEn: def.routingPathEn,
      routingPathVi: def.routingPathVi,
      hubCode: def.hubCode,
      hubNameEn: def.hubNameEn,
      hubNameVi: def.hubNameVi,
      baseLeadTimeDays: def.baseLeadTimeDays,
      disruptionDelayDays,
      totalLeadTimeDays,
      slaBreachDays,
      slaCompliant,
      freightCostUsd: def.baseFreightUsd,
      disruptionSurchargeUsd,
      workingCapitalCarryUsd,
      slaBreachPenaltyUsd,
      inventoryHoldingPenaltyUsd,
      totalLandedCostUsd,
      totalLandedCostVnd,
      estimatedCo2Kg,
      carbonIntensityKgPerTon,
      resilienceScore: 0,
      recommended: false,
      linkedQuoteMode: def.linkedQuoteMode,
    };
  });

  const minTotalCostUsd = Math.min(
    ...preliminary.map((o) => o.totalLandedCostUsd),
  );

  for (const opt of preliminary) {
    const costScore = Math.max(
      0,
      Math.min(45, (minTotalCostUsd / Math.max(1, opt.totalLandedCostUsd)) * 45),
    );
    const slaScore = opt.slaCompliant
      ? 35
      : Math.max(0, 35 - opt.slaBreachDays * 3.5);
    const insulationScore = Math.max(0, 20 - opt.disruptionDelayDays * 1.4);
    opt.resilienceScore = Math.max(
      1,
      Math.min(100, Math.round(costScore + slaScore + insulationScore)),
    );
  }

  let best = preliminary[0];
  for (const opt of preliminary) {
    if (
      opt.resilienceScore > best.resilienceScore ||
      (opt.resilienceScore === best.resilienceScore &&
        opt.totalLandedCostUsd < best.totalLandedCostUsd)
    ) {
      best = opt;
    }
  }
  best.recommended = true;

  const oceanOpt = preliminary[0];
  const seaAirOpt = preliminary[1];
  const airOpt = preliminary[2];

  const leadTimeSavedVsOceanDays = round1(
    Math.max(0, oceanOpt.totalLeadTimeDays - best.totalLeadTimeDays),
  );
  const netCostDeltaRecommendedVsOceanUsd = round2(
    best.totalLandedCostUsd - oceanOpt.totalLandedCostUsd,
  );
  const seaAirCo2SavingsVsAirPct = round1(
    Math.max(
      0,
      ((airOpt.estimatedCo2Kg - seaAirOpt.estimatedCo2Kg) /
        Math.max(1, airOpt.estimatedCo2Kg)) *
        100,
    ),
  );

  return {
    corridorId: corridor.id,
    corridorCode: corridor.code,
    activeDisruptions,
    cargoWeightKg,
    cargoVolumeCbm,
    cargoValueUsd,
    slaDeadlineDays,
    recommendedMode: best.modeId,
    leadTimeSavedVsOceanDays,
    netCostDeltaRecommendedVsOceanUsd,
    seaAirCo2SavingsVsAirPct,
    options: preliminary,
  };
}
