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

/* ============================================================================
 * v2.0 VIP PRO TYPES — Container Stuffing, Vietnam Customs/FTA, Alerts, A4 Docs
 * ============================================================================ */

export type ContainerTypeId = '20ft-std' | '40ft-std' | '40ft-hc' | '40ft-reefer';

export interface ContainerSpec {
  id: ContainerTypeId;
  code: string;
  nameEn: string;
  nameVi: string;
  innerLengthCm: number;
  innerWidthCm: number;
  innerHeightCm: number;
  maxPayloadKg: number;
  tareWeightKg: number;
  internalVolumeCbm: number;
  isReefer: boolean;
  linkedQuoteMode: TransportMode;
}

export interface CargoSkuItem {
  id: string;
  skuCode: string;
  name: string;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  qty: number;
  stackable: boolean;
  color: string;
}

export interface PlacedCartonBox {
  id: string;
  containerIndex: number;
  skuId: string;
  skuCode: string;
  skuName: string;
  color: string;
  x: number; // along container length (cm)
  y: number; // along container width (cm)
  z: number; // along container height (cm)
  l: number; // placed length along X (cm)
  w: number; // placed width along Y (cm)
  h: number; // height along Z (cm)
  weightKg: number;
  stackable: boolean;
}

export interface SkuPackingSummary {
  skuId: string;
  skuCode: string;
  name: string;
  color: string;
  requestedQty: number;
  loadedQty: number;
  unfitQty: number;
  maxPerSingleContainer: number;
  unitVolumeCbm: number;
  totalVolumeCbm: number;
  totalWeightKg: number;
  volumeSharePct: number;
  stackable: boolean;
}

export type SolasViolationCode =
  | 'OVERWEIGHT_PAYLOAD'
  | 'LONGITUDINAL_IMBALANCE'
  | 'LATERAL_IMBALANCE'
  | 'HIGH_VERTICAL_CG'
  | 'OVERSIZE_CARGO';

export interface ContainerLoadBay {
  index: number;
  cartonCount: number;
  usedVolumeCbm: number;
  volumeUtilizationPct: number;
  usedWeightKg: number;
  payloadUtilizationPct: number;
  centerOfGravityPct: number; // 0..100 along container length (alias of cgXPct)
  cgXPct: number; // Longitudinal CG (0=nose, 100=door)
  cgYPct: number; // Lateral CG (0=left wall, 100=right wall)
  cgZPct: number; // Vertical CG (0=floor, 100=roof)
  frontAxleSharePct: number; // Nose / kingpin axle load share %
  rearAxleSharePct: number; // Rear tandem axle load share %
  leftSideSharePct: number;
  rightSideSharePct: number;
  vgmGrossKg: number; // SOLAS Verified Gross Mass (Tare + Cargo)
  maxGrossSolasKg: number; // CSC plate max gross mass (Tare + Max Payload)
  solasVgmCompliant: boolean;
  solasViolations: SolasViolationCode[];
  placedBoxes: PlacedCartonBox[];
}

export interface ContainerPackingResult {
  container: ContainerSpec;
  containersRequired: number;
  totalRequestedCartons: number;
  totalLoadedCartons: number;
  unfitCartons: number;
  totalCargoVolumeCbm: number;
  totalCargoWeightKg: number;
  volumeUtilizationPct: number;
  payloadUtilizationPct: number;
  limitingFactor: 'volume' | 'payload' | 'dimensions';
  centerOfGravityPct: number;
  cgXPct: number;
  cgYPct: number;
  cgZPct: number;
  frontAxleSharePct: number;
  rearAxleSharePct: number;
  vgmGrossKg: number;
  maxGrossSolasKg: number;
  solasVgmCompliant: boolean;
  solasViolations: SolasViolationCode[];
  balanceStatus: 'balanced' | 'nose-heavy' | 'tail-heavy';
  skuBreakdown: SkuPackingSummary[];
  containers: ContainerLoadBay[];
}

export type FtaRegime = 'MFN' | 'EVFTA' | 'CPTPP' | 'ACFTA';

export interface HsTariffPreset {
  id: string;
  hsCode: string;
  categoryEn: string;
  categoryVi: string;
  descriptionEn: string;
  descriptionVi: string;
  mfnRatePct: number;
  evftaRatePct: number;
  cptppRatePct: number;
  acftaRatePct: number;
  defaultSctRatePct: number;
  defaultVatRatePct: 8 | 10;
  defaultFobUsd: number;
  defaultFreightUsd: number;
  defaultInsuranceUsd: number;
  defaultUnits: number;
  coNoteEn: string;
  coNoteVi: string;
}

export interface CustomsDutyInput {
  presetId: string;
  customHsCode?: string;
  regime: FtaRegime;
  fobValueUsd: number;
  freightUsd: number;
  insuranceUsd: number;
  unitQuantity: number;
  vatRatePct: 8 | 10;
  sctRatePct: number;
  localClearanceFeesUsd: number;
}

export interface RegimeComparisonRow {
  regime: FtaRegime;
  certificateLabel: string;
  dutyRatePct: number;
  importDutyUsd: number;
  sctUsd: number;
  vatUsd: number;
  totalTaxesUsd: number;
  totalLandedCostUsd: number;
  totalLandedCostVnd: number;
  landedCostPerUnitUsd: number;
  savingsVsMfnUsd: number;
  savingsVsMfnVnd: number;
}

export interface CustomsDutyResult {
  preset: HsTariffPreset;
  hsCode: string;
  regime: FtaRegime;
  unitQuantity: number;
  fobValueUsd: number;
  freightUsd: number;
  insuranceUsd: number;
  cifValueUsd: number;
  cifValueVnd: number;
  appliedDutyRatePct: number;
  sctRatePct: number;
  vatRatePct: 8 | 10;
  importDutyUsd: number;
  sctUsd: number;
  vatUsd: number;
  totalTaxesUsd: number;
  localClearanceFeesUsd: number;
  totalLandedCostUsd: number;
  totalLandedCostVnd: number;
  landedCostPerUnitUsd: number;
  landedCostPerUnitVnd: number;
  effectiveTaxBurdenPct: number;
  savingsVsMfnUsd: number;
  savingsVsMfnVnd: number;
  bestRegime: FtaRegime;
  comparisons: RegimeComparisonRow[];
}

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'open' | 'acknowledged' | 'resolved';

export interface ExceptionAlert {
  id: string;
  waybillId: string;
  corridorId: string;
  portCode: string;
  severity: AlertSeverity;
  status: AlertStatus;
  category: 'reefer' | 'congestion' | 'customs' | 'cutoff' | 'security';
  titleEn: string;
  titleVi: string;
  detailEn: string;
  detailVi: string;
  actionEn: string;
  actionVi: string;
  slaMinutesRemaining: number;
  detectedAt: string;
  resolvedAt?: string;
}

export type PrintDocTab = 'bl' | 'invoice' | 'packing';

/* ============================================================================
 * v3.0 CONTROL TOWER TYPES — Port Disruption & Multimodal Reroute Simulator
 * ============================================================================ */

export type DisruptionScenarioId =
  | 'red-sea-suez'
  | 'cat-lai-congestion'
  | 'uswc-port-strike';

export type RerouteModeId = 'ocean-direct' | 'sea-air-hybrid' | 'direct-air';

export interface DisruptionScenarioMeta {
  id: DisruptionScenarioId;
  code: string;
  severity: 'critical' | 'high';
  titleEn: string;
  titleVi: string;
  subtitleEn: string;
  subtitleVi: string;
  affectedRegionsEn: string;
  affectedRegionsVi: string;
  oceanDelayBadge: string;
}

export interface RerouteCargoProfile {
  id: string;
  labelEn: string;
  labelVi: string;
  corridorId: string;
  cargoWeightKg: number;
  cargoVolumeCbm: number;
  cargoValueUsd: number;
  slaDeadlineDays: number;
}

export interface RerouteSimulationInput {
  corridorId: string;
  cargoWeightKg: number;
  cargoVolumeCbm: number;
  cargoValueUsd: number;
  slaDeadlineDays: number;
  activeDisruptions: DisruptionScenarioId[];
  dailyPenaltyOverrideUsd?: number;
}

export interface RerouteOptionResult {
  modeId: RerouteModeId;
  labelEn: string;
  labelVi: string;
  routingPathEn: string;
  routingPathVi: string;
  hubCode: string;
  hubNameEn: string;
  hubNameVi: string;
  baseLeadTimeDays: number;
  disruptionDelayDays: number;
  totalLeadTimeDays: number;
  slaBreachDays: number;
  slaCompliant: boolean;
  freightCostUsd: number;
  disruptionSurchargeUsd: number;
  workingCapitalCarryUsd: number;
  slaBreachPenaltyUsd: number;
  inventoryHoldingPenaltyUsd: number;
  totalLandedCostUsd: number;
  totalLandedCostVnd: number;
  estimatedCo2Kg: number;
  carbonIntensityKgPerTon: number;
  resilienceScore: number;
  recommended: boolean;
  linkedQuoteMode: TransportMode;
}

export interface RerouteSimulationResult {
  corridorId: string;
  corridorCode: string;
  activeDisruptions: DisruptionScenarioId[];
  cargoWeightKg: number;
  cargoVolumeCbm: number;
  cargoValueUsd: number;
  slaDeadlineDays: number;
  recommendedMode: RerouteModeId;
  leadTimeSavedVsOceanDays: number;
  netCostDeltaRecommendedVsOceanUsd: number;
  seaAirCo2SavingsVsAirPct: number;
  options: RerouteOptionResult[];
}
