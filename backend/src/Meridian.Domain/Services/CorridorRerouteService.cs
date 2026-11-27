using Meridian.Domain.Data;
using Meridian.Domain.Models;

namespace Meridian.Domain.Services;

public interface ICorridorRerouteService
{
    CorridorRerouteResponse SimulateReroute(CorridorRerouteRequest request);
}

public sealed class CorridorRerouteService : ICorridorRerouteService
{
    private static readonly HashSet<string> KnownDisruptions = new(StringComparer.OrdinalIgnoreCase)
    {
        "red-sea-suez",
        "cat-lai-congestion",
        "uswc-port-strike"
    };

    private sealed class ShockAccumulator
    {
        public decimal DelayDays { get; set; }
        public decimal SurchargePct { get; set; }
        public decimal FlatSurchargeUsd { get; set; }
        public decimal Co2Mult { get; set; }
    }

    public CorridorRerouteResponse SimulateReroute(CorridorRerouteRequest request)
    {
        if (!MeridianCatalog.Corridors.TryGetValue(request.CorridorId, out var corridor))
        {
            throw new ArgumentException($"Unknown corridorId '{request.CorridorId}'.", nameof(request));
        }

        var activeDisruptions = (request.ActiveDisruptions ?? [])
            .Select(d => d.Trim().ToLowerInvariant())
            .Where(d => KnownDisruptions.Contains(d))
            .Distinct()
            .ToList();
        var activeSet = activeDisruptions.ToHashSet();

        var weightKg = Round2(request.CargoWeightKg);
        var volumeCbm = Round2(request.CargoVolumeCbm);
        var cargoValueUsd = Round2(request.CargoValueUsd);
        var slaDeadline = request.SlaDeadlineDays;

        // IATA Air Volumetric (6000) & Ocean W/M / FCL pricing
        var airVolKg = volumeCbm * 1_000_000m / 6000m;
        var airChargeableKg = Math.Max(1m, Math.Ceiling(Math.Max(weightKg, airVolKg)));
        var revenueTons = Math.Max(1m, Math.Max(volumeCbm, weightKg / 1000m));

        decimal oceanBaseFreightUsd;
        if (volumeCbm >= 18m || weightKg >= 10000m)
        {
            if (volumeCbm <= 33.1m && weightKg <= 28200m)
            {
                oceanBaseFreightUsd = Round2(corridor.BaseRateFcl20Usd * 1.12m + 260m);
            }
            else
            {
                var fcl40Count = Math.Max(1, Math.Max(
                    (int)Math.Ceiling(volumeCbm / 76.1m),
                    (int)Math.Ceiling(weightKg / 26500m)));
                oceanBaseFreightUsd = Round2(fcl40Count * (corridor.BaseRateFcl40Usd * 1.12m + 380m));
            }
        }
        else
        {
            oceanBaseFreightUsd = Round2(Math.Max(240m, revenueTons * corridor.BaseRateLclCbmUsd) * 1.12m + 165m);
        }

        var seaAirBaseFreightUsd = Round2(
            oceanBaseFreightUsd * 0.36m +
            240m +
            Math.Max(320m, airChargeableKg * corridor.BaseRateAirKgUsd * 0.52m) * 1.12m +
            110m);

        var directAirBaseFreightUsd = Round2(
            Math.Max(480m, airChargeableKg * corridor.BaseRateAirKgUsd * 1.18m) * 1.16m +
            145m);

        var shocks = new Dictionary<string, ShockAccumulator>
        {
            ["ocean-direct"] = new(),
            ["sea-air-hybrid"] = new(),
            ["direct-air"] = new()
        };

        if (activeSet.Contains("red-sea-suez"))
        {
            if (corridor.IsEuropeLane)
            {
                shocks["ocean-direct"].DelayDays += 12m;
                shocks["ocean-direct"].SurchargePct += 0.34m;
                shocks["ocean-direct"].Co2Mult += 0.22m;

                shocks["sea-air-hybrid"].DelayDays += 1m;
                shocks["sea-air-hybrid"].SurchargePct += 0.08m;
                shocks["sea-air-hybrid"].Co2Mult += 0.03m;

                shocks["direct-air"].SurchargePct += 0.04m;
                shocks["direct-air"].Co2Mult += 0.02m;
            }
            else
            {
                shocks["ocean-direct"].DelayDays += 2m;
                shocks["ocean-direct"].SurchargePct += 0.06m;
                shocks["ocean-direct"].Co2Mult += 0.04m;

                shocks["sea-air-hybrid"].DelayDays += 0.5m;
                shocks["sea-air-hybrid"].SurchargePct += 0.02m;
                shocks["sea-air-hybrid"].Co2Mult += 0.01m;

                shocks["direct-air"].SurchargePct += 0.02m;
            }
        }

        if (activeSet.Contains("cat-lai-congestion"))
        {
            shocks["ocean-direct"].DelayDays += 4m;
            shocks["ocean-direct"].FlatSurchargeUsd += 480m;
            shocks["ocean-direct"].Co2Mult += 0.03m;

            shocks["sea-air-hybrid"].DelayDays += 1.5m;
            shocks["sea-air-hybrid"].FlatSurchargeUsd += 180m;
            shocks["sea-air-hybrid"].Co2Mult += 0.01m;

            shocks["direct-air"].DelayDays += 0.5m;
            shocks["direct-air"].FlatSurchargeUsd += 95m;
        }

        if (activeSet.Contains("uswc-port-strike"))
        {
            if (corridor.IsUsWestCoastLane)
            {
                shocks["ocean-direct"].DelayDays += 9m;
                shocks["ocean-direct"].FlatSurchargeUsd += 1450m;
                shocks["ocean-direct"].Co2Mult += 0.08m;

                shocks["sea-air-hybrid"].DelayDays += 1m;
                shocks["sea-air-hybrid"].FlatSurchargeUsd += 260m;
                shocks["sea-air-hybrid"].Co2Mult += 0.02m;

                shocks["direct-air"].DelayDays += 0.5m;
                shocks["direct-air"].FlatSurchargeUsd += 140m;
                shocks["direct-air"].Co2Mult += 0.01m;
            }
            else
            {
                shocks["ocean-direct"].DelayDays += 2m;
                shocks["ocean-direct"].FlatSurchargeUsd += 220m;
                shocks["ocean-direct"].Co2Mult += 0.02m;

                shocks["sea-air-hybrid"].DelayDays += 0.5m;
                shocks["sea-air-hybrid"].FlatSurchargeUsd += 60m;

                shocks["direct-air"].FlatSurchargeUsd += 35m;
            }
        }

        var dailySlaPenaltyUsd = request.DailyPenaltyOverrideUsd.HasValue && request.DailyPenaltyOverrideUsd.Value >= 0m
            ? Round2(request.DailyPenaltyOverrideUsd.Value)
            : Math.Max(120m, Round2(cargoValueUsd * 0.0045m));

        var weightTons = Math.Max(0.05m, weightKg / 1000m);

        var modeDefs = new (string ModeId, string Label, string RoutingPath, string HubCode, string HubName, decimal BaseDays, decimal BaseFreightUsd, decimal BaseCo2Kg)[]
        {
            (
                "ocean-direct",
                "Ocean Direct (FCL / LCL)",
                $"{corridor.OriginCode} -> Direct Sea -> {corridor.DestCode}",
                corridor.DestCode,
                $"Direct Marine ({corridor.DestName})",
                corridor.OceanBaseDays,
                oceanBaseFreightUsd,
                weightTons * corridor.OceanDistanceKm * 0.015m
            ),
            (
                "sea-air-hybrid",
                $"Sea-Air Hybrid ({corridor.SeaAirHubCode})",
                $"{corridor.OriginCode} -> Sea -> {corridor.SeaAirHubCode} -> Air -> {corridor.DestCode}",
                corridor.SeaAirHubCode,
                corridor.SeaAirHubName,
                corridor.SeaAirBaseDays,
                seaAirBaseFreightUsd,
                weightTons * (corridor.OceanDistanceKm * 0.42m * 0.015m + corridor.AirDistanceKm * 0.56m * 0.565m)
            ),
            (
                "direct-air",
                "Direct Air Freight (B777F)",
                $"SGN -> Main-Deck Freighter -> {corridor.DestCode}",
                "SGN",
                "Direct Air Cargo Ramp",
                corridor.AirBaseDays,
                directAirBaseFreightUsd,
                weightTons * corridor.AirDistanceKm * 0.602m
            )
        };

        var preliminary = modeDefs.Select(def =>
        {
            var shock = shocks[def.ModeId];
            var delayDays = Round1(shock.DelayDays);
            var totalLeadDays = Round1(def.BaseDays + delayDays);
            var slaBreachDays = Math.Max(0, (int)Math.Ceiling(totalLeadDays - slaDeadline));
            var slaCompliant = slaBreachDays == 0;

            var disruptionSurcharge = Round2(def.BaseFreightUsd * shock.SurchargePct + shock.FlatSurchargeUsd);
            var carryUsd = Round2(cargoValueUsd * (0.18m / 365m) * totalLeadDays);
            var slaPenaltyUsd = Round2(slaBreachDays * dailySlaPenaltyUsd);
            var holdingPenalty = Round2(carryUsd + slaPenaltyUsd);
            var totalLandedUsd = Round2(def.BaseFreightUsd + disruptionSurcharge + holdingPenalty);
            var totalLandedVnd = (long)Math.Round(totalLandedUsd * MeridianCatalog.FxUsdToVnd, MidpointRounding.AwayFromZero);

            var co2Kg = Math.Max(1, (int)Math.Round(def.BaseCo2Kg * (1m + shock.Co2Mult), MidpointRounding.AwayFromZero));
            var intensity = Round1(co2Kg / weightTons);

            return new RerouteOptionDto(
                ModeId: def.ModeId,
                Label: def.Label,
                RoutingPath: def.RoutingPath,
                HubCode: def.HubCode,
                HubName: def.HubName,
                BaseLeadTimeDays: def.BaseDays,
                DisruptionDelayDays: delayDays,
                TotalLeadTimeDays: totalLeadDays,
                SlaBreachDays: slaBreachDays,
                SlaCompliant: slaCompliant,
                FreightCostUsd: def.BaseFreightUsd,
                DisruptionSurchargeUsd: disruptionSurcharge,
                WorkingCapitalCarryUsd: carryUsd,
                SlaBreachPenaltyUsd: slaPenaltyUsd,
                InventoryHoldingPenaltyUsd: holdingPenalty,
                TotalLandedCostUsd: totalLandedUsd,
                TotalLandedCostVnd: totalLandedVnd,
                EstimatedCo2Kg: co2Kg,
                CarbonIntensityKgPerTon: intensity,
                ResilienceScore: 0,
                Recommended: false);
        }).ToList();

        var minCost = preliminary.Min(o => o.TotalLandedCostUsd);

        var scored = preliminary.Select(opt =>
        {
            var costScore = Math.Clamp(minCost / Math.Max(1m, opt.TotalLandedCostUsd) * 45m, 0m, 45m);
            var slaScore = opt.SlaCompliant ? 35m : Math.Max(0m, 35m - opt.SlaBreachDays * 3.5m);
            var insulationScore = Math.Max(0m, 20m - opt.DisruptionDelayDays * 1.4m);
            var score = Math.Clamp((int)Math.Round(costScore + slaScore + insulationScore, MidpointRounding.AwayFromZero), 1, 100);
            return opt with { ResilienceScore = score };
        }).ToList();

        var winner = scored
            .OrderByDescending(o => o.ResilienceScore)
            .ThenBy(o => o.TotalLandedCostUsd)
            .First();

        var finalized = scored
            .Select(o => o.ModeId == winner.ModeId ? o with { Recommended = true } : o)
            .ToList();

        var oceanOpt = finalized[0];
        var seaAirOpt = finalized[1];
        var airOpt = finalized[2];

        var leadSaved = Round1(Math.Max(0m, oceanOpt.TotalLeadTimeDays - winner.TotalLeadTimeDays));
        var netDelta = Round2(winner.TotalLandedCostUsd - oceanOpt.TotalLandedCostUsd);
        var seaAirCo2SavingsPct = Round1(Math.Max(0m, (decimal)(airOpt.EstimatedCo2Kg - seaAirOpt.EstimatedCo2Kg) / Math.Max(1, airOpt.EstimatedCo2Kg) * 100m));

        return new CorridorRerouteResponse(
            CorridorId: corridor.Id,
            CorridorCode: corridor.Code,
            ActiveDisruptions: activeDisruptions,
            CargoWeightKg: weightKg,
            CargoVolumeCbm: volumeCbm,
            CargoValueUsd: cargoValueUsd,
            SlaDeadlineDays: slaDeadline,
            RecommendedMode: winner.ModeId,
            LeadTimeSavedVsOceanDays: leadSaved,
            NetCostDeltaRecommendedVsOceanUsd: netDelta,
            SeaAirCo2SavingsVsAirPct: seaAirCo2SavingsPct,
            Options: finalized);
    }

    private static decimal Round1(decimal value) => Math.Round(value, 1, MidpointRounding.AwayFromZero);
    private static decimal Round2(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);
}
