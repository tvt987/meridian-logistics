# ADR-002: 3D Container Bin-Packing, Three-Axis Center-of-Gravity (CG X/Y/Z %) & SOLAS Chapter VI e-VGM Balance Gate

- **Status:** Accepted
- **Date:** 2026-11-28
- **Author:** Truong Van Tinh — Principal Solution Architect
- **Scope:** `src/engines/containerPackingEngine.ts`, `src/components/ContainerStuffingOptimizer.tsx`, `backend/src/Meridian.Domain/Services/ContainerBalanceService.cs`

---

## 1. Context

Since July 2016, **IMO SOLAS Chapter VI, Regulation 2** legally prohibits ocean carriers from loading any packed ISO container onto a vessel without a **Verified Gross Mass (e-VGM)** declaration (`Container Tare + Total Cargo & Dunnage Mass <= CSC Safety Approval Plate Maximum Gross Mass`). Beyond gross weight, the **IMO/ILO/UNECE CTU Code** warns that eccentric cargo loading causes:

1. **Longitudinal Axle Overload (`CG-X`):** Heavy machinery clustered at the nose (`<36%`) overloads the prime-mover kingpin/drive axle and triggers crane spreader tilt during port gantry lifts; tail-heavy loading (`>64%`) risks chassis tandem-axle highway citation and forklift tip-over.
2. **Lateral Roll Instability (`CG-Y`):** Off-center transverse weight (`<38%` or `>62%`) induces crane twist-lock shear and highway curve rollovers.
3. **Vertical Center-of-Gravity Ceiling (`CG-Z`):** Stacking dense cargo high (`>58%` of internal height) elevates vessel metacentric roll torque during heavy seas.

Prior v2.0 planning tools only displayed longitudinal CoG (`1D`) without lateral/vertical stability auditing or explicit SOLAS VGM pass/fail gate rejection.

---

## 2. Decision

We upgrade both the browser 3D Stuffing Visualizer and the `.NET 10` `ContainerBalanceService` (`POST /api/v1/containers/balance-check`) to execute a full **3-Axis Mass Moment & SOLAS e-VGM Compliance Gate**:

1. **Deterministic 3D Bay-Column Stuffing Heuristic:**
   - Sorts SKUs with stackable, higher-volume/heavier cartons placed first as structural base layers, crowning columns with fragile `stackable = false` top-only crates (guaranteeing zero boxes placed above non-stackable cartons).
   - Evaluates both horizontal rotations (`L x W` and `W x L`) to maximize transverse floor utilization across ISO `20'GP` (`589x235x239 cm`), `40'GP` (`1203x235x239 cm`), `40'HC` (`1203x235x269 cm`), and `40'RF` Reefer (`1158x229x225 cm`).

2. **Exact Three-Axis Center-of-Gravity (`CG X / Y / Z %`):**
   - For every placed carton $i$ of mass $m_i$ at origin $(x_i, y_i, z_i)$ with placed extents $(l_i, w_i, h_i)$:
     $$\text{CG}_X = \frac{\sum m_i (x_i + l_i/2)}{M_{\text{cargo}} \cdot L_{\text{inner}}} \times 100, \quad \text{CG}_Y = \frac{\sum m_i (y_i + w_i/2)}{M_{\text{cargo}} \cdot W_{\text{inner}}} \times 100, \quad \text{CG}_Z = \frac{\sum m_i (z_i + h_i/2)}{M_{\text{cargo}} \cdot H_{\text{inner}}} \times 100$$
   - Statically determinate beam reactions map longitudinal mass directly to **Kingpin / Front Axle (`100 - CG_X %`)** and **Rear Tandem Axle (`CG_X %`)**.

3. **Explicit SOLAS e-VGM & CTU Compliance Gate:**
   - Computes `vgmGrossKg = tareWeightKg + usedWeightKg` vs `maxGrossSolasKg = tareWeightKg + maxPayloadKg`.
   - Emits machine-readable violation codes whenever thresholds are breached:
     - `OVERWEIGHT_PAYLOAD` (`usedWeightKg > maxPayloadKg`, enforced strictly in `strictSingleContainer = true` gate audits)
     - `OVERSIZE_CARGO` (`unfitCartons > 0`, e.g., tall cargo exceeding 225 cm Reefer clearance)
     - `LONGITUDINAL_IMBALANCE` (`CG_X < 36%` or `CG_X > 64%`)
     - `LATERAL_IMBALANCE` (`CG_Y < 38%` or `CG_Y > 62%`)
     - `HIGH_VERTICAL_CG` (`CG_Z > 58%`)
   - Returns `APPROVED_SOLAS_VGM` (`solasVgmCompliant: true`) only when zero violations exist; otherwise returns `REJECTED_SOLAS_VGM` with exact violation diagnostics.

---

## 3. Consequences

- **Visual Explainability:** The isometric 3D SVG and orthographic Side (`L x H`) / Top (`L x W`) blueprints render a live 3D centroid crosshair colored emerald (`PASS`) or rose (`FAIL`) alongside the `36%–64%` safe longitudinal envelope.
- **API Gatekeeping:** Warehouse Management Systems (WMS) can invoke `POST /api/v1/containers/balance-check` with `strictSingleContainer: true` prior to gate-in booking to automatically reject overweight or dangerously unbalanced container manifests before carrier VGM cutoff.
- **Zero Regression:** Backward-compatible `centerOfGravityPct` alias preserves 100% of v2.0 consumers while exposing full 3D centroid telemetry.
