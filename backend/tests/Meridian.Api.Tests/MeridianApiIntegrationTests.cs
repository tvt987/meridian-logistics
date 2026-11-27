using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Meridian.Domain.Models;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Meridian.Api.Tests;

public sealed class MeridianApiIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;
    private static readonly JsonSerializerOptions JsonOpts = new(JsonSerializerDefaults.Web);

    public MeridianApiIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    /* ========================================================================
     * 1. HEALTH & SECURITY HEADERS
     * ======================================================================== */

    [Fact]
    public async Task HealthEndpoint_Returns200HealthyWithCatalogCountsAndSecurityHeaders()
    {
        var response = await _client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.Equal("strict-origin-when-cross-origin", response.Headers.GetValues("Referrer-Policy").Single());

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("healthy", doc.RootElement.GetProperty("status").GetString());
        Assert.Equal("4.0.0", doc.RootElement.GetProperty("version").GetString());
        Assert.Equal(4, doc.RootElement.GetProperty("corridorsLoaded").GetInt32());
        Assert.Equal(8, doc.RootElement.GetProperty("portsLoaded").GetInt32());
        Assert.Equal(6, doc.RootElement.GetProperty("hsPresetsLoaded").GetInt32());
        Assert.Equal(7, doc.RootElement.GetProperty("incotermsSupported").GetInt32());
    }

    /* ========================================================================
     * 2. VOLUMETRIC FREIGHT QUOTER API (/api/v1/quotes/freight)
     * ======================================================================== */

    [Fact]
    public async Task FreightQuote_AirExpress_AppliesDivisor6000AndVolumetricGovernsWhenLightBulky()
    {
        // 120 x 80 x 95 cm = 912,000 cm3 per pkg * 6 = 5,472,000 cm3
        // Divisor 6000 => volumetric = 912 kg vs actual = 570 kg => volumetric governs!
        var req = new FreightQuoteRequest(
            CorridorId: "vn-eu-sea",
            Mode: "air-express",
            LengthCm: 120,
            WidthCm: 80,
            HeightCm: 95,
            GrossWeightKg: 95,
            Packages: 6,
            DeclaredValueUsd: 85000,
            Incoterm: "CIF",
            CustomsClearance: true,
            CargoInsurance: true);

        var response = await _client.PostAsJsonAsync("/api/v1/quotes/freight", req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var quote = await response.Content.ReadFromJsonAsync<FreightQuoteResponse>(JsonOpts);
        Assert.NotNull(quote);
        Assert.Equal(6000, quote.VolumetricDivisor);
        Assert.Equal(570m, quote.TotalGrossWeightKg);
        Assert.Equal(912m, quote.VolumetricWeightKg);
        Assert.Equal(912m, quote.ChargeableWeightKg);
        Assert.Equal("volumetric", quote.GoverningMetric);
        Assert.True(quote.InsuranceUsd > 0m);
        Assert.Equal((long)Math.Round(quote.TotalVnd * 0.20m, MidpointRounding.AwayFromZero), quote.DepositVnd);
    }

    [Fact]
    public async Task FreightQuote_AirStandard_AppliesDivisor5000AndActualGovernsWhenDenseHeavy()
    {
        // 50 x 50 x 50 cm = 125,000 cm3 * 4 = 500,000 cm3 / 5000 = 100 kg volumetric vs 480 kg actual
        var req = new FreightQuoteRequest(
            CorridorId: "vn-de-air",
            Mode: "air-standard",
            LengthCm: 50,
            WidthCm: 50,
            HeightCm: 50,
            GrossWeightKg: 120,
            Packages: 4,
            DeclaredValueUsd: 40000,
            Incoterm: "FOB");

        var response = await _client.PostAsJsonAsync("/api/v1/quotes/freight", req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var quote = await response.Content.ReadFromJsonAsync<FreightQuoteResponse>(JsonOpts);
        Assert.NotNull(quote);
        Assert.Equal(5000, quote.VolumetricDivisor);
        Assert.Equal(100m, quote.VolumetricWeightKg);
        Assert.Equal(480m, quote.ChargeableWeightKg);
        Assert.Equal("actual", quote.GoverningMetric);
        Assert.Equal(0m, quote.InsuranceUsd);
        Assert.Equal(0m, quote.ImportDutiesUsd);
    }

    [Fact]
    public async Task FreightQuote_SeaLcl_ComputesWmRevenueTonsCorrectly()
    {
        // 42 cartons x (65x48x52 cm) = 6.814 CBM vs 588 kg (0.588t) -> W/M revenue ton = 6.81 CBM
        var req = new FreightQuoteRequest(
            CorridorId: "vn-eu-sea",
            Mode: "sea-lcl",
            LengthCm: 65,
            WidthCm: 48,
            HeightCm: 52,
            GrossWeightKg: 14,
            Packages: 42,
            DeclaredValueUsd: 38000,
            Incoterm: "FOB");

        var response = await _client.PostAsJsonAsync("/api/v1/quotes/freight", req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var quote = await response.Content.ReadFromJsonAsync<FreightQuoteResponse>(JsonOpts);
        Assert.NotNull(quote);
        Assert.Equal(1000, quote.VolumetricDivisor);
        Assert.Equal("cbm", quote.GoverningMetric);
        Assert.Equal(6.81m, quote.RevenueTonsCbm);
        Assert.Equal(6810m, quote.ChargeableWeightKg);
    }

    [Fact]
    public async Task FreightQuote_SeaFcl20_AllocatesMultipleContainersWhenVolumeOrPayloadExceedsSingleTeu()
    {
        // 40 CBM exceeds 33.2 CBM 20'GP -> allocates 2 x 20ft containers
        var req = new FreightQuoteRequest(
            CorridorId: "vn-us-sea",
            Mode: "sea-fcl-20",
            LengthCm: 100,
            WidthCm: 100,
            HeightCm: 100,
            GrossWeightKg: 400,
            Packages: 40,
            DeclaredValueUsd: 120000,
            Incoterm: "CIF",
            ReeferMonitoring: true);

        var response = await _client.PostAsJsonAsync("/api/v1/quotes/freight", req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var quote = await response.Content.ReadFromJsonAsync<FreightQuoteResponse>(JsonOpts);
        Assert.NotNull(quote);
        Assert.Null(quote.VolumetricDivisor);
        Assert.Equal("container", quote.GoverningMetric);
        Assert.Equal(2, quote.ContainersRequired);
        Assert.True(quote.ReeferSurchargeUsd > 0m);
    }

    [Fact]
    public async Task FreightQuote_Incoterms2020_DdpIncludesMandatoryCustomsInsuranceAndDuties()
    {
        var fobReq = new FreightQuoteRequest("vn-eu-sea", "sea-fcl-40", 120, 100, 140, 780, 18, 92000, "FOB");
        var cifReq = fobReq with { Incoterm = "CIF" };
        var ddpReq = fobReq with { Incoterm = "DDP" };

        var fob = await (await _client.PostAsJsonAsync("/api/v1/quotes/freight", fobReq)).Content.ReadFromJsonAsync<FreightQuoteResponse>(JsonOpts);
        var cif = await (await _client.PostAsJsonAsync("/api/v1/quotes/freight", cifReq)).Content.ReadFromJsonAsync<FreightQuoteResponse>(JsonOpts);
        var ddp = await (await _client.PostAsJsonAsync("/api/v1/quotes/freight", ddpReq)).Content.ReadFromJsonAsync<FreightQuoteResponse>(JsonOpts);

        Assert.NotNull(fob);
        Assert.NotNull(cif);
        Assert.NotNull(ddp);
        Assert.Equal(0m, fob.InsuranceUsd);
        Assert.True(cif.InsuranceUsd > 0m);
        Assert.Equal(0m, cif.ImportDutiesUsd);
        Assert.Equal(285m, ddp.CustomsBrokerageUsd);
        Assert.True(ddp.ImportDutiesUsd > 4000m);
        Assert.True(ddp.TotalUsd > cif.TotalUsd && cif.TotalUsd > fob.TotalUsd);
    }

    [Fact]
    public async Task FreightQuote_InvalidDimensionsOrMode_Returns400ValidationProblem()
    {
        var badReq = new FreightQuoteRequest("vn-eu-sea", "teleport-mode", -10, 80, 95, 50, 1, 1000, "FOB");
        var response = await _client.PostAsJsonAsync("/api/v1/quotes/freight", badReq);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /* ========================================================================
     * 3. VIETNAM HS CODE & FTA CUSTOMS ENGINE (/api/v1/customs/landed-cost)
     * ======================================================================== */

    [Fact]
    public async Task CustomsLandedCost_CascadingDutySctVatMath_MatchesVietnamCustomsFormula()
    {
        // Cosmetics MFN=20%, SCT=10%, VAT=10%, CIF = 9000 + 800 + 200 = 10,000
        var req = new CustomsLandedCostRequest(
            PresetId: "cosmetics-medical",
            CustomHsCode: null,
            Regime: "MFN",
            FobValueUsd: 9000,
            FreightUsd: 800,
            InsuranceUsd: 200,
            UnitQuantity: 100,
            VatRatePct: 10,
            SctRatePct: 10,
            LocalClearanceFeesUsd: 0);

        var response = await _client.PostAsJsonAsync("/api/v1/customs/landed-cost", req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var res = await response.Content.ReadFromJsonAsync<CustomsLandedCostResponse>(JsonOpts);
        Assert.NotNull(res);
        Assert.Equal(10000m, res.CifValueUsd);
        Assert.Equal(2000m, res.ImportDutyUsd);
        Assert.Equal(1200m, res.SctUsd);
        Assert.Equal(1320m, res.VatUsd);
        Assert.Equal(4520m, res.TotalTaxesUsd);
        Assert.Equal(14520m, res.TotalLandedCostUsd);
        Assert.Equal(145.20m, res.LandedCostPerUnitUsd);
    }

    [Fact]
    public async Task CustomsLandedCost_EvftaVsMfn_DeliversSubstantialDutyAndCascadingVatSavings()
    {
        var mfnReq = new CustomsLandedCostRequest("apparel-textiles", null, "MFN", 50000, 3000, 250, 1000, 8, 0, 350);
        var evftaReq = mfnReq with { Regime = "EVFTA" };

        var mfn = await (await _client.PostAsJsonAsync("/api/v1/customs/landed-cost", mfnReq)).Content.ReadFromJsonAsync<CustomsLandedCostResponse>(JsonOpts);
        var evfta = await (await _client.PostAsJsonAsync("/api/v1/customs/landed-cost", evftaReq)).Content.ReadFromJsonAsync<CustomsLandedCostResponse>(JsonOpts);

        Assert.NotNull(mfn);
        Assert.NotNull(evfta);
        Assert.Equal(20m, mfn.AppliedDutyRatePct);
        Assert.Equal(3.5m, evfta.AppliedDutyRatePct);
        Assert.True(evfta.ImportDutyUsd < mfn.ImportDutyUsd);
        Assert.True(evfta.VatUsd < mfn.VatUsd);
        Assert.Equal(mfn.TotalLandedCostUsd - evfta.TotalLandedCostUsd, evfta.SavingsVsMfnUsd);
        Assert.True(evfta.SavingsVsMfnUsd > 9000m);
        Assert.Equal("CPTPP", evfta.BestRegime); // CPTPP is 0% for apparel
    }

    [Fact]
    public async Task CustomsLandedCost_CptppZeroDuty_ReturnsFullFourRegimeComparisonMatrix()
    {
        var req = new CustomsLandedCostRequest("electronics-servers", "8471.90.90", "CPTPP", 128000, 4850, 598, 32, 8, 0, 340);
        var response = await _client.PostAsJsonAsync("/api/v1/customs/landed-cost", req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var res = await response.Content.ReadFromJsonAsync<CustomsLandedCostResponse>(JsonOpts);
        Assert.NotNull(res);
        Assert.Equal("8471.90.90", res.HsCode);
        Assert.Equal(0m, res.ImportDutyUsd);
        Assert.Equal(4, res.Comparisons.Count);
        Assert.Equal(["MFN", "EVFTA", "CPTPP", "ACFTA"], res.Comparisons.Select(c => c.Regime).ToArray());
        Assert.True(res.SavingsVsMfnUsd > 7000m);
    }

    [Fact]
    public async Task CustomsLandedCost_AcftaFormE_SavesOver10kOnSpecialtyCoffeeImport()
    {
        var req = new CustomsLandedCostRequest("specialty-coffee-agri", null, "ACFTA", 40000, 2000, 200, 2000, 8, 0, 300);
        var response = await _client.PostAsJsonAsync("/api/v1/customs/landed-cost", req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var res = await response.Content.ReadFromJsonAsync<CustomsLandedCostResponse>(JsonOpts);
        Assert.NotNull(res);
        Assert.Equal(5m, res.AppliedDutyRatePct);
        Assert.True(res.SavingsVsMfnUsd > 11000m);
        Assert.Equal("CPTPP", res.BestRegime);
    }

    [Fact]
    public async Task CustomsLandedCost_InvalidVatRate_Returns400ValidationProblem()
    {
        var req = new CustomsLandedCostRequest("apparel-textiles", null, "EVFTA", 50000, 2000, 200, 100, VatRatePct: 12);
        var response = await _client.PostAsJsonAsync("/api/v1/customs/landed-cost", req);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /* ========================================================================
     * 4. CONTAINER 3D BALANCE & SOLAS VGM AUDIT (/api/v1/containers/balance-check)
     * ======================================================================== */

    [Fact]
    public async Task ContainerBalance_WellDistributed40ftHighCube_PassesSolasVgmWithBalancedCgXyz()
    {
        var req = new ContainerBalanceRequest(
            ContainerType: "40ft-hc",
            Skus:
            [
                new CargoSkuRequest("SRV-4U", "4U Rack Server Crates", 118, 76, 84, 145, 36, true),
                new CargoSkuRequest("UPS-HV", "HV Battery Units", 95, 75, 80, 210, 24, true),
                new CargoSkuRequest("LDR-PRO", "LiDAR Cases", 110, 76, 90, 82, 12, false)
            ]);

        var response = await _client.PostAsJsonAsync("/api/v1/containers/balance-check", req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var res = await response.Content.ReadFromJsonAsync<ContainerBalanceResponse>(JsonOpts);
        Assert.NotNull(res);
        Assert.True(res.SolasVgmCompliant);
        Assert.Equal("APPROVED_SOLAS_VGM", res.Status);
        Assert.Empty(res.SolasViolations);
        Assert.InRange(res.CgXPct, 36m, 64m);
        Assert.InRange(res.CgYPct, 38m, 62m);
        Assert.InRange(res.CgZPct, 10m, 58m);
        Assert.Equal(100m, res.FrontAxleSharePct + res.RearAxleSharePct);
        Assert.Equal(3900m + res.TotalCargoWeightKg, res.VgmGrossKg);
    }

    [Fact]
    public async Task ContainerBalance_SolasOverweightPayloadInSingleContainer_RejectsWithOverweightViolation()
    {
        // 20ft maxPayload = 28,200 kg. Loading 32,000 kg in StrictSingleContainer MUST be rejected!
        var req = new ContainerBalanceRequest(
            ContainerType: "20ft-std",
            Skus:
            [
                new CargoSkuRequest("STL-01", "Dense Steel Coils", 90, 90, 90, 2000, 16, true)
            ],
            StrictSingleContainer: true);

        var response = await _client.PostAsJsonAsync("/api/v1/containers/balance-check", req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var res = await response.Content.ReadFromJsonAsync<ContainerBalanceResponse>(JsonOpts);
        Assert.NotNull(res);
        Assert.False(res.SolasVgmCompliant);
        Assert.Equal("REJECTED_SOLAS_VGM", res.Status);
        Assert.Contains("OVERWEIGHT_PAYLOAD", res.SolasViolations);
        Assert.True(res.VgmGrossKg > res.MaxGrossSolasKg);
    }

    [Fact]
    public async Task ContainerBalance_NoseHeavyPartialLoad_RejectsWithLongitudinalImbalance()
    {
        // 2 cartons packed at nose X=0..100 of 1203cm container => CG-X ~4.2% -> nose-heavy SOLAS failure
        var req = new ContainerBalanceRequest(
            ContainerType: "40ft-hc",
            Skus: [new CargoSkuRequest("HVY-01", "Heavy Test Crate", 100, 100, 100, 800, 2, true)]);

        var response = await _client.PostAsJsonAsync("/api/v1/containers/balance-check", req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var res = await response.Content.ReadFromJsonAsync<ContainerBalanceResponse>(JsonOpts);
        Assert.NotNull(res);
        Assert.False(res.SolasVgmCompliant);
        Assert.Equal("nose-heavy", res.BalanceStatus);
        Assert.Contains("LONGITUDINAL_IMBALANCE", res.SolasViolations);
        Assert.True(res.FrontAxleSharePct > 80m);
    }

    [Fact]
    public async Task ContainerBalance_OversizeCartonExceedingReeferHeight_RejectsWithOversizeCargo()
    {
        // 40ft-reefer innerHeight = 225 cm; carton height = 245 cm -> unfit!
        var req = new ContainerBalanceRequest(
            ContainerType: "40ft-reefer",
            Skus: [new CargoSkuRequest("TALL-RF", "Oversize Cold Crate", 100, 100, 245, 500, 4, false)]);

        var response = await _client.PostAsJsonAsync("/api/v1/containers/balance-check", req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var res = await response.Content.ReadFromJsonAsync<ContainerBalanceResponse>(JsonOpts);
        Assert.NotNull(res);
        Assert.False(res.SolasVgmCompliant);
        Assert.Equal(4, res.UnfitCartons);
        Assert.Contains("OVERSIZE_CARGO", res.SolasViolations);
    }

    [Fact]
    public async Task ContainerBalance_EmptySkuManifest_Returns400ValidationProblem()
    {
        var req = new ContainerBalanceRequest("40ft-hc", []);
        var response = await _client.PostAsJsonAsync("/api/v1/containers/balance-check", req);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /* ========================================================================
     * 5. PORT DISRUPTION & MULTIMODAL REROUTE (/api/v1/corridors/reroute)
     * ======================================================================== */

    [Fact]
    public async Task CorridorReroute_CalmSeasWithRelaxedSla_RecommendsOceanDirect()
    {
        var req = new CorridorRerouteRequest(
            CorridorId: "vn-eu-sea",
            CargoWeightKg: 4200,
            CargoVolumeCbm: 22,
            CargoValueUsd: 180000,
            SlaDeadlineDays: 32,
            ActiveDisruptions: []);

        var response = await _client.PostAsJsonAsync("/api/v1/corridors/reroute", req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var res = await response.Content.ReadFromJsonAsync<CorridorRerouteResponse>(JsonOpts);
        Assert.NotNull(res);
        Assert.Equal("ocean-direct", res.RecommendedMode);
        Assert.Equal(3, res.Options.Count);
        Assert.True(res.Options[0].SlaCompliant);
        Assert.Equal(0m, res.Options[0].DisruptionDelayDays);
    }

    [Fact]
    public async Task CorridorReroute_RedSeaPlusCatLaiShocks_RecommendsSeaAirHybridViaDubaiWithSuperiorSlaScore()
    {
        var req = new CorridorRerouteRequest(
            CorridorId: "vn-eu-sea",
            CargoWeightKg: 4200,
            CargoVolumeCbm: 22,
            CargoValueUsd: 180000,
            SlaDeadlineDays: 22,
            ActiveDisruptions: ["red-sea-suez", "cat-lai-congestion"]);

        var response = await _client.PostAsJsonAsync("/api/v1/corridors/reroute", req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var res = await response.Content.ReadFromJsonAsync<CorridorRerouteResponse>(JsonOpts);
        Assert.NotNull(res);
        Assert.Equal("sea-air-hybrid", res.RecommendedMode);

        var ocean = res.Options.Single(o => o.ModeId == "ocean-direct");
        var seaAir = res.Options.Single(o => o.ModeId == "sea-air-hybrid");
        var air = res.Options.Single(o => o.ModeId == "direct-air");

        Assert.Equal("DXB", seaAir.HubCode);
        Assert.Equal(16m, ocean.DisruptionDelayDays); // +12 Red Sea + 4 Cat Lai
        Assert.Equal(44m, ocean.TotalLeadTimeDays);
        Assert.False(ocean.SlaCompliant);
        Assert.True(seaAir.SlaCompliant);
        Assert.True(seaAir.ResilienceScore > ocean.ResilienceScore);
        Assert.True(ocean.EstimatedCo2Kg < seaAir.EstimatedCo2Kg && seaAir.EstimatedCo2Kg < air.EstimatedCo2Kg);
        Assert.True(res.SeaAirCo2SavingsVsAirPct > 40m);
    }

    [Fact]
    public async Task CorridorReroute_UswcPortStrikeOnPacificLane_RoutesSeaAirViaSingaporeHub()
    {
        var req = new CorridorRerouteRequest(
            CorridorId: "vn-us-sea",
            CargoWeightKg: 5200,
            CargoVolumeCbm: 24,
            CargoValueUsd: 210000,
            SlaDeadlineDays: 20,
            ActiveDisruptions: ["uswc-port-strike"]);

        var response = await _client.PostAsJsonAsync("/api/v1/corridors/reroute", req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var res = await response.Content.ReadFromJsonAsync<CorridorRerouteResponse>(JsonOpts);
        Assert.NotNull(res);

        var ocean = res.Options.Single(o => o.ModeId == "ocean-direct");
        var seaAir = res.Options.Single(o => o.ModeId == "sea-air-hybrid");

        Assert.Equal(9m, ocean.DisruptionDelayDays);
        Assert.Equal(1450m, ocean.DisruptionSurchargeUsd);
        Assert.False(ocean.SlaCompliant);
        Assert.Equal("SIN", seaAir.HubCode);
        Assert.True(seaAir.SlaCompliant);
        Assert.Equal("sea-air-hybrid", res.RecommendedMode);
    }

    [Fact]
    public async Task CorridorReroute_UltraUrgentFiveDaySemiconductorSla_RecommendsDirectAirFreight()
    {
        var req = new CorridorRerouteRequest(
            CorridorId: "vn-de-air",
            CargoWeightKg: 1200,
            CargoVolumeCbm: 6,
            CargoValueUsd: 350000,
            SlaDeadlineDays: 5,
            ActiveDisruptions: ["red-sea-suez", "cat-lai-congestion"]);

        var response = await _client.PostAsJsonAsync("/api/v1/corridors/reroute", req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var res = await response.Content.ReadFromJsonAsync<CorridorRerouteResponse>(JsonOpts);
        Assert.NotNull(res);
        Assert.Equal("direct-air", res.RecommendedMode);
        Assert.True(res.Options.Single(o => o.ModeId == "direct-air").SlaCompliant);
        Assert.False(res.Options.Single(o => o.ModeId == "sea-air-hybrid").SlaCompliant);
    }

    [Fact]
    public async Task CorridorReroute_NegativeCargoWeight_Returns400ValidationProblem()
    {
        var req = new CorridorRerouteRequest("vn-eu-sea", -100, 10, 50000, 20, []);
        var response = await _client.PostAsJsonAsync("/api/v1/corridors/reroute", req);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    /* ========================================================================
     * 6. INCOTERMS 2020 COST & RISK ALLOCATOR (/api/v1/incoterms/allocate)
     * ======================================================================== */

    [Fact]
    public async Task IncotermsAllocate_Exw_AssignsOnlyStage1ToSellerAndBuyerCoversRemaining7Stages()
    {
        var req = new IncotermsAllocateRequest("EXW", 120000m);
        var response = await _client.PostAsJsonAsync("/api/v1/incoterms/allocate", req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var res = await response.Content.ReadFromJsonAsync<IncotermsAllocateResponse>(JsonOpts);
        Assert.NotNull(res);
        Assert.Equal("EXW", res.Incoterm);
        Assert.Equal("E", res.GroupCode);
        Assert.Equal(1, res.RiskTransferStageIndex);
        Assert.Equal(1, res.CostTransferStageIndex);
        Assert.False(res.HasCostRiskSplit);
        Assert.False(res.InsuranceRequired);
        Assert.Equal(8, res.Stages.Count);
        Assert.Single(res.Stages, s => s.CostOwner == "seller");
        Assert.Equal(7, res.Stages.Count(s => s.CostOwner == "buyer"));
    }

    [Fact]
    public async Task IncotermsAllocate_Fca_CoversExportCustomsAndSupportsAnyTransportMode()
    {
        var req = new IncotermsAllocateRequest("FCA", 120000m);
        var response = await _client.PostAsJsonAsync("/api/v1/incoterms/allocate", req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var res = await response.Content.ReadFromJsonAsync<IncotermsAllocateResponse>(JsonOpts);
        Assert.NotNull(res);
        Assert.False(res.SeaOnly);
        Assert.Equal(3, res.RiskTransferStageIndex);
        Assert.Equal(3, res.Stages.Count(s => s.CostOwner == "seller"));
        Assert.Equal(3, res.Stages.Count(s => s.RiskOwner == "seller"));
    }

    [Fact]
    public async Task IncotermsAllocate_Fob_EnforcesSeaOnlyScopeAndTransfersRiskAtPortLoading()
    {
        var req = new IncotermsAllocateRequest("FOB", 120000m);
        var response = await _client.PostAsJsonAsync("/api/v1/incoterms/allocate", req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var res = await response.Content.ReadFromJsonAsync<IncotermsAllocateResponse>(JsonOpts);
        Assert.NotNull(res);
        Assert.True(res.SeaOnly);
        Assert.Equal(4, res.RiskTransferStageIndex);
        Assert.Equal(4, res.CostTransferStageIndex);
        Assert.False(res.HasCostRiskSplit);
        Assert.Equal("seller", res.Stages[3].CostOwner);
        Assert.Equal("buyer", res.Stages[4].CostOwner);
    }

    [Fact]
    public async Task IncotermsAllocate_Cfr_DetectsCostRiskSplitPointWithoutMandatoryInsurance()
    {
        var req = new IncotermsAllocateRequest("CFR", 120000m);
        var response = await _client.PostAsJsonAsync("/api/v1/incoterms/allocate", req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var res = await response.Content.ReadFromJsonAsync<IncotermsAllocateResponse>(JsonOpts);
        Assert.NotNull(res);
        Assert.Equal("C", res.GroupCode);
        Assert.True(res.HasCostRiskSplit);
        Assert.Equal(4, res.RiskTransferStageIndex);
        Assert.Equal(5, res.CostTransferStageIndex);
        Assert.False(res.InsuranceRequired);
        Assert.Equal("seller", res.Stages[4].CostOwner);
        Assert.Equal("buyer", res.Stages[4].RiskOwner);
    }

    [Fact]
    public async Task IncotermsAllocate_Cif_RequiresMandatoryInsuranceAndSplitsRiskAtStage4CostAtStage6()
    {
        var req = new IncotermsAllocateRequest("CIF", 120000m);
        var response = await _client.PostAsJsonAsync("/api/v1/incoterms/allocate", req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var res = await response.Content.ReadFromJsonAsync<IncotermsAllocateResponse>(JsonOpts);
        Assert.NotNull(res);
        Assert.True(res.HasCostRiskSplit);
        Assert.True(res.InsuranceRequired);
        Assert.Equal(4, res.RiskTransferStageIndex);
        Assert.Equal(6, res.CostTransferStageIndex);
        Assert.Contains("ICC (C)", res.InsuranceCoverageStandard);
        Assert.Equal("seller", res.Stages[5].CostOwner);
        Assert.Equal("buyer", res.Stages[5].RiskOwner);
    }

    [Fact]
    public async Task IncotermsAllocate_Dap_LeavesImportCustomsAndDutyWithBuyerWhileSellerDeliversToWarehouse()
    {
        var req = new IncotermsAllocateRequest("DAP", 120000m, ImportDutyRatePct: 10m);
        var response = await _client.PostAsJsonAsync("/api/v1/incoterms/allocate", req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var res = await response.Content.ReadFromJsonAsync<IncotermsAllocateResponse>(JsonOpts);
        Assert.NotNull(res);
        Assert.Equal("buyer", res.Stages[6].CostOwner);
        Assert.Equal("buyer", res.Stages[6].RiskOwner);
        Assert.Equal("seller", res.Stages[7].CostOwner);
        Assert.Equal("seller", res.Stages[7].RiskOwner);
        Assert.Equal(res.Stages[6].CostUsd, res.BuyerCostUsd);
    }

    [Fact]
    public async Task IncotermsAllocate_Ddp_Allocates100PercentToSellerWithZeroBuyerCost()
    {
        var req = new IncotermsAllocateRequest("DDP", 120000m);
        var response = await _client.PostAsJsonAsync("/api/v1/incoterms/allocate", req);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var res = await response.Content.ReadFromJsonAsync<IncotermsAllocateResponse>(JsonOpts);
        Assert.NotNull(res);
        Assert.Equal(100m, res.SellerSharePct);
        Assert.Equal(0m, res.BuyerSharePct);
        Assert.Equal(0m, res.BuyerCostUsd);
        Assert.Equal(res.TotalLogisticsCostUsd, res.SellerCostUsd);
        Assert.Equal(res.BuyerTotalOutlayUsd, res.SellerTotalContractUsd);
    }

    [Fact]
    public async Task IncotermsAllocate_AccountingInvariant_TotalLogisticsCostRemainsConstantAcrossAll7Rules()
    {
        string[] orderedTerms = ["EXW", "FCA", "FOB", "CFR", "CIF", "DAP", "DDP"];
        decimal? expectedTotal = null;
        decimal prevSeller = -1m;

        foreach (var term in orderedTerms)
        {
            var req = new IncotermsAllocateRequest(term, 100000m);
            var response = await _client.PostAsJsonAsync("/api/v1/incoterms/allocate", req);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var res = await response.Content.ReadFromJsonAsync<IncotermsAllocateResponse>(JsonOpts);
            Assert.NotNull(res);
            Assert.Equal(res.TotalLogisticsCostUsd, res.SellerCostUsd + res.BuyerCostUsd);
            Assert.Equal(100m, res.SellerSharePct + res.BuyerSharePct);
            Assert.True(res.SellerCostUsd > prevSeller);
            prevSeller = res.SellerCostUsd;

            expectedTotal ??= res.TotalLogisticsCostUsd;
            Assert.Equal(expectedTotal.Value, res.TotalLogisticsCostUsd);
        }
    }

    [Fact]
    public async Task IncotermsAllocate_InvalidTermOrNegativeCargoValue_Returns400ValidationProblem()
    {
        var badTermReq = new IncotermsAllocateRequest("INVALID", 50000m);
        var badTermResp = await _client.PostAsJsonAsync("/api/v1/incoterms/allocate", badTermReq);
        Assert.Equal(HttpStatusCode.BadRequest, badTermResp.StatusCode);

        var badValueReq = new IncotermsAllocateRequest("CIF", -100m);
        var badValueResp = await _client.PostAsJsonAsync("/api/v1/incoterms/allocate", badValueReq);
        Assert.Equal(HttpStatusCode.BadRequest, badValueResp.StatusCode);
    }

    /* ========================================================================
     * 7. GLOBAL PORT CONGESTION & CORRIDOR STATUS (/api/v1/corridors/ports)
     * ======================================================================== */

    [Fact]
    public async Task CorridorsPorts_NominalBaseline_ReturnsAll8GlobalPortsAnd4Corridors()
    {
        var response = await _client.GetAsync("/api/v1/corridors/ports");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var res = await response.Content.ReadFromJsonAsync<CorridorsPortsTelemetryResponse>(JsonOpts);
        Assert.NotNull(res);
        Assert.False(res.CapeRerouteActive);
        Assert.Empty(res.ActiveDisruptions);
        Assert.Equal(8, res.Ports.Count);
        Assert.Equal(4, res.Corridors.Count);
        Assert.Equal(0, res.TotalDailyTeuAtRisk);
        Assert.Contains(res.Ports, p => p.Code == "VNSGN");
        Assert.Contains(res.Ports, p => p.Code == "SGSIN");
        Assert.Contains(res.Ports, p => p.Code == "AEDXB");
        Assert.Contains(res.Ports, p => p.Code == "EGSUZ");
        Assert.Contains(res.Ports, p => p.Code == "ZACPT");
        Assert.Contains(res.Ports, p => p.Code == "NLRTM");
        Assert.Contains(res.Ports, p => p.Code == "USLAX");
    }

    [Fact]
    public async Task CorridorsPorts_RedSeaDisruptionQuery_ActivatesCapeRerouteAndSpikesSuezAndCapeDwell()
    {
        var response = await _client.GetAsync("/api/v1/corridors/ports?disruptions=red-sea-suez");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var res = await response.Content.ReadFromJsonAsync<CorridorsPortsTelemetryResponse>(JsonOpts);
        Assert.NotNull(res);
        Assert.True(res.CapeRerouteActive);
        Assert.Contains("red-sea-suez", res.ActiveDisruptions);

        var suez = res.Ports.Single(p => p.Code == "EGSUZ");
        var cape = res.Ports.Single(p => p.Code == "ZACPT");
        var euCorridor = res.Corridors.Single(c => c.CorridorId == "vn-eu-sea");

        Assert.Equal("critical", suez.Status);
        Assert.Equal(suez.BaseDwellHours + 288, suez.EffectiveDwellHours);
        Assert.True(cape.DisruptionDeltaHours > 0);
        Assert.True(euCorridor.CapeRerouteActive);
        Assert.Equal("rerouted-cape", euCorridor.Status);
        Assert.Equal(40m, euCorridor.EffectiveOceanDays);
    }

    [Fact]
    public async Task CorridorsPorts_CatLaiAndUswcDisruptions_SpikesVnsgnAndUslaxDwellAndTeuAtRisk()
    {
        var response = await _client.GetAsync("/api/v1/corridors/ports?disruptions=cat-lai-congestion,uswc-port-strike");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var res = await response.Content.ReadFromJsonAsync<CorridorsPortsTelemetryResponse>(JsonOpts);
        Assert.NotNull(res);
        Assert.Equal(2, res.ActiveDisruptions.Count);
        Assert.True(res.TotalDailyTeuAtRisk > 150000);

        var catLai = res.Ports.Single(p => p.Code == "VNSGN");
        var lax = res.Ports.Single(p => p.Code == "USLAX");
        var usCorridor = res.Corridors.Single(c => c.CorridorId == "vn-us-sea");

        Assert.Equal("critical", catLai.Status);
        Assert.Equal(catLai.BaseDwellHours + 96, catLai.EffectiveDwellHours);
        Assert.Equal("critical", lax.Status);
        Assert.Equal(lax.BaseDwellHours + 216, lax.EffectiveDwellHours);
        Assert.Equal(33m, usCorridor.EffectiveOceanDays); // 20 base + 9 USWC + 4 Cat Lai
    }
}
