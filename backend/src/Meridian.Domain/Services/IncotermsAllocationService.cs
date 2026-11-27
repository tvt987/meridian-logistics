using Meridian.Domain.Data;
using Meridian.Domain.Models;

namespace Meridian.Domain.Services;

public interface IIncotermsAllocationService
{
    IncotermsAllocateResponse Allocate(IncotermsAllocateRequest request);
}

public sealed class IncotermsAllocationService : IIncotermsAllocationService
{
    private sealed record StageDef(int Index, string Id, string Label);

    private sealed record RuleDef(
        string Code,
        string FullName,
        string GroupCode,
        bool SeaOnly,
        HashSet<int> SellerCostStages,
        HashSet<int> SellerRiskStages,
        int RiskTransferStageIndex,
        int CostTransferStageIndex,
        bool InsuranceRequired,
        string InsuranceCoverageStandard,
        string[] ComplianceWarnings);

    private static readonly StageDef[] StageDefs =
    [
        new(1, "factory-gate", "Factory Gate & Export Packaging"),
        new(2, "origin-inland", "Origin Inland Haulage"),
        new(3, "export-customs", "Export Customs & VNACCS"),
        new(4, "port-loading", "Origin THC & Vessel Loading"),
        new(5, "main-freight", "Main Ocean / Air Freight"),
        new(6, "marine-insurance", "Marine / Cargo Insurance"),
        new(7, "import-customs", "Import Customs & EVFTA/MFN Duty"),
        new(8, "buyer-warehouse", "Destination Drayage & Buyer Warehouse")
    ];

    private static readonly IReadOnlyDictionary<string, RuleDef> Rules =
        new Dictionary<string, RuleDef>(StringComparer.OrdinalIgnoreCase)
        {
            ["EXW"] = new(
                "EXW", "Ex Works (Named Factory)", "E", false,
                [1], [1], 1, 1, false,
                "Buyer optional — full transit exposure from factory dock",
                [
                    "Foreign buyers often lack a local Vietnam tax ID to file VNACCS export customs under EXW.",
                    "ICC 2020 recommends FCA over EXW for cross-border containerized trade."
                ]),

            ["FCA"] = new(
                "FCA", "Free Carrier (Named CY / Hub)", "F", false,
                [1, 2, 3], [1, 2, 3], 3, 3, false,
                "Buyer arranges main-leg marine / air insurance",
                [
                    "Optimal ICC 2020 rule for containerized FCL/LCL & Air Freight handed over at inland CY or CFS.",
                    "Buyer controls ocean/air carrier contract & freight rate negotiation."
                ]),

            ["FOB"] = new(
                "FOB", "Free On Board (Port of Shipment)", "F", true,
                [1, 2, 3, 4], [1, 2, 3, 4], 4, 4, false,
                "Buyer insures ocean leg from vessel rail onward",
                [
                    "Strictly sea & inland waterway transport only — never apply FOB to air cargo.",
                    "Containerized cargo sits at terminal CY before loading; risk ambiguity exists between gate-in and onboard."
                ]),

            ["CFR"] = new(
                "CFR", "Cost and Freight (Port of Destination)", "C", true,
                [1, 2, 3, 4, 5], [1, 2, 3, 4], 4, 5, false,
                "CRITICAL GAP: Seller pays freight, but Buyer bears ocean risk — Buyer must buy insurance",
                [
                    "COST / RISK SPLIT POINT: Risk passes to Buyer at Origin Port Loading (Stage 4) while Seller pays Main Freight (Stage 5).",
                    "Marine insurance is NOT included — Buyer faces uninsured ocean loss unless covered separately."
                ]),

            ["CIF"] = new(
                "CIF", "Cost, Insurance & Freight", "C", true,
                [1, 2, 3, 4, 5, 6], [1, 2, 3, 4], 4, 6, true,
                "Mandatory Seller Insurance — ICC (C) Institute Cargo Clauses min. 110% invoice value",
                [
                    "COST / RISK SPLIT POINT: Risk transfers at Origin Port Loading (Stage 4) even though Seller pays Freight + Insurance (Stages 5-6).",
                    "Minimum CIF cover is ICC (C) named perils only — upgrade contract to ICC (A) All-Risk for high-value electronics."
                ]),

            ["DAP"] = new(
                "DAP", "Delivered At Place (Buyer Facility)", "D", false,
                [1, 2, 3, 4, 5, 6, 8], [1, 2, 3, 4, 5, 6, 8], 8, 8, false,
                "Seller bears transit risk to Buyer door (insurance strongly advised for Seller)",
                [
                    "Buyer remains legally responsible for Stage 7 Import Customs clearance & EVFTA/MFN duties.",
                    "Delayed Buyer customs clearance at destination port can trigger demurrage charged back to Buyer."
                ]),

            ["DDP"] = new(
                "DDP", "Delivered Duty Paid (Turnkey Door)", "D", false,
                [1, 2, 3, 4, 5, 6, 7, 8], [1, 2, 3, 4, 5, 6, 7, 8], 8, 8, false,
                "Maximum Seller liability across all 8 stages including import duties & final drayage",
                [
                    "MAXIMUM SELLER EXPOSURE: Seller must act as Importer of Record (IOR) and pay destination VAT/Import Duties.",
                    "Verify EU EORI / US Customs Bond registration before signing DDP."
                ])
        };

    public static bool IsSupportedIncoterm(string? code) =>
        !string.IsNullOrWhiteSpace(code) && Rules.ContainsKey(code.Trim());

    public IncotermsAllocateResponse Allocate(IncotermsAllocateRequest request)
    {
        var key = request.Incoterm?.Trim().ToUpperInvariant() ?? string.Empty;
        if (!Rules.TryGetValue(key, out var rule))
        {
            throw new ArgumentException(
                $"Unsupported Incoterm '{request.Incoterm}'. Must be one of EXW, FCA, FOB, CFR, CIF, DAP, DDP.",
                nameof(request));
        }

        var cargoValue = Round2(request.CargoValueUsd);
        var originInland = Round2(request.OriginInlandUsd);
        var exportCustoms = Round2(request.ExportCustomsUsd);
        var originThc = Round2(request.OriginThcUsd);
        var mainFreight = Round2(request.MainFreightUsd);
        var insuranceRatePct = request.InsuranceRatePct;
        var importDutyRatePct = request.ImportDutyRatePct;
        var importCustoms = Round2(request.ImportCustomsUsd);
        var destinationDrayage = Round2(request.DestinationDrayageUsd);

        var factoryPackaging = Round2(Math.Max(160m, cargoValue * 0.0035m));
        var marineInsurance = Round2(Math.Max(45m, (cargoValue + mainFreight) * 1.10m * (insuranceRatePct / 100m)));
        var cifBase = cargoValue + mainFreight + marineInsurance;
        var importDutyAndClearance = Round2(importCustoms + cifBase * (importDutyRatePct / 100m));

        var stageCosts = new decimal[]
        {
            factoryPackaging,
            originInland,
            exportCustoms,
            originThc,
            mainFreight,
            marineInsurance,
            importDutyAndClearance,
            destinationDrayage
        };

        var stages = new List<IncotermStageAllocationDto>(8);
        decimal sellerSum = 0m;
        decimal buyerSum = 0m;

        for (var i = 0; i < StageDefs.Length; i++)
        {
            var def = StageDefs[i];
            var cost = stageCosts[i];
            var costOwner = rule.SellerCostStages.Contains(def.Index) ? "seller" : "buyer";
            var riskOwner = rule.SellerRiskStages.Contains(def.Index) ? "seller" : "buyer";

            if (costOwner == "seller")
                sellerSum += cost;
            else
                buyerSum += cost;

            stages.Add(new IncotermStageAllocationDto(
                Index: def.Index,
                Id: def.Id,
                Label: def.Label,
                CostOwner: costOwner,
                RiskOwner: riskOwner,
                CostUsd: cost,
                CostVnd: ToVnd(cost)));
        }

        var sellerCostUsd = Round2(sellerSum);
        var buyerCostUsd = Round2(buyerSum);
        var totalLogisticsUsd = Round2(sellerCostUsd + buyerCostUsd);

        var sellerSharePct = totalLogisticsUsd > 0m
            ? Round1(sellerCostUsd / totalLogisticsUsd * 100m)
            : 0m;
        var buyerSharePct = Round1(Math.Max(0m, 100m - sellerSharePct));

        var riskStage = StageDefs[rule.RiskTransferStageIndex - 1];
        var costStage = StageDefs[rule.CostTransferStageIndex - 1];

        return new IncotermsAllocateResponse(
            Incoterm: rule.Code,
            FullName: rule.FullName,
            GroupCode: rule.GroupCode,
            SeaOnly: rule.SeaOnly,
            TransportScope: rule.SeaOnly
                ? "Sea & Inland Waterway Only"
                : "Any Mode (Ocean / Air / Road / Multimodal)",
            CargoValueUsd: cargoValue,
            TotalLogisticsCostUsd: totalLogisticsUsd,
            TotalLogisticsCostVnd: ToVnd(totalLogisticsUsd),
            SellerCostUsd: sellerCostUsd,
            SellerCostVnd: ToVnd(sellerCostUsd),
            BuyerCostUsd: buyerCostUsd,
            BuyerCostVnd: ToVnd(buyerCostUsd),
            SellerSharePct: sellerSharePct,
            BuyerSharePct: buyerSharePct,
            SellerTotalContractUsd: Round2(cargoValue + sellerCostUsd),
            BuyerTotalOutlayUsd: Round2(cargoValue + totalLogisticsUsd),
            RiskTransferStageIndex: rule.RiskTransferStageIndex,
            RiskTransferStage: riskStage.Label,
            CostTransferStageIndex: rule.CostTransferStageIndex,
            CostTransferStage: costStage.Label,
            HasCostRiskSplit: rule.RiskTransferStageIndex != rule.CostTransferStageIndex,
            InsuranceRequired: rule.InsuranceRequired,
            InsuranceCoverageStandard: rule.InsuranceCoverageStandard,
            ComplianceWarnings: rule.ComplianceWarnings,
            Stages: stages);
    }

    private static decimal Round1(decimal value) => Math.Round(value, 1, MidpointRounding.AwayFromZero);
    private static decimal Round2(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);
    private static long ToVnd(decimal usd) => (long)Math.Round(usd * MeridianCatalog.FxUsdToVnd, MidpointRounding.AwayFromZero);
}
