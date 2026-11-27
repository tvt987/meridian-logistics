using System.Text.Json;
using System.Text.Json.Serialization;
using Meridian.Domain.Data;
using Meridian.Domain.Models;
using Meridian.Domain.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddProblemDetails();
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});

// Register Clean Architecture Domain Engines
builder.Services.AddSingleton<IFreightQuoteService, FreightQuoteService>();
builder.Services.AddSingleton<IVietnamCustomsService, VietnamCustomsService>();
builder.Services.AddSingleton<IContainerBalanceService, ContainerBalanceService>();
builder.Services.AddSingleton<ICorridorRerouteService, CorridorRerouteService>();
builder.Services.AddSingleton<IIncotermsAllocationService, IncotermsAllocationService>();
builder.Services.AddSingleton<IPortCorridorTelemetryService, PortCorridorTelemetryService>();

var app = builder.Build();

app.UseExceptionHandler();
app.UseCors();

// Strict API Security Headers
app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    await next();
});

app.MapGet("/health", () => Results.Ok(new
{
    status = "healthy",
    service = "Meridian.Api",
    version = "4.0.0",
    runtime = $".NET {Environment.Version.Major}.{Environment.Version.Minor}",
    corridorsLoaded = MeridianCatalog.Corridors.Count,
    portsLoaded = MeridianCatalog.Ports.Count,
    hsPresetsLoaded = MeridianCatalog.HsPresets.Count,
    containerSpecsLoaded = MeridianCatalog.Containers.Count,
    incotermsSupported = 7,
    timestampUtc = DateTimeOffset.UtcNow
}));

var v1 = app.MapGroup("/api/v1");

v1.MapPost("/quotes/freight", (FreightQuoteRequest request, IFreightQuoteService service) =>
{
    var errors = ValidateFreightRequest(request);
    if (errors.Count > 0)
    {
        return Results.ValidationProblem(errors);
    }

    try
    {
        var result = service.CalculateQuote(request);
        return Results.Ok(result);
    }
    catch (ArgumentException ex)
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["request"] = [ex.Message]
        });
    }
});

v1.MapPost("/customs/landed-cost", (CustomsLandedCostRequest request, IVietnamCustomsService service) =>
{
    var errors = ValidateCustomsRequest(request);
    if (errors.Count > 0)
    {
        return Results.ValidationProblem(errors);
    }

    try
    {
        var result = service.CalculateLandedCost(request);
        return Results.Ok(result);
    }
    catch (ArgumentException ex)
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["request"] = [ex.Message]
        });
    }
});

v1.MapPost("/containers/balance-check", (ContainerBalanceRequest request, IContainerBalanceService service) =>
{
    var errors = ValidateContainerRequest(request);
    if (errors.Count > 0)
    {
        return Results.ValidationProblem(errors);
    }

    try
    {
        var result = service.AuditContainerLoad(request);
        return Results.Ok(result);
    }
    catch (ArgumentException ex)
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["request"] = [ex.Message]
        });
    }
});

v1.MapPost("/corridors/reroute", (CorridorRerouteRequest request, ICorridorRerouteService service) =>
{
    var errors = ValidateRerouteRequest(request);
    if (errors.Count > 0)
    {
        return Results.ValidationProblem(errors);
    }

    try
    {
        var result = service.SimulateReroute(request);
        return Results.Ok(result);
    }
    catch (ArgumentException ex)
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["request"] = [ex.Message]
        });
    }
});

v1.MapPost("/incoterms/allocate", (IncotermsAllocateRequest request, IIncotermsAllocationService service) =>
{
    var errors = ValidateIncotermsRequest(request);
    if (errors.Count > 0)
    {
        return Results.ValidationProblem(errors);
    }

    try
    {
        var result = service.Allocate(request);
        return Results.Ok(result);
    }
    catch (ArgumentException ex)
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["request"] = [ex.Message]
        });
    }
});

v1.MapGet("/corridors/ports", (string? disruptions, IPortCorridorTelemetryService service) =>
{
    var active = string.IsNullOrWhiteSpace(disruptions)
        ? Array.Empty<string>()
        : disruptions.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

    var result = service.GetTelemetry(active);
    return Results.Ok(result);
});

app.Run();

static Dictionary<string, string[]> ValidateFreightRequest(FreightQuoteRequest req)
{
    var errors = new Dictionary<string, string[]>();
    if (string.IsNullOrWhiteSpace(req.CorridorId))
        errors["corridorId"] = ["CorridorId is required."];
    if (string.IsNullOrWhiteSpace(req.Mode))
        errors["mode"] = ["Transport mode is required."];
    if (req.LengthCm <= 0 || req.WidthCm <= 0 || req.HeightCm <= 0)
        errors["dimensions"] = ["LengthCm, WidthCm, and HeightCm must all be > 0."];
    if (req.GrossWeightKg <= 0)
        errors["grossWeightKg"] = ["GrossWeightKg must be > 0."];
    if (req.Packages <= 0)
        errors["packages"] = ["Packages must be >= 1."];
    if (req.DeclaredValueUsd < 0)
        errors["declaredValueUsd"] = ["DeclaredValueUsd cannot be negative."];
    if (string.IsNullOrWhiteSpace(req.Incoterm))
        errors["incoterm"] = ["Incoterm (FOB, CIF, DDP) is required."];
    return errors;
}

static Dictionary<string, string[]> ValidateCustomsRequest(CustomsLandedCostRequest req)
{
    var errors = new Dictionary<string, string[]>();
    if (string.IsNullOrWhiteSpace(req.PresetId))
        errors["presetId"] = ["PresetId is required."];
    if (string.IsNullOrWhiteSpace(req.Regime))
        errors["regime"] = ["Regime (MFN, EVFTA, CPTPP, ACFTA) is required."];
    if (req.FobValueUsd <= 0)
        errors["fobValueUsd"] = ["FobValueUsd must be > 0."];
    if (req.FreightUsd < 0 || req.InsuranceUsd < 0 || req.LocalClearanceFeesUsd < 0)
        errors["fees"] = ["FreightUsd, InsuranceUsd, and LocalClearanceFeesUsd cannot be negative."];
    if (req.UnitQuantity <= 0)
        errors["unitQuantity"] = ["UnitQuantity must be >= 1."];
    if (req.VatRatePct is not (8 or 10))
        errors["vatRatePct"] = ["Vietnam import VAT rate must be 8 or 10."];
    if (req.SctRatePct < 0 || req.SctRatePct > 150)
        errors["sctRatePct"] = ["SctRatePct must be between 0 and 150."];
    return errors;
}

static Dictionary<string, string[]> ValidateContainerRequest(ContainerBalanceRequest req)
{
    var errors = new Dictionary<string, string[]>();
    if (string.IsNullOrWhiteSpace(req.ContainerType))
        errors["containerType"] = ["ContainerType is required."];
    if (req.Skus is null || req.Skus.Count == 0)
    {
        errors["skus"] = ["At least one CargoSkuRequest item is required."];
        return errors;
    }

    for (var i = 0; i < req.Skus.Count; i++)
    {
        var sku = req.Skus[i];
        if (sku.LengthCm <= 0 || sku.WidthCm <= 0 || sku.HeightCm <= 0)
            errors[$"skus[{i}].dimensions"] = ["SKU LengthCm, WidthCm, and HeightCm must be > 0."];
        if (sku.WeightKg <= 0)
            errors[$"skus[{i}].weightKg"] = ["SKU WeightKg must be > 0."];
        if (sku.Qty <= 0)
            errors[$"skus[{i}].qty"] = ["SKU Qty must be >= 1."];
    }

    return errors;
}

static Dictionary<string, string[]> ValidateRerouteRequest(CorridorRerouteRequest req)
{
    var errors = new Dictionary<string, string[]>();
    if (string.IsNullOrWhiteSpace(req.CorridorId))
        errors["corridorId"] = ["CorridorId is required."];
    if (req.CargoWeightKg <= 0)
        errors["cargoWeightKg"] = ["CargoWeightKg must be > 0."];
    if (req.CargoVolumeCbm <= 0)
        errors["cargoVolumeCbm"] = ["CargoVolumeCbm must be > 0."];
    if (req.CargoValueUsd <= 0)
        errors["cargoValueUsd"] = ["CargoValueUsd must be > 0."];
    if (req.SlaDeadlineDays <= 0)
        errors["slaDeadlineDays"] = ["SlaDeadlineDays must be >= 1."];
    return errors;
}

static Dictionary<string, string[]> ValidateIncotermsRequest(IncotermsAllocateRequest req)
{
    var errors = new Dictionary<string, string[]>();
    if (!IncotermsAllocationService.IsSupportedIncoterm(req.Incoterm))
        errors["incoterm"] = ["Incoterm must be one of EXW, FCA, FOB, CFR, CIF, DAP, DDP."];
    if (req.CargoValueUsd <= 0)
        errors["cargoValueUsd"] = ["CargoValueUsd must be > 0."];
    if (req.OriginInlandUsd < 0 || req.ExportCustomsUsd < 0 || req.OriginThcUsd < 0 ||
        req.MainFreightUsd < 0 || req.ImportCustomsUsd < 0 || req.DestinationDrayageUsd < 0)
        errors["costs"] = ["Logistics stage costs cannot be negative."];
    if (req.InsuranceRatePct < 0 || req.InsuranceRatePct > 10)
        errors["insuranceRatePct"] = ["InsuranceRatePct must be between 0 and 10."];
    if (req.ImportDutyRatePct < 0 || req.ImportDutyRatePct > 100)
        errors["importDutyRatePct"] = ["ImportDutyRatePct must be between 0 and 100."];
    return errors;
}

public partial class Program;
