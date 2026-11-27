import { describe, expect, it } from 'vitest';
import { FX_USD_TO_VND } from '../../data/corridors';
import type { RerouteSimulationInput } from '../../types/logistics';
import {
  DISRUPTION_SCENARIOS,
  REROUTE_CARGO_PROFILES,
  simulateCorridorReroute,
} from '../rerouteSimulatorEngine';

const EU_BASE_INPUT: RerouteSimulationInput = {
  corridorId: 'vn-eu-sea',
  cargoWeightKg: 4200,
  cargoVolumeCbm: 22,
  cargoValueUsd: 180000,
  slaDeadlineDays: 24,
  activeDisruptions: [],
};

describe('Port Disruption & Multimodal Reroute Simulator (src/engines/rerouteSimulatorEngine.ts)', () => {
  it('exposes all 3 mandatory global disruption scenarios with metadata', () => {
    expect(DISRUPTION_SCENARIOS).toHaveLength(3);
    expect(DISRUPTION_SCENARIOS.map((s) => s.id)).toEqual([
      'red-sea-suez',
      'cat-lai-congestion',
      'uswc-port-strike',
    ]);
    expect(REROUTE_CARGO_PROFILES.length).toBeGreaterThanOrEqual(3);
  });

  it('always returns all 3 multimodal options (Ocean Direct, Sea-Air Hybrid, Direct Air) side-by-side', () => {
    const res = simulateCorridorReroute(EU_BASE_INPUT);
    expect(res.options).toHaveLength(3);
    expect(res.options.map((o) => o.modeId)).toEqual([
      'ocean-direct',
      'sea-air-hybrid',
      'direct-air',
    ]);
    const recommendedCount = res.options.filter((o) => o.recommended).length;
    expect(recommendedCount).toBe(1);
    expect(res.options.find((o) => o.recommended)?.modeId).toBe(
      res.recommendedMode,
    );
  });

  it('routes Europe corridors via Dubai (DXB) Sea-Air Hub and Pacific corridors via Singapore (SIN)', () => {
    const euRes = simulateCorridorReroute({
      ...EU_BASE_INPUT,
      corridorId: 'vn-eu-sea',
    });
    const usRes = simulateCorridorReroute({
      ...EU_BASE_INPUT,
      corridorId: 'vn-us-sea',
    });
    const jpRes = simulateCorridorReroute({
      ...EU_BASE_INPUT,
      corridorId: 'vn-jp-sea',
    });

    expect(
      euRes.options.find((o) => o.modeId === 'sea-air-hybrid')?.hubCode,
    ).toBe('DXB');
    expect(
      usRes.options.find((o) => o.modeId === 'sea-air-hybrid')?.hubCode,
    ).toBe('SIN');
    expect(
      jpRes.options.find((o) => o.modeId === 'sea-air-hybrid')?.hubCode,
    ).toBe('SIN');
  });

  it('recommends Ocean Direct under calm seas when SLA is relaxed (32d) and no disruptions are active', () => {
    const calm = simulateCorridorReroute({
      ...EU_BASE_INPUT,
      slaDeadlineDays: 32,
      activeDisruptions: [],
    });
    const ocean = calm.options[0];
    expect(ocean.disruptionDelayDays).toBe(0);
    expect(ocean.disruptionSurchargeUsd).toBe(0);
    expect(ocean.slaCompliant).toBe(true);
    expect(calm.recommendedMode).toBe('ocean-direct');
  });

  it('adds +12 ocean transit days, +34% war-risk surcharge, and +22% ocean CO2e under Red Sea / Suez Closure on EU lane', () => {
    const calm = simulateCorridorReroute({
      ...EU_BASE_INPUT,
      activeDisruptions: [],
    });
    const redSea = simulateCorridorReroute({
      ...EU_BASE_INPUT,
      activeDisruptions: ['red-sea-suez'],
    });

    const oceanCalm = calm.options[0];
    const oceanRedSea = redSea.options[0];

    expect(oceanRedSea.disruptionDelayDays).toBe(12);
    expect(oceanRedSea.totalLeadTimeDays).toBe(oceanCalm.totalLeadTimeDays + 12);
    expect(oceanRedSea.disruptionSurchargeUsd).toBeCloseTo(
      oceanCalm.freightCostUsd * 0.34,
      1,
    );
    expect(oceanRedSea.estimatedCo2Kg).toBeGreaterThan(
      Math.round(oceanCalm.estimatedCo2Kg * 1.2),
    );
  });

  it('adds exact +4 ocean dwell days and +$480 demurrage under Cat Lai Peak-Season Congestion', () => {
    const calm = simulateCorridorReroute({
      ...EU_BASE_INPUT,
      activeDisruptions: [],
    });
    const congested = simulateCorridorReroute({
      ...EU_BASE_INPUT,
      activeDisruptions: ['cat-lai-congestion'],
    });

    expect(congested.options[0].disruptionDelayDays).toBe(4);
    expect(congested.options[0].disruptionSurchargeUsd).toBe(480);
    expect(congested.options[1].disruptionDelayDays).toBe(1.5);
    expect(congested.options[1].disruptionSurchargeUsd).toBe(180);
    expect(congested.options[2].disruptionDelayDays).toBe(0.5);
    expect(congested.options[2].disruptionSurchargeUsd).toBe(95);
    expect(congested.options[0].totalLeadTimeDays).toBe(
      calm.options[0].totalLeadTimeDays + 4,
    );
  });

  it('adds +9 ocean days and $1,450 diversion surcharge on VN-US Pacific lane during US West Coast Port Strike', () => {
    const calmUs = simulateCorridorReroute({
      ...EU_BASE_INPUT,
      corridorId: 'vn-us-sea',
      slaDeadlineDays: 22,
      activeDisruptions: [],
    });
    const strikeUs = simulateCorridorReroute({
      ...EU_BASE_INPUT,
      corridorId: 'vn-us-sea',
      slaDeadlineDays: 22,
      activeDisruptions: ['uswc-port-strike'],
    });

    expect(strikeUs.options[0].disruptionDelayDays).toBe(9);
    expect(strikeUs.options[0].disruptionSurchargeUsd).toBe(1450);
    expect(strikeUs.options[0].totalLeadTimeDays).toBe(
      calmUs.options[0].totalLeadTimeDays + 9,
    );
    expect(strikeUs.options[0].slaCompliant).toBe(false);
    expect(strikeUs.options[1].slaCompliant).toBe(true);
  });

  it('stacks multiple concurrent disruption shocks additively across all 3 scenarios', () => {
    const combined = simulateCorridorReroute({
      ...EU_BASE_INPUT,
      corridorId: 'vn-eu-sea',
      activeDisruptions: [
        'red-sea-suez',
        'cat-lai-congestion',
        'uswc-port-strike',
      ],
    });
    // EU lane: +12 (Red Sea) + 4 (Cat Lai) + 2 (USWC global ripple) = +18d
    expect(combined.options[0].disruptionDelayDays).toBe(18);
    expect(combined.options[0].totalLeadTimeDays).toBe(46);
    expect(combined.options[1].disruptionDelayDays).toBe(3); // 1 + 1.5 + 0.5
    expect(combined.options[2].disruptionDelayDays).toBe(0.5); // 0 + 0.5 + 0
  });

  it('shifts optimal recommendation from Ocean Direct to Sea-Air Hybrid when Red Sea + Cat Lai breach EU SLA', () => {
    const disrupted = simulateCorridorReroute({
      ...EU_BASE_INPUT,
      corridorId: 'vn-eu-sea',
      cargoValueUsd: 180000,
      slaDeadlineDays: 22,
      activeDisruptions: ['red-sea-suez', 'cat-lai-congestion'],
    });
    const ocean = disrupted.options[0];
    const seaAir = disrupted.options[1];

    expect(ocean.slaCompliant).toBe(false);
    expect(seaAir.slaCompliant).toBe(true);
    expect(disrupted.recommendedMode).toBe('sea-air-hybrid');
    expect(disrupted.leadTimeSavedVsOceanDays).toBeGreaterThan(20);
  });

  it('shifts optimal recommendation to Direct Air Freight for ultra-urgent 5-day semiconductor SLA', () => {
    const urgent = simulateCorridorReroute({
      corridorId: 'vn-de-air',
      cargoWeightKg: 1200,
      cargoVolumeCbm: 6,
      cargoValueUsd: 350000,
      slaDeadlineDays: 5,
      activeDisruptions: ['red-sea-suez', 'cat-lai-congestion'],
    });
    expect(urgent.options[2].slaCompliant).toBe(true);
    expect(urgent.options[1].slaCompliant).toBe(false);
    expect(urgent.recommendedMode).toBe('direct-air');
  });

  it('maintains strict transit speed hierarchy: Direct Air < Sea-Air Hybrid < Ocean Direct', () => {
    for (const corridorId of ['vn-eu-sea', 'vn-us-sea', 'vn-jp-sea', 'vn-de-air']) {
      const res = simulateCorridorReroute({
        ...EU_BASE_INPUT,
        corridorId,
        activeDisruptions: ['red-sea-suez', 'cat-lai-congestion'],
      });
      expect(res.options[2].totalLeadTimeDays).toBeLessThan(
        res.options[1].totalLeadTimeDays,
      );
      expect(res.options[1].totalLeadTimeDays).toBeLessThan(
        res.options[0].totalLeadTimeDays,
      );
    }
  });

  it('maintains strict carbon hierarchy: Ocean Direct < Sea-Air Hybrid < Direct Air and computes >40% Sea-Air CO2 savings vs Air', () => {
    const res = simulateCorridorReroute({
      ...EU_BASE_INPUT,
      activeDisruptions: ['red-sea-suez'],
    });
    const [ocean, seaAir, air] = res.options;
    expect(ocean.estimatedCo2Kg).toBeLessThan(seaAir.estimatedCo2Kg);
    expect(seaAir.estimatedCo2Kg).toBeLessThan(air.estimatedCo2Kg);
    expect(res.seaAirCo2SavingsVsAirPct).toBeGreaterThan(40);
    expect(res.seaAirCo2SavingsVsAirPct).toBeLessThan(65);
  });

  it('maintains base freight cost hierarchy: Ocean Direct < Sea-Air Hybrid < Direct Air', () => {
    const res = simulateCorridorReroute(EU_BASE_INPUT);
    expect(res.options[0].freightCostUsd).toBeLessThan(
      res.options[1].freightCostUsd,
    );
    expect(res.options[1].freightCostUsd).toBeLessThan(
      res.options[2].freightCostUsd,
    );
  });

  it('computes exact Inventory Holding Penalty = Working Capital Carry (18% WACC) + SLA Late Breach Penalty', () => {
    const res = simulateCorridorReroute({
      ...EU_BASE_INPUT,
      cargoValueUsd: 100000,
      slaDeadlineDays: 20,
      dailyPenaltyOverrideUsd: 500,
      activeDisruptions: ['cat-lai-congestion'],
    });
    const ocean = res.options[0]; // base 28 + 4 = 32d -> 12d late
    expect(ocean.slaBreachDays).toBe(12);
    expect(ocean.slaBreachPenaltyUsd).toBe(6000);
    const expectedCarry = Math.round((100000 * (0.18 / 365) * 32) * 100) / 100;
    expect(ocean.workingCapitalCarryUsd).toBeCloseTo(expectedCarry, 1);
    expect(ocean.inventoryHoldingPenaltyUsd).toBeCloseTo(
      ocean.workingCapitalCarryUsd + ocean.slaBreachPenaltyUsd,
      2,
    );
  });

  it('computes exact Total Landed Cost in USD and VND using FX_USD_TO_VND', () => {
    const res = simulateCorridorReroute({
      ...EU_BASE_INPUT,
      activeDisruptions: ['red-sea-suez'],
    });
    for (const opt of res.options) {
      expect(opt.totalLandedCostUsd).toBeCloseTo(
        opt.freightCostUsd +
          opt.disruptionSurchargeUsd +
          opt.inventoryHoldingPenaltyUsd,
        2,
      );
      expect(opt.totalLandedCostVnd).toBe(
        Math.round(opt.totalLandedCostUsd * FX_USD_TO_VND),
      );
    }
  });

  it('scales Ocean Direct from LCL to FCL 20ft to FCL 40ft cleanly as shipment volume grows', () => {
    const smallLcl = simulateCorridorReroute({
      ...EU_BASE_INPUT,
      cargoWeightKg: 800,
      cargoVolumeCbm: 4,
    });
    const fcl20 = simulateCorridorReroute({
      ...EU_BASE_INPUT,
      cargoWeightKg: 8000,
      cargoVolumeCbm: 24,
    });
    const fcl40 = simulateCorridorReroute({
      ...EU_BASE_INPUT,
      cargoWeightKg: 18000,
      cargoVolumeCbm: 58,
    });

    expect(smallLcl.options[0].linkedQuoteMode).toBe('sea-lcl');
    expect(fcl20.options[0].linkedQuoteMode).toBe('sea-fcl-20');
    expect(fcl40.options[0].linkedQuoteMode).toBe('sea-fcl-40');
    expect(fcl20.options[0].freightCostUsd).toBeGreaterThan(
      smallLcl.options[0].freightCostUsd,
    );
    expect(fcl40.options[0].freightCostUsd).toBeGreaterThan(
      fcl20.options[0].freightCostUsd,
    );
  });

  it('deduplicates repeated disruption scenario IDs to prevent double-counting delays', () => {
    const single = simulateCorridorReroute({
      ...EU_BASE_INPUT,
      activeDisruptions: ['red-sea-suez'],
    });
    const duplicated = simulateCorridorReroute({
      ...EU_BASE_INPUT,
      activeDisruptions: ['red-sea-suez', 'red-sea-suez'],
    });
    expect(duplicated.activeDisruptions).toEqual(['red-sea-suez']);
    expect(duplicated.options[0].totalLeadTimeDays).toBe(
      single.options[0].totalLeadTimeDays,
    );
  });

  it('clamps resilience scores strictly within 1..100 and computes positive carbon intensity kg/ton', () => {
    const res = simulateCorridorReroute({
      ...EU_BASE_INPUT,
      activeDisruptions: ['red-sea-suez', 'cat-lai-congestion'],
    });
    for (const opt of res.options) {
      expect(opt.resilienceScore).toBeGreaterThanOrEqual(1);
      expect(opt.resilienceScore).toBeLessThanOrEqual(100);
      expect(opt.carbonIntensityKgPerTon).toBeGreaterThan(0);
    }
  });

  it('sanitizes negative or zero inputs safely without NaN or Infinity', () => {
    const res = simulateCorridorReroute({
      corridorId: 'non-existent-corridor',
      cargoWeightKg: -500,
      cargoVolumeCbm: 0,
      cargoValueUsd: -10000,
      slaDeadlineDays: 0,
      activeDisruptions: [],
    });
    expect(res.corridorId).toBe('vn-eu-sea');
    expect(res.cargoWeightKg).toBe(50);
    expect(res.cargoVolumeCbm).toBe(0.5);
    expect(res.cargoValueUsd).toBe(1000);
    expect(res.slaDeadlineDays).toBe(1);
    for (const opt of res.options) {
      expect(Number.isFinite(opt.totalLandedCostUsd)).toBe(true);
      expect(Number.isFinite(opt.estimatedCo2Kg)).toBe(true);
    }
  });

  it('computes netCostDeltaRecommendedVsOceanUsd accurately when Sea-Air beats disrupted Ocean', () => {
    const disrupted = simulateCorridorReroute({
      corridorId: 'vn-eu-sea',
      cargoWeightKg: 2400,
      cargoVolumeCbm: 12,
      cargoValueUsd: 260000,
      slaDeadlineDays: 22,
      activeDisruptions: ['red-sea-suez', 'cat-lai-congestion'],
    });
    const rec = disrupted.options.find((o) => o.recommended)!;
    const ocean = disrupted.options[0];
    expect(disrupted.netCostDeltaRecommendedVsOceanUsd).toBeCloseTo(
      rec.totalLandedCostUsd - ocean.totalLandedCostUsd,
      2,
    );
    // For high-value cargo ($260k) with 22d late ocean SLA breach, Sea-Air Hybrid saves real net money!
    expect(disrupted.netCostDeltaRecommendedVsOceanUsd).toBeLessThan(0);
  });
});
