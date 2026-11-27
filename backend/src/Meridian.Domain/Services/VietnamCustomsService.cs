using Meridian.Domain.Data;
using Meridian.Domain.Models;

namespace Meridian.Domain.Services;

public interface IVietnamCustomsService
{
    CustomsLandedCostResponse CalculateLandedCost(CustomsLandedCostRequest request);
}

public sealed class VietnamCustomsService : IVietnamCustomsService
{
    private static readonly string[] Regimes = ["MFN", "EVFTA", "CPTPP", "ACFTA"];

    public CustomsLandedCostResponse CalculateLandedCost(CustomsLandedCostRequest request)
    {
        if (!MeridianCatalog.HsPresets.TryGetValue(request.PresetId, out var preset))
        {
            throw new ArgumentException($"Unknown Vietnam HS presetId '{request.PresetId}'.", nameof(request));
        }

        var regime = request.Regime.Trim().ToUpperInvariant();
        if (!Regimes.Contains(regime))
        {
            throw new ArgumentException($"Unsupported FTA regime '{request.Regime}'. Supported: MFN, EVFTA, CPTPP, ACFTA.", nameof(request));
        }

        if (request.VatRatePct is not (8 or 10))
        {
            throw new ArgumentException("Vietnam import VAT rate must be 8% (relief decree) or 10% (standard).", nameof(request));
        }

        var fobUsd = Round2(request.FobValueUsd);
        var freightUsd = Round2(request.FreightUsd);
        var insuranceUsd = Round2(request.InsuranceUsd);
        var localFeesUsd = Round2(request.LocalClearanceFeesUsd);
        var sctRatePct = Round2(Math.Clamp(request.SctRatePct, 0m, 150m));
        var cifUsd = Round2(fobUsd + freightUsd + insuranceUsd);
        var cifVnd = ToVnd(cifUsd);

        var rawRows = Regimes.Select(r =>
        {
            var dutyRatePct = GetDutyRate(preset, r);
            var importDutyUsd = Round2(cifUsd * (dutyRatePct / 100m));
            var sctUsd = Round2((cifUsd + importDutyUsd) * (sctRatePct / 100m));
            var vatUsd = Round2((cifUsd + importDutyUsd + sctUsd) * (request.VatRatePct / 100m));
            var totalTaxesUsd = Round2(importDutyUsd + sctUsd + vatUsd);
            var totalLandedUsd = Round2(cifUsd + totalTaxesUsd + localFeesUsd);
            var totalLandedVnd = ToVnd(totalLandedUsd);
            var landedPerUnitUsd = Round2(totalLandedUsd / request.UnitQuantity);
            return (
                Regime: r,
                DutyRatePct: dutyRatePct,
                ImportDutyUsd: importDutyUsd,
                SctUsd: sctUsd,
                VatUsd: vatUsd,
                TotalTaxesUsd: totalTaxesUsd,
                TotalLandedUsd: totalLandedUsd,
                TotalLandedVnd: totalLandedVnd,
                LandedPerUnitUsd: landedPerUnitUsd
            );
        }).ToList();

        var mfnLandedUsd = rawRows[0].TotalLandedUsd;

        var comparisons = rawRows.Select(row =>
        {
            var savingsUsd = Round2(Math.Max(0m, mfnLandedUsd - row.TotalLandedUsd));
            return new FtaRegimeComparison(
                Regime: row.Regime,
                CertificateLabel: MeridianCatalog.FtaCertificates[row.Regime],
                DutyRatePct: row.DutyRatePct,
                ImportDutyUsd: row.ImportDutyUsd,
                SctUsd: row.SctUsd,
                VatUsd: row.VatUsd,
                TotalTaxesUsd: row.TotalTaxesUsd,
                TotalLandedCostUsd: row.TotalLandedUsd,
                TotalLandedCostVnd: row.TotalLandedVnd,
                LandedCostPerUnitUsd: row.LandedPerUnitUsd,
                SavingsVsMfnUsd: savingsUsd,
                SavingsVsMfnVnd: ToVnd(savingsUsd));
        }).ToList();

        var selected = comparisons.First(c => c.Regime == regime);
        var best = comparisons.OrderBy(c => c.TotalLandedCostUsd).First();
        var effectiveTaxBurdenPct = cifUsd > 0m ? Round2(selected.TotalTaxesUsd / cifUsd * 100m) : 0m;
        var landedPerUnitVnd = (long)Math.Round((decimal)selected.TotalLandedCostVnd / request.UnitQuantity, MidpointRounding.AwayFromZero);

        var hsCode = string.IsNullOrWhiteSpace(request.CustomHsCode)
            ? preset.HsCode
            : request.CustomHsCode.Trim();

        return new CustomsLandedCostResponse(
            PresetId: preset.Id,
            HsCode: hsCode,
            Category: preset.Category,
            Regime: selected.Regime,
            UnitQuantity: request.UnitQuantity,
            FobValueUsd: fobUsd,
            FreightUsd: freightUsd,
            InsuranceUsd: insuranceUsd,
            CifValueUsd: cifUsd,
            CifValueVnd: cifVnd,
            AppliedDutyRatePct: selected.DutyRatePct,
            SctRatePct: sctRatePct,
            VatRatePct: request.VatRatePct,
            ImportDutyUsd: selected.ImportDutyUsd,
            SctUsd: selected.SctUsd,
            VatUsd: selected.VatUsd,
            TotalTaxesUsd: selected.TotalTaxesUsd,
            LocalClearanceFeesUsd: localFeesUsd,
            TotalLandedCostUsd: selected.TotalLandedCostUsd,
            TotalLandedCostVnd: selected.TotalLandedCostVnd,
            LandedCostPerUnitUsd: selected.LandedCostPerUnitUsd,
            LandedCostPerUnitVnd: landedPerUnitVnd,
            EffectiveTaxBurdenPct: effectiveTaxBurdenPct,
            SavingsVsMfnUsd: selected.SavingsVsMfnUsd,
            SavingsVsMfnVnd: selected.SavingsVsMfnVnd,
            BestRegime: best.Regime,
            Comparisons: comparisons);
    }

    private static decimal GetDutyRate(HsTariffSpec preset, string regime) =>
        regime switch
        {
            "MFN" => preset.MfnRatePct,
            "EVFTA" => preset.EvftaRatePct,
            "CPTPP" => preset.CptppRatePct,
            "ACFTA" => preset.AcftaRatePct,
            _ => preset.MfnRatePct
        };

    private static decimal Round2(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);
    private static long ToVnd(decimal usd) => (long)Math.Round(usd * MeridianCatalog.FxUsdToVnd, MidpointRounding.AwayFromZero);
}
