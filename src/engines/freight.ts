import { FX_USD_TO_VND, SHIPPING_CORRIDORS, VIETQR_CONFIG } from '../data/corridors';
import type {
  Currency,
  FreightQuoteInput,
  FreightQuoteResult,
  ShippingCorridor,
  TransportMode,
} from '../types/logistics';

const FCL_20_MAX_CBM = 33.2;
const FCL_20_MAX_KG = 28200;
const FCL_40_MAX_CBM = 76.4;
const FCL_40_MAX_KG = 28800;

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function round3(n: number): number {
  return Math.round((n + Number.EPSILON) * 1000) / 1000;
}

export function getCorridorById(corridorId: string): ShippingCorridor {
  return (
    SHIPPING_CORRIDORS.find((c) => c.id === corridorId) ?? SHIPPING_CORRIDORS[0]
  );
}

export function getVolumetricDivisor(mode: TransportMode): number | null {
  switch (mode) {
    case 'air-express':
      return 6000;
    case 'air-standard':
      return 5000;
    case 'road-ftl':
      return 4000;
    case 'sea-lcl':
      return 1000;
    case 'sea-fcl-20':
    case 'sea-fcl-40':
      return null;
  }
}

export function calculateFreightQuote(
  rawInput: FreightQuoteInput,
): FreightQuoteResult {
  const corridor = getCorridorById(rawInput.corridorId);

  const lengthCm = Math.max(1, Number(rawInput.lengthCm) || 1);
  const widthCm = Math.max(1, Number(rawInput.widthCm) || 1);
  const heightCm = Math.max(1, Number(rawInput.heightCm) || 1);
  const grossWeightKg = Math.max(0.5, Number(rawInput.grossWeightKg) || 0.5);
  const packages = Math.max(1, Math.floor(Number(rawInput.packages) || 1));
  const declaredValueUsd = Math.max(100, Number(rawInput.declaredValueUsd) || 100);

  const totalVolumeCm3 = lengthCm * widthCm * heightCm * packages;
  const totalVolumeCbm = Math.max(0.001, round3(totalVolumeCm3 / 1_000_000));
  const totalGrossWeightKg = round2(grossWeightKg * packages);
  const volumetricDivisor = getVolumetricDivisor(rawInput.mode);

  const volumetricWeightKg =
    volumetricDivisor !== null
      ? round2(totalVolumeCm3 / volumetricDivisor)
      : round2(totalVolumeCbm * 1000);

  const revenueTonsCbm = round2(
    Math.max(1, totalVolumeCbm, totalGrossWeightKg / 1000),
  );

  let chargeableWeightKg = totalGrossWeightKg;
  let containersRequired = 0;
  let containerUtilizationPct = 0;
  let governingMetric: FreightQuoteResult['governingMetric'] = 'actual';
  let baseFreightUsd = 0;
  let fuelRate = 0.12;
  let terminalHandlingUsd = 0;
  let transitDaysMin = corridor.transitDaysMin;
  let transitDaysMax = corridor.transitDaysMax;
  let co2FactorKgPerTonKm = 0.016;

  switch (rawInput.mode) {
    case 'air-express': {
      governingMetric =
        volumetricWeightKg > totalGrossWeightKg ? 'volumetric' : 'actual';
      chargeableWeightKg = Math.max(
        1,
        Math.ceil(Math.max(totalGrossWeightKg, volumetricWeightKg)),
      );
      baseFreightUsd = Math.max(
        180,
        chargeableWeightKg * corridor.baseRateAirKgUsd * 1.25,
      );
      fuelRate = 0.16;
      terminalHandlingUsd = 95;
      transitDaysMin = 1;
      transitDaysMax = 3;
      co2FactorKgPerTonKm = 0.602;
      break;
    }
    case 'air-standard': {
      governingMetric =
        volumetricWeightKg > totalGrossWeightKg ? 'volumetric' : 'actual';
      chargeableWeightKg = Math.max(
        1,
        Math.ceil(Math.max(totalGrossWeightKg, volumetricWeightKg)),
      );
      baseFreightUsd = Math.max(
        135,
        chargeableWeightKg * corridor.baseRateAirKgUsd,
      );
      fuelRate = 0.16;
      terminalHandlingUsd = 85;
      transitDaysMin = 3;
      transitDaysMax = 5;
      co2FactorKgPerTonKm = 0.565;
      break;
    }
    case 'sea-lcl': {
      governingMetric = 'cbm';
      chargeableWeightKg = Math.round(revenueTonsCbm * 1000);
      baseFreightUsd = Math.max(
        165,
        revenueTonsCbm * corridor.baseRateLclCbmUsd,
      );
      fuelRate = 0.12;
      terminalHandlingUsd = 135 + Math.round(revenueTonsCbm * 14);
      transitDaysMin = corridor.transitDaysMin + 3;
      transitDaysMax = corridor.transitDaysMax + 4;
      co2FactorKgPerTonKm = 0.018;
      break;
    }
    case 'sea-fcl-20': {
      governingMetric = 'container';
      containersRequired = Math.max(
        1,
        Math.ceil(totalVolumeCbm / FCL_20_MAX_CBM),
        Math.ceil(totalGrossWeightKg / FCL_20_MAX_KG),
      );
      const volPct = (totalVolumeCbm / (containersRequired * FCL_20_MAX_CBM)) * 100;
      const wtPct = (totalGrossWeightKg / (containersRequired * FCL_20_MAX_KG)) * 100;
      containerUtilizationPct = Math.min(100, Math.round(Math.max(volPct, wtPct)));
      chargeableWeightKg = totalGrossWeightKg;
      baseFreightUsd = containersRequired * corridor.baseRateFcl20Usd;
      fuelRate = 0.12;
      terminalHandlingUsd = 260 * containersRequired;
      transitDaysMin = corridor.transitDaysMin;
      transitDaysMax = corridor.transitDaysMax;
      co2FactorKgPerTonKm = 0.015;
      break;
    }
    case 'sea-fcl-40': {
      governingMetric = 'container';
      containersRequired = Math.max(
        1,
        Math.ceil(totalVolumeCbm / FCL_40_MAX_CBM),
        Math.ceil(totalGrossWeightKg / FCL_40_MAX_KG),
      );
      const volPct = (totalVolumeCbm / (containersRequired * FCL_40_MAX_CBM)) * 100;
      const wtPct = (totalGrossWeightKg / (containersRequired * FCL_40_MAX_KG)) * 100;
      containerUtilizationPct = Math.min(100, Math.round(Math.max(volPct, wtPct)));
      chargeableWeightKg = totalGrossWeightKg;
      baseFreightUsd = containersRequired * corridor.baseRateFcl40Usd;
      fuelRate = 0.12;
      terminalHandlingUsd = 380 * containersRequired;
      transitDaysMin = corridor.transitDaysMin;
      transitDaysMax = corridor.transitDaysMax;
      co2FactorKgPerTonKm = 0.014;
      break;
    }
    case 'road-ftl': {
      governingMetric =
        volumetricWeightKg > totalGrossWeightKg ? 'volumetric' : 'actual';
      chargeableWeightKg = Math.max(
        1,
        Math.ceil(Math.max(totalGrossWeightKg, volumetricWeightKg)),
      );
      baseFreightUsd = Math.max(
        120,
        chargeableWeightKg * corridor.baseRateRoadKgUsd,
      );
      fuelRate = 0.1;
      terminalHandlingUsd = 75;
      transitDaysMin = 4;
      transitDaysMax = 6;
      co2FactorKgPerTonKm = 0.096;
      break;
    }
  }

  baseFreightUsd = round2(baseFreightUsd);
  const fuelSurchargeUsd = round2(baseFreightUsd * fuelRate);
  terminalHandlingUsd = round2(terminalHandlingUsd);

  const customsRequired = rawInput.incoterm === 'DDP' || rawInput.customsClearance;
  const customsBrokerageUsd = !customsRequired
    ? 0
    : rawInput.incoterm === 'DDP'
      ? 285
      : 145;

  const importDutiesUsd =
    rawInput.incoterm === 'DDP'
      ? round2(declaredValueUsd * 0.045 + 220)
      : 0;

  const insuranceRequired =
    rawInput.incoterm === 'CIF' ||
    rawInput.incoterm === 'DDP' ||
    rawInput.cargoInsurance;
  const insuranceUsd = insuranceRequired
    ? round2(Math.max(45, declaredValueUsd * 0.0045))
    : 0;

  const reeferSurchargeUsd = rawInput.reeferMonitoring
    ? round2(baseFreightUsd * 0.18 + 65)
    : 0;

  const totalUsd = round2(
    baseFreightUsd +
      fuelSurchargeUsd +
      terminalHandlingUsd +
      customsBrokerageUsd +
      importDutiesUsd +
      insuranceUsd +
      reeferSurchargeUsd,
  );
  const totalVnd = Math.round(totalUsd * FX_USD_TO_VND);
  const depositVnd = Math.round(totalVnd * VIETQR_CONFIG.depositRatio);

  const distanceForCarbon =
    rawInput.mode === 'road-ftl'
      ? Math.min(corridor.distanceKm, 2100)
      : corridor.distanceKm;
  const weightTons = Math.max(0.05, totalGrossWeightKg / 1000);
  const estimatedCo2Kg = Math.max(
    1,
    Math.round(weightTons * distanceForCarbon * co2FactorKgPerTonKm),
  );

  return {
    corridorId: corridor.id,
    mode: rawInput.mode,
    incoterm: rawInput.incoterm,
    totalVolumeCbm,
    totalGrossWeightKg,
    volumetricWeightKg,
    volumetricDivisor,
    chargeableWeightKg,
    revenueTonsCbm,
    containersRequired,
    containerUtilizationPct,
    governingMetric,
    baseFreightUsd,
    fuelSurchargeUsd,
    terminalHandlingUsd,
    customsBrokerageUsd,
    importDutiesUsd,
    insuranceUsd,
    reeferSurchargeUsd,
    totalUsd,
    totalVnd,
    depositVnd,
    transitDaysMin,
    transitDaysMax,
    estimatedCo2Kg,
  };
}

export function formatMoney(amountUsd: number, currency: Currency): string {
  if (currency === 'VND') {
    const vnd = Math.round(amountUsd * FX_USD_TO_VND);
    return `${vnd.toLocaleString('en-US')} ₫`;
  }
  return `$${amountUsd.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatVnd(amountVnd: number): string {
  return `${Math.round(amountVnd).toLocaleString('en-US')} ₫`;
}

export function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const hh = String(hours).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  if (days > 0) {
    return `${days}d ${hh}h ${mm}m ${ss}s`;
  }
  return `${hh}h ${mm}m ${ss}s`;
}
