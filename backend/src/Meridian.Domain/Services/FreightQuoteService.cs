using Meridian.Domain.Data;
using Meridian.Domain.Models;

namespace Meridian.Domain.Services;

public interface IFreightQuoteService
{
    FreightQuoteResponse CalculateQuote(FreightQuoteRequest request);
}

public sealed class FreightQuoteService : IFreightQuoteService
{
    private const decimal Fcl20MaxCbm = 33.2m;
    private const decimal Fcl20MaxKg = 28200m;
    private const decimal Fcl40MaxCbm = 76.4m;
    private const decimal Fcl40MaxKg = 28800m;

    public static int? GetVolumetricDivisor(string mode) =>
        mode.ToLowerInvariant() switch
        {
            "air-express" => 6000,
            "air-standard" => 5000,
            "road-ftl" => 4000,
            "sea-lcl" => 1000,
            "sea-fcl-20" or "sea-fcl-40" => null,
            _ => throw new ArgumentException($"Unsupported transport mode '{mode}'.", nameof(mode))
        };

    public FreightQuoteResponse CalculateQuote(FreightQuoteRequest request)
    {
        if (!MeridianCatalog.Corridors.TryGetValue(request.CorridorId, out var corridor))
        {
            throw new ArgumentException($"Unknown corridorId '{request.CorridorId}'.", nameof(request));
        }

        var mode = request.Mode.Trim().ToLowerInvariant();
        var incoterm = request.Incoterm.Trim().ToUpperInvariant();
        if (incoterm is not ("FOB" or "CIF" or "DDP"))
        {
            throw new ArgumentException($"Unsupported Incoterm '{request.Incoterm}'. Must be FOB, CIF, or DDP.", nameof(request));
        }

        var divisor = GetVolumetricDivisor(mode);

        var totalVolumeCm3 = request.LengthCm * request.WidthCm * request.HeightCm * request.Packages;
        var totalVolumeCbm = Math.Max(0.001m, Round3(totalVolumeCm3 / 1_000_000m));
        var totalGrossWeightKg = Round2(request.GrossWeightKg * request.Packages);

        var volumetricWeightKg = divisor.HasValue
            ? Round2(totalVolumeCm3 / divisor.Value)
            : Round2(totalVolumeCbm * 1000m);

        var revenueTonsCbm = Round2(Math.Max(1m, Math.Max(totalVolumeCbm, totalGrossWeightKg / 1000m)));

        decimal chargeableWeightKg;
        var containersRequired = 0;
        var containerUtilizationPct = 0;
        string governingMetric;
        decimal baseFreightUsd;
        decimal fuelRate;
        decimal terminalHandlingUsd;
        var transitDaysMin = corridor.TransitDaysMin;
        var transitDaysMax = corridor.TransitDaysMax;
        decimal co2FactorKgPerTonKm;

        switch (mode)
        {
            case "air-express":
                governingMetric = volumetricWeightKg > totalGrossWeightKg ? "volumetric" : "actual";
                chargeableWeightKg = Math.Max(1m, Math.Ceiling(Math.Max(totalGrossWeightKg, volumetricWeightKg)));
                baseFreightUsd = Math.Max(180m, chargeableWeightKg * corridor.BaseRateAirKgUsd * 1.25m);
                fuelRate = 0.16m;
                terminalHandlingUsd = 95m;
                transitDaysMin = 1;
                transitDaysMax = 3;
                co2FactorKgPerTonKm = 0.602m;
                break;

            case "air-standard":
                governingMetric = volumetricWeightKg > totalGrossWeightKg ? "volumetric" : "actual";
                chargeableWeightKg = Math.Max(1m, Math.Ceiling(Math.Max(totalGrossWeightKg, volumetricWeightKg)));
                baseFreightUsd = Math.Max(135m, chargeableWeightKg * corridor.BaseRateAirKgUsd);
                fuelRate = 0.16m;
                terminalHandlingUsd = 85m;
                transitDaysMin = 3;
                transitDaysMax = 5;
                co2FactorKgPerTonKm = 0.565m;
                break;

            case "sea-lcl":
                governingMetric = "cbm";
                chargeableWeightKg = Math.Round(revenueTonsCbm * 1000m, MidpointRounding.AwayFromZero);
                baseFreightUsd = Math.Max(165m, revenueTonsCbm * corridor.BaseRateLclCbmUsd);
                fuelRate = 0.12m;
                terminalHandlingUsd = 135m + Math.Round(revenueTonsCbm * 14m, MidpointRounding.AwayFromZero);
                transitDaysMin = corridor.TransitDaysMin + 3;
                transitDaysMax = corridor.TransitDaysMax + 4;
                co2FactorKgPerTonKm = 0.018m;
                break;

            case "sea-fcl-20":
                governingMetric = "container";
                containersRequired = Math.Max(1, Math.Max(
                    (int)Math.Ceiling(totalVolumeCbm / Fcl20MaxCbm),
                    (int)Math.Ceiling(totalGrossWeightKg / Fcl20MaxKg)));
                containerUtilizationPct = Math.Min(100, (int)Math.Round(
                    Math.Max(
                        totalVolumeCbm / (containersRequired * Fcl20MaxCbm) * 100m,
                        totalGrossWeightKg / (containersRequired * Fcl20MaxKg) * 100m),
                    MidpointRounding.AwayFromZero));
                chargeableWeightKg = totalGrossWeightKg;
                baseFreightUsd = containersRequired * corridor.BaseRateFcl20Usd;
                fuelRate = 0.12m;
                terminalHandlingUsd = 260m * containersRequired;
                co2FactorKgPerTonKm = 0.015m;
                break;

            case "sea-fcl-40":
                governingMetric = "container";
                containersRequired = Math.Max(1, Math.Max(
                    (int)Math.Ceiling(totalVolumeCbm / Fcl40MaxCbm),
                    (int)Math.Ceiling(totalGrossWeightKg / Fcl40MaxKg)));
                containerUtilizationPct = Math.Min(100, (int)Math.Round(
                    Math.Max(
                        totalVolumeCbm / (containersRequired * Fcl40MaxCbm) * 100m,
                        totalGrossWeightKg / (containersRequired * Fcl40MaxKg) * 100m),
                    MidpointRounding.AwayFromZero));
                chargeableWeightKg = totalGrossWeightKg;
                baseFreightUsd = containersRequired * corridor.BaseRateFcl40Usd;
                fuelRate = 0.12m;
                terminalHandlingUsd = 380m * containersRequired;
                co2FactorKgPerTonKm = 0.014m;
                break;

            case "road-ftl":
                governingMetric = volumetricWeightKg > totalGrossWeightKg ? "volumetric" : "actual";
                chargeableWeightKg = Math.Max(1m, Math.Ceiling(Math.Max(totalGrossWeightKg, volumetricWeightKg)));
                baseFreightUsd = Math.Max(120m, chargeableWeightKg * corridor.BaseRateRoadKgUsd);
                fuelRate = 0.10m;
                terminalHandlingUsd = 75m;
                transitDaysMin = 4;
                transitDaysMax = 6;
                co2FactorKgPerTonKm = 0.096m;
                break;

            default:
                throw new ArgumentException($"Unsupported transport mode '{mode}'.", nameof(request));
        }

        baseFreightUsd = Round2(baseFreightUsd);
        var fuelSurchargeUsd = Round2(baseFreightUsd * fuelRate);
        terminalHandlingUsd = Round2(terminalHandlingUsd);

        var customsRequired = incoterm == "DDP" || request.CustomsClearance;
        var customsBrokerageUsd = !customsRequired ? 0m : incoterm == "DDP" ? 285m : 145m;
        var importDutiesUsd = incoterm == "DDP"
            ? Round2(request.DeclaredValueUsd * 0.045m + 220m)
            : 0m;

        var insuranceRequired = incoterm is "CIF" or "DDP" || request.CargoInsurance;
        var insuranceUsd = insuranceRequired
            ? Round2(Math.Max(45m, request.DeclaredValueUsd * 0.0045m))
            : 0m;

        var reeferSurchargeUsd = request.ReeferMonitoring
            ? Round2(baseFreightUsd * 0.18m + 65m)
            : 0m;

        var totalUsd = Round2(
            baseFreightUsd +
            fuelSurchargeUsd +
            terminalHandlingUsd +
            customsBrokerageUsd +
            importDutiesUsd +
            insuranceUsd +
            reeferSurchargeUsd);

        var totalVnd = (long)Math.Round(totalUsd * MeridianCatalog.FxUsdToVnd, MidpointRounding.AwayFromZero);
        var depositVnd = (long)Math.Round(totalVnd * MeridianCatalog.VietQrDepositRatio, MidpointRounding.AwayFromZero);

        var distanceForCarbon = mode == "road-ftl" ? Math.Min(corridor.DistanceKm, 2100) : corridor.DistanceKm;
        var weightTons = Math.Max(0.05m, totalGrossWeightKg / 1000m);
        var estimatedCo2Kg = Math.Max(1, (int)Math.Round(weightTons * distanceForCarbon * co2FactorKgPerTonKm, MidpointRounding.AwayFromZero));

        return new FreightQuoteResponse(
            CorridorId: corridor.Id,
            Mode: mode,
            Incoterm: incoterm,
            TotalVolumeCbm: totalVolumeCbm,
            TotalGrossWeightKg: totalGrossWeightKg,
            VolumetricWeightKg: volumetricWeightKg,
            VolumetricDivisor: divisor,
            ChargeableWeightKg: chargeableWeightKg,
            RevenueTonsCbm: revenueTonsCbm,
            ContainersRequired: containersRequired,
            ContainerUtilizationPct: containerUtilizationPct,
            GoverningMetric: governingMetric,
            BaseFreightUsd: baseFreightUsd,
            FuelSurchargeUsd: fuelSurchargeUsd,
            TerminalHandlingUsd: terminalHandlingUsd,
            CustomsBrokerageUsd: customsBrokerageUsd,
            ImportDutiesUsd: importDutiesUsd,
            InsuranceUsd: insuranceUsd,
            ReeferSurchargeUsd: reeferSurchargeUsd,
            TotalUsd: totalUsd,
            TotalVnd: totalVnd,
            DepositVnd: depositVnd,
            TransitDaysMin: transitDaysMin,
            TransitDaysMax: transitDaysMax,
            EstimatedCo2Kg: estimatedCo2Kg);
    }

    private static decimal Round2(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);
    private static decimal Round3(decimal value) => Math.Round(value, 3, MidpointRounding.AwayFromZero);
}
