import { describe, expect, it } from 'vitest';
import { FX_USD_TO_VND } from '../../data/corridors';
import type { Incoterm2020Code, IncotermsAllocationInput } from '../../types/logistics';
import {
  calculateIncotermsAllocation,
  INCOTERM_SCENARIO_PRESETS,
  INCOTERM_STAGES,
  INCOTERMS_2020_ORDER,
} from '../incotermsMatrixEngine';

const BASE_INPUT: Omit<IncotermsAllocationInput, 'incoterm'> = {
  cargoValueUsd: 120000,
  originInlandUsd: 420,
  exportCustomsUsd: 185,
  originThcUsd: 390,
  mainFreightUsd: 4480,
  insuranceRatePct: 0.45,
  importDutyRatePct: 3.5,
  importCustomsUsd: 310,
  destinationDrayageUsd: 680,
};

describe('incotermsMatrixEngine — Incoterms 2020 Cost & Risk Transfer Chain', () => {
  it('defines all 7 core Incoterms 2020 and all 8 physical handover stages', () => {
    expect(INCOTERMS_2020_ORDER).toEqual([
      'EXW',
      'FCA',
      'FOB',
      'CFR',
      'CIF',
      'DAP',
      'DDP',
    ]);
    expect(INCOTERM_STAGES).toHaveLength(8);
    expect(INCOTERM_STAGES[0].id).toBe('factory-gate');
    expect(INCOTERM_STAGES[7].id).toBe('buyer-warehouse');
  });

  it('allocates minimum Seller obligation (Stage 1 only) under EXW', () => {
    const res = calculateIncotermsAllocation({ ...BASE_INPUT, incoterm: 'EXW' });
    expect(res.incoterm).toBe('EXW');
    expect(res.groupCode).toBe('E');
    expect(res.riskTransferStageIndex).toBe(1);
    expect(res.costTransferStageIndex).toBe(1);
    expect(res.hasCostRiskSplit).toBe(false);
    expect(res.stages[0].costOwner).toBe('seller');
    expect(res.stages[1].costOwner).toBe('buyer');
    expect(res.sellerCostUsd).toBe(res.stages[0].costUsd);
    expect(res.buyerCostUsd).toBeGreaterThan(res.sellerCostUsd * 10);
  });

  it('allocates stages 1..3 to Seller under FCA (multimodal optimal)', () => {
    const res = calculateIncotermsAllocation({ ...BASE_INPUT, incoterm: 'FCA' });
    expect(res.seaOnly).toBe(false);
    expect(res.riskTransferStageIndex).toBe(3);
    expect(res.costTransferStageIndex).toBe(3);
    expect(res.stages.filter((s) => s.costOwner === 'seller')).toHaveLength(3);
    expect(res.stages.filter((s) => s.riskOwner === 'seller')).toHaveLength(3);
  });

  it('allocates stages 1..4 to Seller under FOB and enforces sea-only scope', () => {
    const res = calculateIncotermsAllocation({ ...BASE_INPUT, incoterm: 'FOB' });
    expect(res.seaOnly).toBe(true);
    expect(res.riskTransferStageIndex).toBe(4);
    expect(res.costTransferStageIndex).toBe(4);
    expect(res.hasCostRiskSplit).toBe(false);
    expect(res.stages[3].costOwner).toBe('seller');
    expect(res.stages[4].costOwner).toBe('buyer');
  });

  it('correctly models the famous CFR Cost/Risk Split Point (Risk at Stage 4, Cost at Stage 5)', () => {
    const res = calculateIncotermsAllocation({ ...BASE_INPUT, incoterm: 'CFR' });
    expect(res.groupCode).toBe('C');
    expect(res.hasCostRiskSplit).toBe(true);
    expect(res.riskTransferStageIndex).toBe(4);
    expect(res.costTransferStageIndex).toBe(5);
    expect(res.insuranceRequired).toBe(false);
    // Stage 5 (main freight): Seller pays cost, Buyer bears risk!
    expect(res.stages[4].costOwner).toBe('seller');
    expect(res.stages[4].riskOwner).toBe('buyer');
    // Stage 6 (insurance): Buyer pays & bears risk
    expect(res.stages[5].costOwner).toBe('buyer');
  });

  it('correctly models CIF mandatory insurance (Stage 6) with Risk Transfer at Port Loading (Stage 4)', () => {
    const res = calculateIncotermsAllocation({ ...BASE_INPUT, incoterm: 'CIF' });
    expect(res.hasCostRiskSplit).toBe(true);
    expect(res.riskTransferStageIndex).toBe(4);
    expect(res.costTransferStageIndex).toBe(6);
    expect(res.insuranceRequired).toBe(true);
    expect(res.stages[4].costOwner).toBe('seller');
    expect(res.stages[5].costOwner).toBe('seller');
    expect(res.stages[4].riskOwner).toBe('buyer');
    expect(res.stages[5].riskOwner).toBe('buyer');
    expect(res.complianceWarningsEn.join(' ')).toContain('ICC (C)');
  });

  it('assigns Import Customs & Duty (Stage 7) to Buyer under DAP while Seller covers Stage 8 delivery', () => {
    const res = calculateIncotermsAllocation({ ...BASE_INPUT, incoterm: 'DAP' });
    expect(res.groupCode).toBe('D');
    expect(res.seaOnly).toBe(false);
    expect(res.stages[6].id).toBe('import-customs');
    expect(res.stages[6].costOwner).toBe('buyer');
    expect(res.stages[6].riskOwner).toBe('buyer');
    expect(res.stages[7].id).toBe('buyer-warehouse');
    expect(res.stages[7].costOwner).toBe('seller');
    expect(res.stages[7].riskOwner).toBe('seller');
    expect(res.buyerCostUsd).toBe(res.stages[6].costUsd);
  });

  it('allocates 100% of all 8 stages to Seller under DDP with zero Buyer logistics outlay', () => {
    const res = calculateIncotermsAllocation({ ...BASE_INPUT, incoterm: 'DDP' });
    expect(res.sellerSharePct).toBe(100);
    expect(res.buyerSharePct).toBe(0);
    expect(res.buyerCostUsd).toBe(0);
    expect(res.sellerCostUsd).toBe(res.totalLogisticsCostUsd);
    expect(res.stages.every((s) => s.costOwner === 'seller')).toBe(true);
    expect(res.stages.every((s) => s.riskOwner === 'seller')).toBe(true);
  });

  it('preserves strict accounting invariant: Seller + Buyer === Total Logistics across all 7 Incoterms', () => {
    const totals = new Set<number>();
    let prevSeller = -1;
    const ordered: Incoterm2020Code[] = ['EXW', 'FCA', 'FOB', 'CFR', 'CIF', 'DAP', 'DDP'];

    for (const term of ordered) {
      const res = calculateIncotermsAllocation({ ...BASE_INPUT, incoterm: term });
      const sum = Math.round((res.sellerCostUsd + res.buyerCostUsd) * 100) / 100;
      expect(sum).toBe(res.totalLogisticsCostUsd);
      expect(
        Math.round((res.sellerSharePct + res.buyerSharePct) * 10) / 10,
      ).toBe(100);
      expect(res.sellerCostUsd).toBeGreaterThan(prevSeller);
      prevSeller = res.sellerCostUsd;
      totals.add(res.totalLogisticsCostUsd);
    }
    // Total economic logistics cost stays identical; Incoterms only shift who pays what!
    expect(totals.size).toBe(1);
  });

  it('computes exact marine insurance on 110% of (Cargo + Main Freight) and VND conversion at FX_USD_TO_VND', () => {
    const res = calculateIncotermsAllocation({ ...BASE_INPUT, incoterm: 'CIF' });
    const expectedInsurance =
      Math.round(((120000 + 4480) * 1.1 * 0.0045 + Number.EPSILON) * 100) / 100;
    expect(res.stages[5].costUsd).toBe(expectedInsurance);
    expect(res.sellerCostVnd).toBe(Math.round(res.sellerCostUsd * FX_USD_TO_VND));
    expect(res.buyerCostVnd).toBe(Math.round(res.buyerCostUsd * FX_USD_TO_VND));
  });

  it('computes Import Duty + Brokerage on CIF value (Cargo + Main Freight + Insurance)', () => {
    const lowDuty = calculateIncotermsAllocation({
      ...BASE_INPUT,
      incoterm: 'DDP',
      importDutyRatePct: 0,
    });
    const highDuty = calculateIncotermsAllocation({
      ...BASE_INPUT,
      incoterm: 'DDP',
      importDutyRatePct: 12,
    });
    expect(lowDuty.stages[6].costUsd).toBe(BASE_INPUT.importCustomsUsd);
    expect(highDuty.stages[6].costUsd).toBeGreaterThan(15000);
    expect(highDuty.sellerCostUsd - lowDuty.sellerCostUsd).toBeGreaterThan(14500);
  });

  it('generates a complete 7-term comparison table matching individual runs', () => {
    const res = calculateIncotermsAllocation({ ...BASE_INPUT, incoterm: 'FOB' });
    expect(res.allTermsComparison).toHaveLength(7);
    const cifRow = res.allTermsComparison.find((r) => r.code === 'CIF')!;
    const cifDirect = calculateIncotermsAllocation({
      ...BASE_INPUT,
      incoterm: 'CIF',
    });
    expect(cifRow.sellerCostUsd).toBe(cifDirect.sellerCostUsd);
    expect(cifRow.buyerCostUsd).toBe(cifDirect.buyerCostUsd);
    expect(cifRow.hasCostRiskSplit).toBe(true);
    expect(cifRow.insuranceRequired).toBe(true);
  });

  it('validates all built-in trade scenario presets without NaN or negative values', () => {
    expect(INCOTERM_SCENARIO_PRESETS).toHaveLength(3);
    for (const preset of INCOTERM_SCENARIO_PRESETS) {
      const res = calculateIncotermsAllocation({
        ...preset.input,
        incoterm: 'CIF',
      });
      expect(Number.isFinite(res.sellerCostUsd)).toBe(true);
      expect(res.sellerCostUsd).toBeGreaterThan(0);
      expect(res.buyerCostUsd).toBeGreaterThan(0);
      expect(res.complianceWarningsEn.length).toBeGreaterThan(0);
      expect(res.complianceWarningsVi.length).toBeGreaterThan(0);
    }
  });

  it('sanitizes negative or invalid input numbers safely without NaN', () => {
    const res = calculateIncotermsAllocation({
      incoterm: 'DDP',
      cargoValueUsd: -500,
      originInlandUsd: -10,
      exportCustomsUsd: -20,
      originThcUsd: 0,
      mainFreightUsd: -100,
      insuranceRatePct: -5,
      importDutyRatePct: 250,
      importCustomsUsd: -50,
      destinationDrayageUsd: -10,
    });
    expect(res.cargoValueUsd).toBe(1000);
    expect(res.sellerCostUsd).toBeGreaterThan(0);
    expect(res.buyerCostUsd).toBe(0);
    expect(Number.isFinite(res.totalLogisticsCostUsd)).toBe(true);
  });

  it('keeps sellerTotalContractUsd <= buyerTotalOutlayUsd and equal only under DDP', () => {
    for (const term of INCOTERMS_2020_ORDER) {
      const res = calculateIncotermsAllocation({ ...BASE_INPUT, incoterm: term });
      if (term === 'DDP') {
        expect(res.sellerTotalContractUsd).toBe(res.buyerTotalOutlayUsd);
      } else {
        expect(res.sellerTotalContractUsd).toBeLessThan(res.buyerTotalOutlayUsd);
      }
    }
  });
});
