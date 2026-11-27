using Meridian.Domain.Models;

namespace Meridian.Domain.Data;

public static class MeridianCatalog
{
    public const decimal FxUsdToVnd = 25450m;
    public const decimal VietQrDepositRatio = 0.20m;

    public static readonly IReadOnlyDictionary<string, CorridorSpec> Corridors =
        new Dictionary<string, CorridorSpec>(StringComparer.OrdinalIgnoreCase)
        {
            ["vn-eu-sea"] = new(
                Id: "vn-eu-sea",
                Code: "VNSGN <-> NLRTM",
                OriginCode: "VNSGN",
                OriginName: "Cat Lai HCMC",
                DestCode: "NLRTM",
                DestName: "Rotterdam",
                DistanceKm: 16480,
                TransitDaysMin: 26,
                TransitDaysMax: 30,
                BaseRateAirKgUsd: 5.40m,
                BaseRateLclCbmUsd: 118m,
                BaseRateFcl20Usd: 2650m,
                BaseRateFcl40Usd: 4480m,
                BaseRateRoadKgUsd: 1.85m,
                OceanDistanceKm: 16480,
                AirDistanceKm: 9660,
                OceanBaseDays: 28,
                SeaAirBaseDays: 14,
                AirBaseDays: 3,
                SeaAirHubCode: "DXB",
                SeaAirHubName: "Dubai (Jebel Ali -> DXB)",
                IsEuropeLane: true,
                IsUsWestCoastLane: false),

            ["vn-us-sea"] = new(
                Id: "vn-us-sea",
                Code: "VNHPH <-> USLAX",
                OriginCode: "VNHPH",
                OriginName: "Hai Phong",
                DestCode: "USLAX",
                DestName: "Los Angeles",
                DistanceKm: 12150,
                TransitDaysMin: 18,
                TransitDaysMax: 22,
                BaseRateAirKgUsd: 6.10m,
                BaseRateLclCbmUsd: 132m,
                BaseRateFcl20Usd: 2940m,
                BaseRateFcl40Usd: 4920m,
                BaseRateRoadKgUsd: 2.10m,
                OceanDistanceKm: 12150,
                AirDistanceKm: 13120,
                OceanBaseDays: 20,
                SeaAirBaseDays: 11,
                AirBaseDays: 3,
                SeaAirHubCode: "SIN",
                SeaAirHubName: "Singapore (PSA -> Changi SIN)",
                IsEuropeLane: false,
                IsUsWestCoastLane: true),

            ["vn-jp-sea"] = new(
                Id: "vn-jp-sea",
                Code: "VNDAD <-> JPTYO",
                OriginCode: "VNDAD",
                OriginName: "Da Nang",
                DestCode: "JPTYO",
                DestName: "Tokyo",
                DistanceKm: 3920,
                TransitDaysMin: 5,
                TransitDaysMax: 7,
                BaseRateAirKgUsd: 3.45m,
                BaseRateLclCbmUsd: 78m,
                BaseRateFcl20Usd: 1480m,
                BaseRateFcl40Usd: 2490m,
                BaseRateRoadKgUsd: 1.35m,
                OceanDistanceKm: 3920,
                AirDistanceKm: 4320,
                OceanBaseDays: 6,
                SeaAirBaseDays: 4,
                AirBaseDays: 2,
                SeaAirHubCode: "SIN",
                SeaAirHubName: "Singapore (Regional Hub SIN)",
                IsEuropeLane: false,
                IsUsWestCoastLane: false),

            ["vn-de-air"] = new(
                Id: "vn-de-air",
                Code: "SGN <-> FRA",
                OriginCode: "SGN",
                OriginName: "Tan Son Nhat Air",
                DestCode: "FRA",
                DestName: "Frankfurt",
                DistanceKm: 9660,
                TransitDaysMin: 1,
                TransitDaysMax: 2,
                BaseRateAirKgUsd: 5.85m,
                BaseRateLclCbmUsd: 125m,
                BaseRateFcl20Usd: 2780m,
                BaseRateFcl40Usd: 4650m,
                BaseRateRoadKgUsd: 1.95m,
                OceanDistanceKm: 16480,
                AirDistanceKm: 9660,
                OceanBaseDays: 27,
                SeaAirBaseDays: 13,
                AirBaseDays: 2,
                SeaAirHubCode: "DXB",
                SeaAirHubName: "Dubai (Jebel Ali -> DXB)",
                IsEuropeLane: true,
                IsUsWestCoastLane: false)
        };

    public static readonly IReadOnlyDictionary<string, ContainerSpec> Containers =
        new Dictionary<string, ContainerSpec>(StringComparer.OrdinalIgnoreCase)
        {
            ["20ft-std"] = new("20ft-std", "20'GP", "20ft Standard Dry", 589, 235, 239, 28200m, 2200m, 33.1m, false),
            ["40ft-std"] = new("40ft-std", "40'GP", "40ft Standard Dry", 1203, 235, 239, 26700m, 3750m, 67.6m, false),
            ["40ft-hc"] = new("40ft-hc", "40'HC", "40ft High Cube", 1203, 235, 269, 26500m, 3900m, 76.1m, false),
            ["40ft-reefer"] = new("40ft-reefer", "40'RF", "40ft Reefer Cold-Chain", 1158, 229, 225, 27400m, 4800m, 59.7m, true)
        };

    public static readonly IReadOnlyDictionary<string, HsTariffSpec> HsPresets =
        new Dictionary<string, HsTariffSpec>(StringComparer.OrdinalIgnoreCase)
        {
            ["electronics-servers"] = new(
                "electronics-servers", "8471.50.10", "Electronics / AI Servers",
                "Enterprise Rackmount Servers, GPU Compute Nodes & Switching Gear",
                MfnRatePct: 5m, EvftaRatePct: 0m, CptppRatePct: 0m, AcftaRatePct: 0m,
                DefaultSctRatePct: 0m, DefaultVatRatePct: 8),

            ["industrial-machinery"] = new(
                "industrial-machinery", "8457.10.00", "Industrial Machinery",
                "5-Axis CNC Machining Centers, SMT Lines & Robotics Arms",
                MfnRatePct: 10m, EvftaRatePct: 0m, CptppRatePct: 0m, AcftaRatePct: 0m,
                DefaultSctRatePct: 0m, DefaultVatRatePct: 8),

            ["apparel-textiles"] = new(
                "apparel-textiles", "6201.40.90", "Apparel / Textiles",
                "Technical Waterproof Outerwear, Performance Fabrics & Garment Lots",
                MfnRatePct: 20m, EvftaRatePct: 3.5m, CptppRatePct: 0m, AcftaRatePct: 5m,
                DefaultSctRatePct: 0m, DefaultVatRatePct: 8),

            ["specialty-coffee-agri"] = new(
                "specialty-coffee-agri", "0901.21.20", "Specialty Coffee / Agri",
                "Roasted Single-Origin Specialty Coffee Beans & High-Grade Extracts",
                MfnRatePct: 30m, EvftaRatePct: 5m, CptppRatePct: 4m, AcftaRatePct: 5m,
                DefaultSctRatePct: 0m, DefaultVatRatePct: 8),

            ["automotive-ev-parts"] = new(
                "automotive-ev-parts", "8708.99.80", "Automotive EV Parts",
                "EV Inverter Assemblies, Thermal Pumps & Suspension Sub-Frames",
                MfnRatePct: 18m, EvftaRatePct: 6.2m, CptppRatePct: 3.5m, AcftaRatePct: 5m,
                DefaultSctRatePct: 0m, DefaultVatRatePct: 10),

            ["cosmetics-medical"] = new(
                "cosmetics-medical", "3304.99.30", "Cosmetics / Medical",
                "Clinical Derma Serums, Aesthetic Formulas & Diagnostic Consumables",
                MfnRatePct: 20m, EvftaRatePct: 2.5m, CptppRatePct: 0m, AcftaRatePct: 5m,
                DefaultSctRatePct: 10m, DefaultVatRatePct: 10)
        };

    public static readonly IReadOnlyDictionary<string, string> FtaCertificates =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["MFN"] = "Standard Commercial Invoice",
            ["EVFTA"] = "EUR.1 / REX Self-Cert",
            ["CPTPP"] = "CPTPP Origin Cert",
            ["ACFTA"] = "C/O Form E (ASEAN-China)"
        };

    public static readonly IReadOnlyList<GlobalPortSpec> Ports =
    [
        new("VNSGN", "Cat Lai HCMC", "Cat Lai Port, HCMC", "Vietnam", "Southeast Asia Export Gateway", "sea", 14, 74, 6.8m, 18630, "GREEN", "vn-eu-sea"),
        new("VNHPH", "Hai Phong", "Lach Huyen Deepwater, Hai Phong", "Vietnam", "Northern Vietnam Gateway", "sea", 11, 66, 2.4m, 6575, "GREEN", "vn-us-sea"),
        new("SGSIN", "Singapore SIN", "PSA Tuas & Changi Air Hub (SIN)", "Singapore", "Malacca Strait Transshipment Hub", "multimodal", 9, 71, 39.0m, 106850, "GREEN", "vn-us-sea"),
        new("AEDXB", "Dubai DXB", "Jebel Ali Port & Dubai Air Cargo (DXB)", "United Arab Emirates", "Middle East Sea-Air Bridge", "multimodal", 8, 64, 14.5m, 39725, "GREEN", "vn-eu-sea"),
        new("EGSUZ", "Suez Canal", "Suez Canal Maritime Chokepoint", "Egypt", "Red Sea / Mediterranean Transit", "chokepoint", 16, 69, 22.4m, 61370, "TRANSIT", "vn-eu-sea"),
        new("ZACPT", "Cape of Good Hope", "Cape of Good Hope Diversion Corridor", "South Africa", "South Atlantic Reroute Waypoint", "chokepoint", 6, 48, 1.4m, 3835, "TRANSIT", "vn-eu-sea"),
        new("NLRTM", "Rotterdam RTM", "Port of Rotterdam (Maasvlakte II)", "Netherlands", "European Union Gateway", "sea", 16, 76, 13.8m, 37810, "GREEN", "vn-eu-sea"),
        new("USLAX", "Los Angeles LAX", "Port of Los Angeles (Pier 400)", "United States", "US West Coast Trans-Pacific Gateway", "sea", 22, 81, 9.9m, 27125, "AMBER", "vn-us-sea")
    ];
}
