# ADR-001: Deterministic Chargeable-Weight Quoting & Vietnam EVFTA / CPTPP / ACFTA Cascading Customs Engine

- **Status:** Accepted
- **Date:** 2026-11-28
- **Author:** Truong Van Tinh — Principal Solution Architect
- **Scope:** `src/engines/freight.ts`, `src/engines/customsDutyEngine.ts`, `backend/src/Meridian.Domain/Services/FreightQuoteService.cs`, `backend/src/Meridian.Domain/Services/VietnamCustomsService.cs`

---

## 1. Context

Cross-border Vietnamese exporters and importers operating on high-volume EU (`VNSGN <-> NLRTM`), US Pacific (`VNHPH <-> USLAX`), Japan (`VNDAD <-> JPTYO`), and Frankfurt Air (`SGN <-> FRA`) lanes face two persistent quotation failure modes:

1. **Chargeable-Weight Mispricing:** Shippers routinely budget freight using gross scale weight while carriers invoice on IATA dimensional weight (`L x W x H / 6000` for Air Express, `/ 5000` for Air Standard) or ocean LCL Weight/Measurement (`W/M`) revenue tons (`max(CBM, metric tons)`). Underestimating volumetric conversion causes 25%–60% invoice surprises at airport cargo terminals.
2. **Vietnam Cascading Tax Blindness & Missed FTA Certificates of Origin (C/O):** Vietnam Customs does not compute Import Duty, Special Consumption Tax (TTĐB / SCT), and Import VAT independently on FOB value. Instead, it assesses **CIF Valuation (`FOB + International Freight + Marine Insurance`)** and compounds taxes sequentially:
   - `Import Duty = CIF * DutyRate(HS, FTA)`
   - `SCT (TTĐB) = (CIF + Import Duty) * SctRate`
   - `Import VAT = (CIF + Import Duty + SCT) * VatRate` (8% relief decree or 10% standard)
   Because Import Duty sits inside the taxable base of both SCT and VAT, obtaining a preferential Certificate of Origin (**EUR.1 / REX for EVFTA**, **CPTPP Origin Cert**, or **C/O Form E for ACFTA**) yields compounding tax savings larger than the headline tariff reduction alone.

---

## 2. Decision

We implement **exact, deterministic domain parity** between the client-side TypeScript engines (for zero-latency 60 FPS interactive control-tower responsiveness and static GitHub Pages availability) and the authoritative **`.NET 10` Clean Architecture Minimal API** (`Meridian.Domain` + `Meridian.Api`) using `decimal` midpoint-away-from-zero financial arithmetic:

1. **Multimodal Chargeable-Weight Rules (`POST /api/v1/quotes/freight`):**
   - `air-express`: IATA divisor `6000` (`chargeableKg = ceil(max(grossKg, cm3 / 6000))`).
   - `air-standard`: IATA divisor `5000` (`chargeableKg = ceil(max(grossKg, cm3 / 5000))`).
   - `road-ftl`: Cross-border road divisor `4000`.
   - `sea-lcl`: W/M revenue ton `max(1, totalCbm, totalGrossKg / 1000)` billed at `1000 kg = 1 CBM`.
   - `sea-fcl-20` / `sea-fcl-40`: Container allocation `max(1, ceil(totalCbm / maxCbm), ceil(totalGrossKg / maxKg))` with utilization % reporting.
   - **Incoterms 2020 Enforcement:** `CIF` mandates all-risk cargo insurance (`max($45, 0.45% of declared value)`); `DDP` mandates destination customs brokerage (`$285`), insurance, and estimated import duties.
   - **Settlement Conversion:** FX `1 USD = 25,450 VND`, issuing a 20% slot reservation deposit (`depositVnd`) ready for NAPAS 247 MBBank VietQR encoding.

2. **4-Regime Vietnam Customs Matrix (`POST /api/v1/customs/landed-cost`):**
   - Every calculation evaluates **all 4 tariff regimes simultaneously** (`MFN`, `EVFTA`, `CPTPP`, `ACFTA`), returning exact cascading `Import Duty`, `SCT`, `Import VAT (8% or 10%)`, `Total Landed Cost (USD & VND)`, `Landed Cost / Unit`, `Savings vs MFN`, and automatically flagging `bestRegime`.
   - Input validation strictly rejects invalid VAT rates (anything other than `8` or `10`) or negative customs valuations with RFC 7807 `400 ValidationProblemDetails`.

---

## 3. Alternatives Considered

| Option | Pros | Cons | Decision |
| :--- | :--- | :--- | :--- |
| **Backend-only calculation** | Single codebase | High latency on slider/dimension edits; breaks offline/static demo UX | Rejected |
| **Frontend-only SPA** | Zero hosting cost | Cannot integrate ERP/WMS webhooks, audit persistence, or enterprise SLA validation | Rejected |
| **Dual-Parity TS + `.NET 10` Clean Architecture** | Instant browser UX + authoritative `.NET 10` decimal API verified by Vitest & xUnit | Must keep domain rules synchronized via shared test vectors | **Accepted** |

---

## 4. Consequences & Verification

- **Precision:** `.NET 10` uses `decimal` with `MidpointRounding.AwayFromZero` across all currency, tariff, and CIF computations, eliminating IEEE-754 floating-point drift on enterprise invoices.
- **Verification:** Cross-validated with identical financial fixtures across Vitest (`customsDutyEngine.test.ts`, `freightAndWaybill.test.ts`) and xUnit + `WebApplicationFactory<Program>` (`MeridianApiIntegrationTests.cs`).
- **Extensibility:** `MeridianCatalog` isolates tariff schedules and corridor rates cleanly behind `IFreightQuoteService` and `IVietnamCustomsService`, enabling seamless backing by PostgreSQL 16 + Redis 7 cache-aside lookups in Docker Compose deployments without touching endpoint contracts.
