export type Lang = 'en' | 'vi';
export type Theme = 'dark' | 'light';
export type Currency = 'USD' | 'VND';

export type TransportMode =
  | 'air-express'
  | 'air-standard'
  | 'sea-lcl'
  | 'sea-fcl-20'
  | 'sea-fcl-40'
  | 'road-ftl';

export type Incoterm = 'FOB' | 'CIF' | 'DDP';

export type CongestionLevel = 'optimal' | 'moderate' | 'elevated';

export interface PortHub {
  code: string;
  nameEn: string;
  nameVi: string;
  countryEn: string;
  countryVi: string;
  x: number;
  y: number;
  type: 'sea' | 'air';
  berthOccupancyPct: number;
  dwellHours: number;
  congestion: CongestionLevel;
  customsChannel: 'GREEN' | 'AMBER';
  weatherNoteEn: string;
  weatherNoteVi: string;
  linkedCorridorId: string;
}

export interface CorridorTelemetry {
  tempC: number;
  tempTargetEn: string;
  tempTargetVi: string;
  tempHistory: number[];
  humidityPct: number;
  shockG: number;
  sealId: string;
  cargoClassEn: string;
  cargoClassVi: string;
}

export interface ShippingCorridor {
  id: string;
  code: string;
  modeGroup: 'sea' | 'air';
  defaultQuoteMode: TransportMode;
  originCode: string;
  originNameEn: string;
  originNameVi: string;
  destCode: string;
  destNameEn: string;
  destNameVi: string;
  vesselName: string;
  callsign: string;
  distanceKm: number;
  transitDaysMin: number;
  transitDaysMax: number;
  progressPct: number;
  etaRemainingSeconds: number;
  svgPath: string;
  vesselPos: { x: number; y: number };
  baseRateAirKgUsd: number;
  baseRateLclCbmUsd: number;
  baseRateFcl20Usd: number;
  baseRateFcl40Usd: number;
  baseRateRoadKgUsd: number;
  telemetry: CorridorTelemetry;
}

export interface FreightQuoteInput {
  corridorId: string;
  mode: TransportMode;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  grossWeightKg: number;
  packages: number;
  declaredValueUsd: number;
  incoterm: Incoterm;
  customsClearance: boolean;
  cargoInsurance: boolean;
  reeferMonitoring: boolean;
}

export interface FreightQuoteResult {
  corridorId: string;
  mode: TransportMode;
  incoterm: Incoterm;
  totalVolumeCbm: number;
  totalGrossWeightKg: number;
  volumetricWeightKg: number;
  volumetricDivisor: number | null;
  chargeableWeightKg: number;
  revenueTonsCbm: number;
  containersRequired: number;
  containerUtilizationPct: number;
  governingMetric: 'actual' | 'volumetric' | 'cbm' | 'container';
  baseFreightUsd: number;
  fuelSurchargeUsd: number;
  terminalHandlingUsd: number;
  customsBrokerageUsd: number;
  importDutiesUsd: number;
  insuranceUsd: number;
  reeferSurchargeUsd: number;
  totalUsd: number;
  totalVnd: number;
  depositVnd: number;
  transitDaysMin: number;
  transitDaysMax: number;
  estimatedCo2Kg: number;
}

export interface CargoPreset {
  id: string;
  labelEn: string;
  labelVi: string;
  commodityEn: string;
  commodityVi: string;
  hsCode: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  grossWeightKg: number;
  packages: number;
  declaredValueUsd: number;
  recommendedMode: TransportMode;
  reefer: boolean;
}

export type StageStatus = 'completed' | 'active' | 'pending';

export interface WaybillStage {
  step: number;
  titleEn: string;
  titleVi: string;
  locationCode: string;
  locationEn: string;
  locationVi: string;
  timestamp: string;
  reference: string;
  status: StageStatus;
}

export interface WaybillRecord {
  id: string;
  blNumber: string;
  containerOrAwb: string;
  sealNumber: string;
  corridorId: string;
  mode: TransportMode;
  incoterm: Incoterm;
  shipperName: string;
  shipperCompany: string;
  consigneeName: string;
  consigneeCompany: string;
  originCode: string;
  originLabelEn: string;
  originLabelVi: string;
  destCode: string;
  destLabelEn: string;
  destLabelVi: string;
  commodityEn: string;
  commodityVi: string;
  hsCode: string;
  packages: number;
  grossWeightKg: number;
  volumeCbm: number;
  chargeableWeightKg: number;
  totalFreightUsd: number;
  vesselOrFlight: string;
  etaDate: string;
  createdAt: string;
  currentStage: number; // 1..6
  isUserBooked?: boolean;
  reeferTempC?: number | null;
  humidityPct?: number;
  stages: WaybillStage[];
}

export interface BookingCustomerForm {
  shipperName: string;
  shipperCompany: string;
  contactEmail: string;
  consigneeName: string;
  consigneeCompany: string;
  commodity: string;
  hsCode: string;
}
