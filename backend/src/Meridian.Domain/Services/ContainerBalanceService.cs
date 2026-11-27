using Meridian.Domain.Data;
using Meridian.Domain.Models;

namespace Meridian.Domain.Services;

public interface IContainerBalanceService
{
    ContainerBalanceResponse AuditContainerLoad(ContainerBalanceRequest request);
}

public sealed class ContainerBalanceService : IContainerBalanceService
{
    private sealed class ActiveColumn
    {
        public int X { get; init; }
        public int Y { get; init; }
        public int ZTop { get; set; }
        public int TopL { get; set; }
        public int TopW { get; set; }
        public string TopSkuCode { get; set; } = string.Empty;
        public bool TopStackable { get; set; }
    }

    private sealed class ActiveBay
    {
        public int XStart { get; init; }
        public int BayLength { get; init; }
        public int YUsed { get; set; }
        public string SkuHint { get; init; } = string.Empty;
        public List<ActiveColumn> Columns { get; } = [];
    }

    private sealed class WorkingContainer
    {
        public int Index { get; init; }
        public int NextX { get; set; }
        public int CartonCount { get; set; }
        public decimal UsedWeightKg { get; set; }
        public decimal UsedVolumeCm3 { get; set; }
        public decimal MomentXKgCm { get; set; }
        public decimal MomentYKgCm { get; set; }
        public decimal MomentZKgCm { get; set; }
        public List<ActiveBay> Bays { get; } = [];
    }

    public ContainerBalanceResponse AuditContainerLoad(ContainerBalanceRequest request)
    {
        if (!MeridianCatalog.Containers.TryGetValue(request.ContainerType, out var container))
        {
            throw new ArgumentException($"Unknown containerType '{request.ContainerType}'.", nameof(request));
        }

        // Strict single-container SOLAS audit detects declared total weight exceeding CSC maxPayloadKg directly
        var totalRequestedCartons = request.Skus.Sum(s => s.Qty);
        var totalDeclaredWeightKg = Round2(request.Skus.Sum(s => s.WeightKg * s.Qty));

        if (request.StrictSingleContainer && totalDeclaredWeightKg > container.MaxPayloadKg)
        {
            var totalDeclaredVolCbm = Round3(
                request.Skus.Sum(s => (decimal)s.LengthCm * s.WidthCm * s.HeightCm * s.Qty) / 1_000_000m);
            var vgmGross = Round2(container.TareWeightKg + totalDeclaredWeightKg);
            var maxGross = Round2(container.TareWeightKg + container.MaxPayloadKg);
            var payloadPct = Round1(totalDeclaredWeightKg / container.MaxPayloadKg * 100m);
            var volPct = Math.Min(100m, Round1(totalDeclaredVolCbm / container.InternalVolumeCbm * 100m));
            var violations = new List<string> { "OVERWEIGHT_PAYLOAD" };

            var rejectedBay = new ContainerBayAudit(
                Index: 0,
                CartonCount: totalRequestedCartons,
                UsedVolumeCbm: totalDeclaredVolCbm,
                VolumeUtilizationPct: volPct,
                UsedWeightKg: totalDeclaredWeightKg,
                PayloadUtilizationPct: payloadPct,
                CgXPct: 50m,
                CgYPct: 50m,
                CgZPct: 45m,
                FrontAxleSharePct: 50m,
                RearAxleSharePct: 50m,
                LeftSideSharePct: 50m,
                RightSideSharePct: 50m,
                VgmGrossKg: vgmGross,
                MaxGrossSolasKg: maxGross,
                SolasVgmCompliant: false,
                SolasViolations: violations);

            return new ContainerBalanceResponse(
                ContainerType: container.Id,
                ContainerCode: container.Code,
                Status: "REJECTED_SOLAS_VGM",
                ContainersRequired: 1,
                TotalRequestedCartons: totalRequestedCartons,
                TotalLoadedCartons: 0,
                UnfitCartons: totalRequestedCartons,
                TotalCargoVolumeCbm: totalDeclaredVolCbm,
                TotalCargoWeightKg: totalDeclaredWeightKg,
                VolumeUtilizationPct: volPct,
                PayloadUtilizationPct: payloadPct,
                LimitingFactor: "payload",
                CgXPct: 50m,
                CgYPct: 50m,
                CgZPct: 45m,
                FrontAxleSharePct: 50m,
                RearAxleSharePct: 50m,
                VgmGrossKg: vgmGross,
                MaxGrossSolasKg: maxGross,
                BalanceStatus: "overweight",
                SolasVgmCompliant: false,
                SolasViolations: violations,
                Bays: [rejectedBay]);
        }

        // Order stackable heavier/larger bases first so fragile top-only cartons crown columns
        var orderedSkus = request.Skus
            .OrderByDescending(s => s.Stackable)
            .ThenByDescending(s => (long)s.LengthCm * s.WidthCm * s.HeightCm)
            .ThenByDescending(s => s.WeightKg)
            .ToList();

        var working = new List<WorkingContainer>();
        var unfitCartons = 0;

        foreach (var sku in orderedSkus)
        {
            if (sku.Qty <= 0) continue;

            if (!CanEverFit(container, sku))
            {
                unfitCartons += sku.Qty;
                continue;
            }

            for (var i = 0; i < sku.Qty; i++)
            {
                var placed = false;
                foreach (var wc in working)
                {
                    if (TryPlace(wc, container, sku))
                    {
                        placed = true;
                        break;
                    }
                }

                if (!placed)
                {
                    if (request.StrictSingleContainer && working.Count >= 1)
                    {
                        unfitCartons++;
                        continue;
                    }

                    var next = new WorkingContainer { Index = working.Count };
                    working.Add(next);
                    if (TryPlace(next, container, sku))
                    {
                        placed = true;
                    }
                }

                if (!placed)
                {
                    unfitCartons++;
                }
            }
        }

        if (working.Count == 0)
        {
            working.Add(new WorkingContainer { Index = 0 });
        }

        var internalCm3 = (decimal)container.InnerLengthCm * container.InnerWidthCm * container.InnerHeightCm;
        var maxGrossSolas = Round2(container.TareWeightKg + container.MaxPayloadKg);

        var bayAudits = working.Select((wc, idx) =>
        {
            var usedVolCbm = Round3(wc.UsedVolumeCm3 / 1_000_000m);
            var usedWeight = Round2(wc.UsedWeightKg);
            var volPct = Math.Min(100m, Round1(wc.UsedVolumeCm3 / internalCm3 * 100m));
            var payPct = Math.Min(100m, Round1(usedWeight / container.MaxPayloadKg * 100m));

            var cgX = usedWeight > 0m ? Round1(wc.MomentXKgCm / (usedWeight * container.InnerLengthCm) * 100m) : 50m;
            var cgY = usedWeight > 0m ? Round1(wc.MomentYKgCm / (usedWeight * container.InnerWidthCm) * 100m) : 50m;
            var cgZ = usedWeight > 0m ? Round1(wc.MomentZKgCm / (usedWeight * container.InnerHeightCm) * 100m) : 0m;

            var rearAxle = usedWeight > 0m ? cgX : 50m;
            var frontAxle = Round1(100m - rearAxle);
            var rightSide = usedWeight > 0m ? cgY : 50m;
            var leftSide = Round1(100m - rightSide);

            var vgmGross = Round2(container.TareWeightKg + usedWeight);
            var violations = EvaluateViolations(container, usedWeight, cgX, cgY, cgZ, wc.CartonCount, idx == 0 ? unfitCartons : 0);

            return new ContainerBayAudit(
                Index: wc.Index,
                CartonCount: wc.CartonCount,
                UsedVolumeCbm: usedVolCbm,
                VolumeUtilizationPct: volPct,
                UsedWeightKg: usedWeight,
                PayloadUtilizationPct: payPct,
                CgXPct: cgX,
                CgYPct: cgY,
                CgZPct: cgZ,
                FrontAxleSharePct: frontAxle,
                RearAxleSharePct: rearAxle,
                LeftSideSharePct: leftSide,
                RightSideSharePct: rightSide,
                VgmGrossKg: vgmGross,
                MaxGrossSolasKg: maxGrossSolas,
                SolasVgmCompliant: violations.Count == 0,
                SolasViolations: violations);
        }).ToList();

        var totalLoaded = bayAudits.Sum(b => b.CartonCount);
        var totalVolCbm = Round3(bayAudits.Sum(b => b.UsedVolumeCbm));
        var totalWeightKg = Round2(bayAudits.Sum(b => b.UsedWeightKg));
        var activeCount = totalLoaded > 0 ? bayAudits.Count : 1;

        var aggVolPct = Math.Min(100m, Round1(totalVolCbm / (activeCount * container.InternalVolumeCbm) * 100m));
        var aggPayPct = Math.Min(100m, Round1(totalWeightKg / (activeCount * container.MaxPayloadKg) * 100m));

        var limitingFactor = unfitCartons > 0 && totalLoaded == 0
            ? "dimensions"
            : aggPayPct > aggVolPct ? "payload" : "volume";

        var firstBay = bayAudits[0];
        var balanceStatus = "balanced";
        if (totalLoaded > 0)
        {
            if (firstBay.CgXPct < 36m) balanceStatus = "nose-heavy";
            else if (firstBay.CgXPct > 64m) balanceStatus = "tail-heavy";
        }

        var allViolations = bayAudits
            .SelectMany(b => b.SolasViolations)
            .Distinct()
            .ToList();
        var allCompliant = unfitCartons == 0 && bayAudits.All(b => b.SolasVgmCompliant);

        return new ContainerBalanceResponse(
            ContainerType: container.Id,
            ContainerCode: container.Code,
            Status: allCompliant ? "APPROVED_SOLAS_VGM" : "REJECTED_SOLAS_VGM",
            ContainersRequired: totalLoaded > 0 ? bayAudits.Count : 0,
            TotalRequestedCartons: totalRequestedCartons,
            TotalLoadedCartons: totalLoaded,
            UnfitCartons: unfitCartons,
            TotalCargoVolumeCbm: totalVolCbm,
            TotalCargoWeightKg: totalWeightKg,
            VolumeUtilizationPct: aggVolPct,
            PayloadUtilizationPct: aggPayPct,
            LimitingFactor: limitingFactor,
            CgXPct: firstBay.CgXPct,
            CgYPct: firstBay.CgYPct,
            CgZPct: firstBay.CgZPct,
            FrontAxleSharePct: firstBay.FrontAxleSharePct,
            RearAxleSharePct: firstBay.RearAxleSharePct,
            VgmGrossKg: firstBay.VgmGrossKg,
            MaxGrossSolasKg: maxGrossSolas,
            BalanceStatus: balanceStatus,
            SolasVgmCompliant: allCompliant,
            SolasViolations: allViolations,
            Bays: bayAudits);
    }

    private static List<string> EvaluateViolations(
        ContainerSpec container,
        decimal usedWeightKg,
        decimal cgX,
        decimal cgY,
        decimal cgZ,
        int cartonCount,
        int unfitCartons)
    {
        var list = new List<string>();
        if (usedWeightKg > container.MaxPayloadKg)
            list.Add("OVERWEIGHT_PAYLOAD");
        if (unfitCartons > 0)
            list.Add("OVERSIZE_CARGO");
        if (cartonCount > 0)
        {
            if (cgX is < 36m or > 64m) list.Add("LONGITUDINAL_IMBALANCE");
            if (cgY is < 38m or > 62m) list.Add("LATERAL_IMBALANCE");
            if (cgZ > 58m) list.Add("HIGH_VERTICAL_CG");
        }
        return list;
    }

    private static bool CanEverFit(ContainerSpec container, CargoSkuRequest sku)
    {
        if (sku.HeightCm > container.InnerHeightCm) return false;
        if (sku.WeightKg > container.MaxPayloadKg) return false;
        var fitsA = sku.LengthCm <= container.InnerLengthCm && sku.WidthCm <= container.InnerWidthCm;
        var fitsB = sku.WidthCm <= container.InnerLengthCm && sku.LengthCm <= container.InnerWidthCm;
        return fitsA || fitsB;
    }

    private static List<(int L, int W)> ValidOrientations(int l, int w, int maxL, int maxW)
    {
        var list = new List<(int, int)>(2);
        if (l <= maxL && w <= maxW) list.Add((l, w));
        if (w != l && w <= maxL && l <= maxW) list.Add((w, l));
        return list;
    }

    private static bool TryPlace(WorkingContainer wc, ContainerSpec container, CargoSkuRequest sku)
    {
        if (wc.UsedWeightKg + sku.WeightKg > container.MaxPayloadKg)
        {
            return false;
        }

        // 1. Stack onto an existing stackable column
        ActiveColumn? bestCol = null;
        int bestColL = 0, bestColW = 0;
        long bestColScore = long.MaxValue;

        foreach (var bay in wc.Bays)
        {
            foreach (var col in bay.Columns)
            {
                if (!col.TopStackable || col.ZTop + sku.HeightCm > container.InnerHeightCm) continue;
                foreach (var (ol, ow) in ValidOrientations(sku.LengthCm, sku.WidthCm, col.TopL, col.TopW))
                {
                    var waste = (long)col.TopL * col.TopW - (long)ol * ow;
                    var sameBonus = col.TopSkuCode == sku.SkuCode ? -1_000_000L : 0L;
                    var score = sameBonus + waste + col.X * 2L;
                    if (score < bestColScore)
                    {
                        bestColScore = score;
                        bestCol = col;
                        bestColL = ol;
                        bestColW = ow;
                    }
                }
            }
        }

        if (bestCol is not null)
        {
            var z = bestCol.ZTop;
            bestCol.ZTop += sku.HeightCm;
            bestCol.TopL = bestColL;
            bestCol.TopW = bestColW;
            bestCol.TopSkuCode = sku.SkuCode;
            bestCol.TopStackable = sku.Stackable;
            RecordBox(wc, sku, bestCol.X, bestCol.Y, z, bestColL, bestColW, sku.HeightCm);
            return true;
        }

        // 2. Place a new floor column inside an existing transverse bay
        ActiveBay? bestBay = null;
        int bestBayL = 0, bestBayW = 0;
        long bestBayScore = long.MaxValue;

        foreach (var bay in wc.Bays)
        {
            var remW = container.InnerWidthCm - bay.YUsed;
            foreach (var (ol, ow) in ValidOrientations(sku.LengthCm, sku.WidthCm, bay.BayLength, remW))
            {
                var lengthWaste = bay.BayLength - ol;
                var sameBonus = bay.SkuHint == sku.SkuCode ? -500_000L : 0L;
                var score = sameBonus + lengthWaste * 100L + bay.XStart;
                if (score < bestBayScore)
                {
                    bestBayScore = score;
                    bestBay = bay;
                    bestBayL = ol;
                    bestBayW = ow;
                }
            }
        }

        if (bestBay is not null)
        {
            var col = new ActiveColumn
            {
                X = bestBay.XStart,
                Y = bestBay.YUsed,
                ZTop = sku.HeightCm,
                TopL = bestBayL,
                TopW = bestBayW,
                TopSkuCode = sku.SkuCode,
                TopStackable = sku.Stackable
            };
            bestBay.YUsed += bestBayW;
            bestBay.Columns.Add(col);
            RecordBox(wc, sku, col.X, col.Y, 0, bestBayL, bestBayW, sku.HeightCm);
            return true;
        }

        // 3. Open a new transverse bay along container length X
        var remL = container.InnerLengthCm - wc.NextX;
        var orients = ValidOrientations(sku.LengthCm, sku.WidthCm, remL, container.InnerWidthCm);
        if (orients.Count == 0) return false;

        orients.Sort((a, b) =>
        {
            var effA = (decimal)(container.InnerWidthCm / a.W * a.W) / container.InnerWidthCm;
            var effB = (decimal)(container.InnerWidthCm / b.W * b.W) / container.InnerWidthCm;
            if (Math.Abs(effB - effA) > 0.02m) return effB.CompareTo(effA);
            return a.L.CompareTo(b.L);
        });

        var chosen = orients[0];
        var newBay = new ActiveBay
        {
            XStart = wc.NextX,
            BayLength = chosen.L,
            YUsed = chosen.W,
            SkuHint = sku.SkuCode
        };
        newBay.Columns.Add(new ActiveColumn
        {
            X = wc.NextX,
            Y = 0,
            ZTop = sku.HeightCm,
            TopL = chosen.L,
            TopW = chosen.W,
            TopSkuCode = sku.SkuCode,
            TopStackable = sku.Stackable
        });
        wc.NextX += chosen.L;
        wc.Bays.Add(newBay);
        RecordBox(wc, sku, newBay.XStart, 0, 0, chosen.L, chosen.W, sku.HeightCm);
        return true;
    }

    private static void RecordBox(WorkingContainer wc, CargoSkuRequest sku, int x, int y, int z, int l, int w, int h)
    {
        wc.CartonCount++;
        wc.UsedWeightKg += sku.WeightKg;
        wc.UsedVolumeCm3 += (decimal)l * w * h;
        wc.MomentXKgCm += (x + l / 2m) * sku.WeightKg;
        wc.MomentYKgCm += (y + w / 2m) * sku.WeightKg;
        wc.MomentZKgCm += (z + h / 2m) * sku.WeightKg;
    }

    private static decimal Round1(decimal value) => Math.Round(value, 1, MidpointRounding.AwayFromZero);
    private static decimal Round2(decimal value) => Math.Round(value, 2, MidpointRounding.AwayFromZero);
    private static decimal Round3(decimal value) => Math.Round(value, 3, MidpointRounding.AwayFromZero);
}
