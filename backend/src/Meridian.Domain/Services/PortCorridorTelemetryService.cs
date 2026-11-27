using Meridian.Domain.Data;
using Meridian.Domain.Models;

namespace Meridian.Domain.Services;

public interface IPortCorridorTelemetryService
{
    CorridorsPortsTelemetryResponse GetTelemetry(IEnumerable<string>? activeDisruptions = null);
}

public sealed class PortCorridorTelemetryService : IPortCorridorTelemetryService
{
    private static readonly HashSet<string> KnownDisruptions = new(StringComparer.OrdinalIgnoreCase)
    {
        "red-sea-suez",
        "cat-lai-congestion",
        "uswc-port-strike"
    };

    public CorridorsPortsTelemetryResponse GetTelemetry(IEnumerable<string>? activeDisruptions = null)
    {
        var normalized = (activeDisruptions ?? [])
            .Select(d => d.Trim().ToLowerInvariant())
            .Where(d => KnownDisruptions.Contains(d))
            .Distinct()
            .ToList();

        var activeSet = normalized.ToHashSet();
        var redSeaActive = activeSet.Contains("red-sea-suez");
        var catLaiActive = activeSet.Contains("cat-lai-congestion");
        var uswcActive = activeSet.Contains("uswc-port-strike");

        var ports = MeridianCatalog.Ports.Select(spec =>
        {
            var dwellDelta = 0;
            var congestionDelta = 0;
            string? impact = null;

            if (redSeaActive)
            {
                if (spec.Code == "EGSUZ")
                {
                    dwellDelta += 288;
                    congestionDelta += 29;
                    impact = "Suez transit suspended — mainline liners diverting around Cape (+12d)";
                }
                else if (spec.Code == "ZACPT")
                {
                    dwellDelta += 18;
                    congestionDelta += 34;
                    impact = "Cape diversion bunker surge — +140% diverted Asia-EU vessel volume";
                }
                else if (spec.Code == "AEDXB")
                {
                    dwellDelta += 6;
                    congestionDelta += 14;
                    impact = "High Sea-Air transshipment intake (Jebel Ali -> DXB air bridge)";
                }
                else if (spec.Code == "NLRTM")
                {
                    dwellDelta += 14;
                    congestionDelta += 9;
                    impact = "Vessel bunching from delayed Cape arrivals at Maasvlakte II";
                }
            }

            if (catLaiActive)
            {
                if (spec.Code == "VNSGN")
                {
                    dwellDelta += 96;
                    congestionDelta += 20;
                    impact = "Yard density >92% — +4d berth dwell & export gate slot queuing";
                }
                else if (spec.Code == "SGSIN")
                {
                    dwellDelta += 10;
                    congestionDelta += 8;
                    impact = "Feeder rollover spillover from HCMC terminals";
                }
            }

            if (uswcActive)
            {
                if (spec.Code == "USLAX")
                {
                    dwellDelta += 216;
                    congestionDelta += 16;
                    impact = "USWC terminal lockout — +9d San Pedro Bay anchorage queue";
                }
                else if (spec.Code == "SGSIN" && impact is null)
                {
                    dwellDelta += 8;
                    congestionDelta += 10;
                    impact = "Trans-Pacific Sea-Air surge diverting US-bound freight via Changi";
                }
                else if (spec.Code == "VNHPH")
                {
                    dwellDelta += 12;
                    congestionDelta += 7;
                    impact = "Blank sailings & equipment repositioning delay on USWC string";
                }
            }

            var effectiveCongestion = Math.Min(99, spec.BaseCongestionPct + congestionDelta);
            var effectiveDwell = spec.BaseDwellHours + dwellDelta;
            var status = ClassifyStatus(effectiveCongestion);

            return new PortTelemetryDto(
                Code: spec.Code,
                ShortLabel: spec.ShortLabel,
                Name: spec.Name,
                Country: spec.Country,
                Region: spec.Region,
                Type: spec.Type,
                BaseDwellHours: spec.BaseDwellHours,
                EffectiveDwellHours: effectiveDwell,
                DisruptionDeltaHours: dwellDelta,
                BaseCongestionPct: spec.BaseCongestionPct,
                EffectiveCongestionPct: effectiveCongestion,
                Status: status,
                AnnualThroughputMTeu: spec.AnnualThroughputMTeu,
                DailyThroughputTeu: spec.DailyThroughputTeu,
                CustomsChannel: spec.CustomsChannel,
                LinkedCorridorId: spec.LinkedCorridorId,
                DisruptionImpact: impact);
        }).ToList();

        var corridors = MeridianCatalog.Corridors.Values.Select(c =>
        {
            decimal oceanDelay = 0m;
            decimal seaAirDelay = 0m;

            if (redSeaActive)
            {
                oceanDelay += c.IsEuropeLane ? 12m : 2m;
                seaAirDelay += c.IsEuropeLane ? 1m : 0.5m;
            }
            if (catLaiActive)
            {
                oceanDelay += 4m;
                seaAirDelay += 1.5m;
            }
            if (uswcActive)
            {
                oceanDelay += c.IsUsWestCoastLane ? 9m : 2m;
                seaAirDelay += c.IsUsWestCoastLane ? 1m : 0.5m;
            }

            var capeActive = redSeaActive && c.IsEuropeLane;
            var status = capeActive
                ? "rerouted-cape"
                : oceanDelay >= 8m
                    ? "critical-delay"
                    : oceanDelay > 0m
                        ? "congested"
                        : "nominal";

            return new CorridorStatusDto(
                CorridorId: c.Id,
                Code: c.Code,
                OriginCode: c.OriginCode,
                DestCode: c.DestCode,
                BaseOceanDays: c.OceanBaseDays,
                EffectiveOceanDays: c.OceanBaseDays + oceanDelay,
                SeaAirHubCode: c.SeaAirHubCode,
                EffectiveSeaAirDays: c.SeaAirBaseDays + seaAirDelay,
                Status: status,
                CapeRerouteActive: capeActive);
        }).ToList();

        var congestedPortCount = ports.Count(p => p.Status is "elevated" or "critical");
        var totalDailyTeuAtRisk = ports.Where(p => p.DisruptionDeltaHours > 0).Sum(p => p.DailyThroughputTeu);

        var advisory = (redSeaActive, uswcActive, catLaiActive) switch
        {
            (true, true, _) => "DUAL CHOKEPOINT ALERT: Asia-EU liners diverting via Cape (+12d) & USWC locked (+9d) — shift urgent cargo to DXB/SIN Sea-Air bridges.",
            (true, false, _) => "RED SEA DIVERSION ACTIVE: Suez direct suspended; vessels rerouting around Cape of Good Hope (+12d). Sea-Air via Dubai DXB cuts transit to 15d.",
            (false, true, _) => "USWC STRIKE ACTIVE: Los Angeles Pier 400 anchorage backed up +9d. Sea-Air Hybrid via Singapore SIN preserves 12d Pacific SLA.",
            (false, false, true) => "CAT LAI PEAK CONGESTION: VNSGN yard density >92% (+4d berth dwell). Pre-gate containers early or route North via Hai Phong Lach Huyen.",
            _ => "All global maritime lanes & air corridors operating at nominal schedule reliability (0 active shocks)."
        };

        return new CorridorsPortsTelemetryResponse(
            ActiveDisruptions: normalized,
            CapeRerouteActive: redSeaActive,
            CongestedPortCount: congestedPortCount,
            TotalDailyTeuAtRisk: totalDailyTeuAtRisk,
            Advisory: advisory,
            Ports: ports,
            Corridors: corridors);
    }

    private static string ClassifyStatus(int congestionPct) =>
        congestionPct >= 92 ? "critical"
        : congestionPct >= 82 ? "elevated"
        : congestionPct >= 70 ? "moderate"
        : "optimal";
}
