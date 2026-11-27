import { describe, expect, it } from 'vitest';
import { FX_USD_TO_VND } from '../../data/corridors';
import type { CustomsDutyInput } from '../../types/logistics';
import {
  calculateVietnamCustomsDuty,
  getDutyRateForRegime,
  VIETNAM_HS_PRESETS,
} from '../customsDutyEngine';

const BASE_DUTY_INPUT: CustomsDutyInput = {
  presetId: 'apparel-textiles',
  regime: 'MFN',
  fobValueUsd: 50000,
  freightUsd: 3000,
  insuranceUsd: 250,
  unitQuantity: 1000,
  vatRatePct: 8,
  sctRatePct: 0,
  localClearanceFeesUsd: 350,
};

describe('Vietnam HS Code Import Duty, VAT & FTA Landed-Cost Engine (src/engines/customsDutyEngine.ts)', () => {
  it('provides all 6 mandatory Vietnam HS tariff presets with MFN, EVFTA, CPTPP and ACFTA Form E rates', () => {
    expect(VIETNAM_HS_PRESETS).toHaveLength(6);
    const ids = VIETNAM_HS_PRESETS.map((p) => p.id);
    expect(ids).toEqual([
      'electronics-servers',
      'industrial-machinery',
      'apparel-textiles',
      'specialty-coffee-agri',
      'automotive-ev-parts',
      'cosmetics-medical',
    ]);
    for (const preset of VIETNAM_HS_PRESETS) {
      expect(preset.evftaRatePct).toBeLessThanOrEqual(preset.mfnRatePct);
      expect(preset.cptppRatePct).toBeLessThanOrEqual(preset.mfnRatePct);
      expect(preset.acftaRatePct).toBeLessThanOrEqual(preset.mfnRatePct);
    }
  });

  it('computes exact CIF customs valuation (FOB + International Freight + Insurance) in USD and VND', () => {
    const res = calculateVietnamCustomsDuty(BASE_DUTY_INPUT);
    expect(res.cifValueUsd).toBe(53250);
    expect(res.cifValueVnd).toBe(Math.round(53250 * FX_USD_TO_VND));
  });

  it('applies exact Vietnam cascading tax formula: Duty on CIF, VAT on (CIF + Duty)', () => {
    // Apparel MFN = 20%, VAT = 8%, SCT = 0%
    const res = calculateVietnamCustomsDuty(BASE_DUTY_INPUT);
    expect(res.appliedDutyRatePct).toBe(20);
    expect(res.importDutyUsd).toBe(10650); // 53250 * 0.20
    expect(res.sctUsd).toBe(0);
    expect(res.vatUsd).toBe(5112); // (53250 + 10650) * 0.08 = 63900 * 0.08
    expect(res.totalTaxesUsd).toBe(15762);
    expect(res.totalLandedCostUsd).toBe(53250 + 15762 + 350);
  });

  it('applies cascading Special Consumption Tax (TTĐB) on (CIF + Duty) and VAT on (CIF + Duty + SCT)', () => {
    // Cosmetics MFN = 20%, SCT = 10%, VAT = 10%
    const res = calculateVietnamCustomsDuty({
      presetId: 'cosmetics-medical',
      regime: 'MFN',
      fobValueUsd: 9000,
      freightUsd: 800,
      insuranceUsd: 200, // CIF = 10,000
      unitQuantity: 100,
      vatRatePct: 10,
      sctRatePct: 10,
      localClearanceFeesUsd: 0,
    });
    expect(res.cifValueUsd).toBe(10000);
    expect(res.importDutyUsd).toBe(2000); // 20% of 10,000
    expect(res.sctUsd).toBe(1200); // 10% of (10,000 + 2,000)
    expect(res.vatUsd).toBe(1320); // 10% of (10,000 + 2,000 + 1,200)
    expect(res.totalTaxesUsd).toBe(4520);
    expect(res.totalLandedCostUsd).toBe(14520);
    expect(res.landedCostPerUnitUsd).toBe(145.2);
  });

  it('reduces import duty and cascading VAT dramatically under EVFTA vs MFN', () => {
    const mfn = calculateVietnamCustomsDuty({
      ...BASE_DUTY_INPUT,
      regime: 'MFN',
    });
    const evfta = calculateVietnamCustomsDuty({
      ...BASE_DUTY_INPUT,
      regime: 'EVFTA',
    });
    expect(evfta.appliedDutyRatePct).toBe(3.5);
    expect(evfta.importDutyUsd).toBeLessThan(mfn.importDutyUsd);
    expect(evfta.vatUsd).toBeLessThan(mfn.vatUsd);
    expect(evfta.savingsVsMfnUsd).toBeCloseTo(
      mfn.totalLandedCostUsd - evfta.totalLandedCostUsd,
      2,
    );
  });

  it('reaches 0% duty under CPTPP for Apparel & Electronics presets and flags optimal regime', () => {
    const cptpp = calculateVietnamCustomsDuty({
      ...BASE_DUTY_INPUT,
      regime: 'CPTPP',
    });
    expect(cptpp.appliedDutyRatePct).toBe(0);
    expect(cptpp.importDutyUsd).toBe(0);
    expect(cptpp.bestRegime).toBe('CPTPP');
  });

  it('calculates ACFTA (Form E) preferential tariff accurately for Specialty Coffee', () => {
    const coffeeAcfta = calculateVietnamCustomsDuty({
      presetId: 'specialty-coffee-agri',
      regime: 'ACFTA',
      fobValueUsd: 40000,
      freightUsd: 2000,
      insuranceUsd: 200,
      unitQuantity: 2000,
      vatRatePct: 8,
      sctRatePct: 0,
      localClearanceFeesUsd: 300,
    });
    // MFN 30% -> ACFTA Form E 5%
    expect(coffeeAcfta.appliedDutyRatePct).toBe(5);
    expect(coffeeAcfta.savingsVsMfnUsd).toBeGreaterThan(10000);
    expect(coffeeAcfta.bestRegime).toBe('CPTPP'); // 4% vs 5%
  });

  it('computes exact Landed Cost per Unit in both USD and VND', () => {
    const res = calculateVietnamCustomsDuty({
      ...BASE_DUTY_INPUT,
      unitQuantity: 500,
    });
    expect(res.landedCostPerUnitUsd).toBeCloseTo(
      res.totalLandedCostUsd / 500,
      2,
    );
    expect(res.landedCostPerUnitVnd).toBe(
      Math.round(res.totalLandedCostVnd / 500),
    );
  });

  it('switches cleanly between 8% reduced VAT and 10% standard VAT', () => {
    const vat8 = calculateVietnamCustomsDuty({
      ...BASE_DUTY_INPUT,
      vatRatePct: 8,
    });
    const vat10 = calculateVietnamCustomsDuty({
      ...BASE_DUTY_INPUT,
      vatRatePct: 10,
    });
    expect(vat10.vatUsd).toBeGreaterThan(vat8.vatUsd);
    expect(vat10.totalLandedCostUsd - vat8.totalLandedCostUsd).toBeCloseTo(
      vat10.vatUsd - vat8.vatUsd,
      2,
    );
  });

  it('always returns a full 4-regime comparison table (MFN, EVFTA, CPTPP, ACFTA)', () => {
    const res = calculateVietnamCustomsDuty(BASE_DUTY_INPUT);
    expect(res.comparisons).toHaveLength(4);
    expect(res.comparisons.map((r) => r.regime)).toEqual([
      'MFN',
      'EVFTA',
      'CPTPP',
      'ACFTA',
    ]);
    expect(res.comparisons[0].savingsVsMfnUsd).toBe(0);
  });

  it('resolves duty rates via getDutyRateForRegime for Automotive EV Parts', () => {
    const evPreset = VIETNAM_HS_PRESETS.find((p) => p.id === 'automotive-ev-parts')!;
    expect(getDutyRateForRegime(evPreset, 'MFN')).toBe(18);
    expect(getDutyRateForRegime(evPreset, 'EVFTA')).toBe(6.2);
    expect(getDutyRateForRegime(evPreset, 'CPTPP')).toBe(3.5);
    expect(getDutyRateForRegime(evPreset, 'ACFTA')).toBe(5);
  });

  it('honors custom HS code override while falling back to preset HS code when blank', () => {
    const overridden = calculateVietnamCustomsDuty({
      ...BASE_DUTY_INPUT,
      customHsCode: '8471.90.90',
    });
    expect(overridden.hsCode).toBe('8471.90.90');

    const fallback = calculateVietnamCustomsDuty({
      ...BASE_DUTY_INPUT,
      customHsCode: '   ',
    });
    expect(fallback.hsCode).toBe('6201.40.90');
  });

  it('computes zero import duty for Industrial Machinery under EVFTA, CPTPP, and ACFTA', () => {
    for (const regime of ['EVFTA', 'CPTPP', 'ACFTA'] as const) {
      const res = calculateVietnamCustomsDuty({
        presetId: 'industrial-machinery',
        regime,
        fobValueUsd: 100000,
        freightUsd: 5000,
        insuranceUsd: 500,
        unitQuantity: 2,
        vatRatePct: 8,
        sctRatePct: 0,
        localClearanceFeesUsd: 400,
      });
      expect(res.importDutyUsd).toBe(0);
      expect(res.savingsVsMfnUsd).toBeGreaterThan(10000);
    }
  });

  it('sanitizes negative values and zero unit quantities safely without division by zero or NaN', () => {
    const res = calculateVietnamCustomsDuty({
      presetId: 'unknown-preset',
      regime: 'EVFTA',
      fobValueUsd: -5000,
      freightUsd: -200,
      insuranceUsd: -10,
      unitQuantity: 0,
      vatRatePct: 10,
      sctRatePct: -5,
      localClearanceFeesUsd: -100,
    });
    expect(Number.isFinite(res.totalLandedCostUsd)).toBe(true);
    expect(Number.isFinite(res.landedCostPerUnitUsd)).toBe(true);
    expect(res.unitQuantity).toBe(1);
    expect(res.cifValueUsd).toBeGreaterThanOrEqual(100);
  });
});
