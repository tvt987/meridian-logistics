namespace Meridian.Domain.Models;

public sealed record CorridorSpec(
    string Id,
    string Code,
    string OriginCode,
    string OriginName,
    string DestCode,
    string DestName,
    int DistanceKm,
    int TransitDaysMin,
    int TransitDaysMax,
    decimal BaseRateAirKgUsd,
    decimal BaseRateLclCbmUsd,
    decimal BaseRateFcl20Usd,
    decimal BaseRateFcl40Usd,
    decimal BaseRateRoadKgUsd,
    int OceanDistanceKm,
    int AirDistanceKm,
    int OceanBaseDays,
    int SeaAirBaseDays,
    int AirBaseDays,
    string SeaAirHubCode,
    string SeaAirHubName,
    bool IsEuropeLane,
    bool IsUsWestCoastLane);

public sealed record ContainerSpec(
    string Id,
    string Code,
    string Name,
    int InnerLengthCm,
    int InnerWidthCm,
    int InnerHeightCm,
    decimal MaxPayloadKg,
    decimal TareWeightKg,
    decimal InternalVolumeCbm,
    bool IsReefer);

public sealed record HsTariffSpec(
    string Id,
    string HsCode,
    string Category,
    string Description,
    decimal MfnRatePct,
    decimal EvftaRatePct,
    decimal CptppRatePct,
    decimal AcftaRatePct,
    decimal DefaultSctRatePct,
    int DefaultVatRatePct);

/* ============================================================================
 * 1. Freight Quoting Contracts
 * ============================================================================ */

public sealed record FreightQuoteRequest(
    string CorridorId,
    string Mode,
    decimal LengthCm,
    decimal WidthCm,
    decimal HeightCm,
    decimal GrossWeightKg,
    int Packages,
    decimal DeclaredValueUsd,
    string Incoterm,
    bool CustomsClearance = false,
    bool CargoInsurance = false,
    bool ReeferMonitoring = false);

public sealed record FreightQuoteResponse(
    string CorridorId,
    string Mode,
    string Incoterm,
    decimal TotalVolumeCbm,
    decimal TotalGrossWeightKg,
    decimal VolumetricWeightKg,
    int? VolumetricDivisor,
    decimal ChargeableWeightKg,
    decimal RevenueTonsCbm,
    int ContainersRequired,
    int ContainerUtilizationPct,
    string GoverningMetric,
    decimal BaseFreightUsd,
    decimal FuelSurchargeUsd,
    decimal TerminalHandlingUsd,
    decimal CustomsBrokerageUsd,
    decimal ImportDutiesUsd,
    decimal InsuranceUsd,
    decimal ReeferSurchargeUsd,
    decimal TotalUsd,
    long TotalVnd,
    long DepositVnd,
    int TransitDaysMin,
    int TransitDaysMax,
    int EstimatedCo2Kg);

/* ============================================================================
 * 2. Vietnam HS Code & FTA Customs Landed-Cost Contracts
 * ============================================================================ */

public sealed record CustomsLandedCostRequest(
    string PresetId,
    string? CustomHsCode,
    string Regime,
    decimal FobValueUsd,
    decimal FreightUsd,
    decimal InsuranceUsd,
    int UnitQuantity,
    int VatRatePct = 8,
    decimal SctRatePct = 0,
    decimal LocalClearanceFeesUsd = 340);

public sealed record FtaRegimeComparison(
    string Regime,
    string CertificateLabel,
    decimal DutyRatePct,
    decimal ImportDutyUsd,
    decimal SctUsd,
    decimal VatUsd,
    decimal TotalTaxesUsd,
    decimal TotalLandedCostUsd,
    long TotalLandedCostVnd,
    decimal LandedCostPerUnitUsd,
    decimal SavingsVsMfnUsd,
    long SavingsVsMfnVnd);

public sealed record CustomsLandedCostResponse(
    string PresetId,
    string HsCode,
    string Category,
    string Regime,
    int UnitQuantity,
    decimal FobValueUsd,
    decimal FreightUsd,
    decimal InsuranceUsd,
    decimal CifValueUsd,
    long CifValueVnd,
    decimal AppliedDutyRatePct,
    decimal SctRatePct,
    int VatRatePct,
    decimal ImportDutyUsd,
    decimal SctUsd,
    decimal VatUsd,
    decimal TotalTaxesUsd,
    decimal LocalClearanceFeesUsd,
    decimal TotalLandedCostUsd,
    long TotalLandedCostVnd,
    decimal LandedCostPerUnitUsd,
    long LandedCostPerUnitVnd,
    decimal EffectiveTaxBurdenPct,
    decimal SavingsVsMfnUsd,
    long SavingsVsMfnVnd,
    string BestRegime,
    IReadOnlyList<FtaRegimeComparison> Comparisons);

/* ============================================================================
 * 3. Container 3D Packing & SOLAS VGM Center-of-Gravity Contracts
 * ============================================================================ */

public sealed record CargoSkuRequest(
    string SkuCode,
    string Name,
    int LengthCm,
    int WidthCm,
    int HeightCm,
    decimal WeightKg,
    int Qty,
    bool Stackable = true);

public sealed record ContainerBalanceRequest(
    string ContainerType,
    IReadOnlyList<CargoSkuRequest> Skus,
    bool StrictSingleContainer = false);

public sealed record ContainerBayAudit(
    int Index,
    int CartonCount,
    decimal UsedVolumeCbm,
    decimal VolumeUtilizationPct,
    decimal UsedWeightKg,
    decimal PayloadUtilizationPct,
    decimal CgXPct,
    decimal CgYPct,
    decimal CgZPct,
    decimal FrontAxleSharePct,
    decimal RearAxleSharePct,
    decimal LeftSideSharePct,
    decimal RightSideSharePct,
    decimal VgmGrossKg,
    decimal MaxGrossSolasKg,
    bool SolasVgmCompliant,
    IReadOnlyList<string> SolasViolations);

public sealed record ContainerBalanceResponse(
    string ContainerType,
    string ContainerCode,
    string Status,
    int ContainersRequired,
    int TotalRequestedCartons,
    int TotalLoadedCartons,
    int UnfitCartons,
    decimal TotalCargoVolumeCbm,
    decimal TotalCargoWeightKg,
    decimal VolumeUtilizationPct,
    decimal PayloadUtilizationPct,
    string LimitingFactor,
    decimal CgXPct,
    decimal CgYPct,
    decimal CgZPct,
    decimal FrontAxleSharePct,
    decimal RearAxleSharePct,
    decimal VgmGrossKg,
    decimal MaxGrossSolasKg,
    string BalanceStatus,
    bool SolasVgmCompliant,
    IReadOnlyList<string> SolasViolations,
    IReadOnlyList<ContainerBayAudit> Bays);

/* ============================================================================
 * 4. Port Disruption & Multimodal Reroute Contracts
 * ============================================================================ */

public sealed record CorridorRerouteRequest(
    string CorridorId,
    decimal CargoWeightKg,
    decimal CargoVolumeCbm,
    decimal CargoValueUsd,
    int SlaDeadlineDays,
    IReadOnlyList<string> ActiveDisruptions,
    decimal? DailyPenaltyOverrideUsd = null);

public sealed record RerouteOptionDto(
    string ModeId,
    string Label,
    string RoutingPath,
    string HubCode,
    string HubName,
    decimal BaseLeadTimeDays,
    decimal DisruptionDelayDays,
    decimal TotalLeadTimeDays,
    int SlaBreachDays,
    bool SlaCompliant,
    decimal FreightCostUsd,
    decimal DisruptionSurchargeUsd,
    decimal WorkingCapitalCarryUsd,
    decimal SlaBreachPenaltyUsd,
    decimal InventoryHoldingPenaltyUsd,
    decimal TotalLandedCostUsd,
    long TotalLandedCostVnd,
    int EstimatedCo2Kg,
    decimal CarbonIntensityKgPerTon,
    int ResilienceScore,
    bool Recommended);

public sealed record CorridorRerouteResponse(
    string CorridorId,
    string CorridorCode,
    IReadOnlyList<string> ActiveDisruptions,
    decimal CargoWeightKg,
    decimal CargoVolumeCbm,
    decimal CargoValueUsd,
    int SlaDeadlineDays,
    string RecommendedMode,
    decimal LeadTimeSavedVsOceanDays,
    decimal NetCostDeltaRecommendedVsOceanUsd,
    decimal SeaAirCo2SavingsVsAirPct,
    IReadOnlyList<RerouteOptionDto> Options);
