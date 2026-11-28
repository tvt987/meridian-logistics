import { describe, expect, it } from 'vitest';
import {
  CAMERA_PRESETS,
  computeBalancedStowPlan,
  computeVesselStability,
  CRANE_HOME_Z,
  CRANE_PHASE_ORDER,
  CRANE_SAFE_HOIST_Y,
  createInitialCraneState,
  createInitialPortContainers,
  createPortContainer,
  easeInOutCubic,
  enqueueCraneJob,
  findNextOpenSlot,
  getCameraPresetPose,
  getCraneIndexForBay,
  getSlotLocalPosition,
  getSlotWorldPosition,
  injectStarboardImbalance,
  PORT_CONTAINER_SPECS,
  QUAY_PICKUP_X,
  sampleOceanWaveMotion,
  SHIP_CENTER_X,
  slotKey,
  stepCraneState,
  VESSEL_MAX_SLOTS,
  VESSEL_TIER_COUNT,
  type CranePhase,
  type PortContainer,
} from '../maritimePort3dEngine';

describe('Maritime Port 3D Physics, Hydrostatic SOLAS & STS Crane Engine (v5.0)', () => {
  it('1. exposes exact VGM weights and metadata for 40FT DRY, REEFER (-18C), and HAZMAT IMO-3', () => {
    expect(PORT_CONTAINER_SPECS['dry-40'].weightTonnes).toBe(26.5);
    expect(PORT_CONTAINER_SPECS['reefer-40'].weightTonnes).toBe(29.2);
    expect(PORT_CONTAINER_SPECS['reefer-40'].reeferTempC).toBe(-18.0);
    expect(PORT_CONTAINER_SPECS['hazmat-imo3'].weightTonnes).toBe(31.8);
    expect(PORT_CONTAINER_SPECS['hazmat-imo3'].imoClass).toBe('IMO-3');
  });

  it('2. creates a symmetric 24-container (48 TEU) initial stow with NOMINAL stability', () => {
    const initial = createInitialPortContainers();
    expect(initial).toHaveLength(24);
    const report = computeVesselStability(initial);
    expect(report.teuCount).toBe(48);
    expect(report.maxSlots).toBe(VESSEL_MAX_SLOTS);
    expect(report.absHeelAngleDeg).toBeLessThan(0.5);
    expect(report.gmMeters).toBeGreaterThan(2.0);
    expect(report.verdict).toBe('NOMINAL');
    expect(report.solasCompliant).toBe(true);
  });

  it('3. computes exact lightship baseline for an empty deck (0 containers)', () => {
    const report = computeVesselStability([]);
    expect(report.containerCount).toBe(0);
    expect(report.totalVgmTonnes).toBe(0);
    expect(report.cgX).toBe(0);
    expect(report.cgZ).toBe(0);
    expect(report.heelAngleDeg).toBe(0);
    expect(report.trimPitchDeg).toBe(0);
    expect(report.gmMeters).toBeGreaterThan(3.0);
    expect(report.verdict).toBe('NOMINAL');
  });

  it('4. placing a container on starboard outer wing (col 4) heels ship positively (+Starboard)', () => {
    const box = createPortContainer('hazmat-imo3', 1, 4, 0, 1);
    const report = computeVesselStability([box]);
    expect(report.heelAngleDeg).toBeGreaterThan(0.5);
    expect(report.cgX).toBeGreaterThan(0);
    expect(report.starboardWeightTonnes).toBe(31.8);
    expect(report.portWeightTonnes).toBe(0);
  });

  it('5. placing a container on port outer wing (col 0) heels ship negatively (-Port)', () => {
    const box = createPortContainer('hazmat-imo3', 1, 0, 0, 2);
    const report = computeVesselStability([box]);
    expect(report.heelAngleDeg).toBeLessThan(-0.5);
    expect(report.cgX).toBeLessThan(0);
    expect(report.portWeightTonnes).toBe(31.8);
    expect(report.starboardWeightTonnes).toBe(0);
  });

  it('6. mirrored port and starboard boxes of identical type produce exact 0.0 deg heel', () => {
    const portBox = createPortContainer('reefer-40', 2, 0, 0, 1);
    const stbdBox = createPortContainer('reefer-40', 2, 4, 0, 2);
    const report = computeVesselStability([portBox, stbdBox]);
    expect(report.heelAngleDeg).toBe(0);
    expect(report.cgX).toBe(0);
    expect(report.portWeightTonnes).toBe(report.starboardWeightTonnes);
  });

  it('7. bow loading produces negative trim pitch while stern loading produces positive trim pitch', () => {
    const bowLoad = [
      createPortContainer('hazmat-imo3', 0, 2, 0, 1),
      createPortContainer('hazmat-imo3', 0, 2, 1, 2),
    ];
    const sternLoad = [
      createPortContainer('hazmat-imo3', 3, 2, 0, 3),
      createPortContainer('hazmat-imo3', 3, 2, 1, 4),
    ];
    expect(computeVesselStability(bowLoad).trimPitchDeg).toBeLessThan(0);
    expect(computeVesselStability(sternLoad).trimPitchDeg).toBeGreaterThan(0);
  });

  it('8. stacking higher vertical tiers raises KG (cgY) and strictly lowers metacentric height GM', () => {
    const lowStack = [
      createPortContainer('hazmat-imo3', 1, 2, 0, 1),
      createPortContainer('hazmat-imo3', 2, 2, 0, 2),
    ];
    const highStack = [
      createPortContainer('hazmat-imo3', 1, 2, 3, 1),
      createPortContainer('hazmat-imo3', 2, 2, 3, 2),
    ];
    const lowRep = computeVesselStability(lowStack);
    const highRep = computeVesselStability(highStack);
    expect(highRep.cgY).toBeGreaterThan(lowRep.cgY);
    expect(highRep.gmMeters).toBeLessThan(lowRep.gmMeters);
  });

  it('9. heavier container types (HAZMAT > REEFER > DRY) induce monotonically larger heel at outer wing', () => {
    const dryRep = computeVesselStability([createPortContainer('dry-40', 1, 4, 0, 1)]);
    const reeferRep = computeVesselStability([createPortContainer('reefer-40', 1, 4, 0, 2)]);
    const hazmatRep = computeVesselStability([createPortContainer('hazmat-imo3', 1, 4, 0, 3)]);
    expect(hazmatRep.heelAngleDeg).toBeGreaterThan(reeferRep.heelAngleDeg);
    expect(reeferRep.heelAngleDeg).toBeGreaterThan(dryRep.heelAngleDeg);
  });

  it('10. vessel draft increases monotonically with onboard VGM tonnage', () => {
    const emptyDraft = computeVesselStability([]).draftMeters;
    const midDraft = computeVesselStability(createInitialPortContainers()).draftMeters;
    const heavy = injectStarboardImbalance(createInitialPortContainers(), 100).containers;
    const heavyDraft = computeVesselStability(heavy).draftMeters;
    expect(midDraft).toBeGreaterThan(emptyDraft);
    expect(heavyDraft).toBeGreaterThan(midDraft);
  });

  it('11. classifies ADVISORY SOLAS verdict when heel sits between 2.0 and 4.5 degrees', () => {
    const base = createInitialPortContainers();
    const tilted: PortContainer[] = [
      ...base,
      createPortContainer('hazmat-imo3', 1, 4, 1, 50),
      createPortContainer('hazmat-imo3', 2, 4, 1, 51),
    ];
    const report = computeVesselStability(tilted);
    expect(report.absHeelAngleDeg).toBeGreaterThanOrEqual(2.0);
    expect(report.absHeelAngleDeg).toBeLessThanOrEqual(4.5);
    expect(report.verdict).toBe('ADVISORY');
    expect(report.solasCompliant).toBe(true);
  });

  it('12. injectStarboardImbalance forces vessel heel past 6.5 deg and triggers SOLAS CRITICAL', () => {
    const base = createInitialPortContainers();
    const { containers, added } = injectStarboardImbalance(base, 100);
    const report = computeVesselStability(containers);
    expect(added.length).toBeGreaterThanOrEqual(4);
    expect(report.heelAngleDeg).toBeGreaterThan(6.5);
    expect(report.verdict).toBe('CRITICAL');
    expect(report.solasCompliant).toBe(false);
    expect(report.advisoryEn).toContain('SOLAS CRITICAL');
  });

  it('13. injectStarboardImbalance creates zero duplicate slots and stays within tier bounds', () => {
    const base = createInitialPortContainers();
    const { containers } = injectStarboardImbalance(base, 200);
    const seen = new Set<string>();
    for (const c of containers) {
      const k = slotKey(c.bay, c.col, c.tier);
      expect(seen.has(k)).toBe(false);
      seen.add(k);
      expect(c.tier).toBeGreaterThanOrEqual(0);
      expect(c.tier).toBeLessThan(VESSEL_TIER_COUNT);
    }
  });

  it('14. injectStarboardImbalance recovers CRITICAL starboard list even starting from port-heavy load', () => {
    const portHeavy = [
      ...createInitialPortContainers(),
      createPortContainer('hazmat-imo3', 0, 0, 1, 61),
      createPortContainer('hazmat-imo3', 1, 0, 1, 62),
      createPortContainer('hazmat-imo3', 2, 0, 1, 63),
      createPortContainer('hazmat-imo3', 3, 0, 1, 64),
    ];
    const { containers } = injectStarboardImbalance(portHeavy, 300);
    const report = computeVesselStability(containers);
    expect(report.heelAngleDeg).toBeGreaterThan(6.5);
    expect(report.verdict).toBe('CRITICAL');
  });

  it('15. computeBalancedStowPlan restores critically heeled vessel to < 0.5 deg and GM > 1.8m (NOMINAL)', () => {
    const imbalanced = injectStarboardImbalance(
      createInitialPortContainers(),
      100,
    ).containers;
    expect(computeVesselStability(imbalanced).verdict).toBe('CRITICAL');

    const balanced = computeBalancedStowPlan(imbalanced);
    const report = computeVesselStability(balanced);
    expect(report.absHeelAngleDeg).toBeLessThan(0.5);
    expect(report.gmMeters).toBeGreaterThan(1.8);
    expect(report.verdict).toBe('NOMINAL');
    expect(report.solasCompliant).toBe(true);
  });

  it('16. computeBalancedStowPlan preserves exact container count and total VGM tonnage', () => {
    const imbalanced = injectStarboardImbalance(
      createInitialPortContainers(),
      150,
    ).containers;
    const beforeVgm = computeVesselStability(imbalanced).totalVgmTonnes;
    const balanced = computeBalancedStowPlan(imbalanced);
    const afterVgm = computeVesselStability(balanced).totalVgmTonnes;

    expect(balanced).toHaveLength(imbalanced.length);
    expect(afterVgm).toBeCloseTo(beforeVgm, 2);
  });

  it('17. computeBalancedStowPlan places heavy HAZMAT boxes on lower average tier than lighter DRY boxes', () => {
    const imbalanced = injectStarboardImbalance(
      createInitialPortContainers(),
      180,
    ).containers;
    const balanced = computeBalancedStowPlan(imbalanced);
    const hazmat = balanced.filter((c) => c.kind === 'hazmat-imo3');
    const dry = balanced.filter((c) => c.kind === 'dry-40');
    const avgHazmatTier =
      hazmat.reduce((sum, c) => sum + c.tier, 0) / hazmat.length;
    const avgDryTier = dry.reduce((sum, c) => sum + c.tier, 0) / dry.length;
    expect(avgHazmatTier).toBeLessThanOrEqual(avgDryTier);
  });

  it('18. computeBalancedStowPlan enforces physical stacking gravity with zero floating boxes', () => {
    const imbalanced = injectStarboardImbalance(
      createInitialPortContainers(),
      210,
    ).containers;
    const balanced = computeBalancedStowPlan(imbalanced);
    const occupied = new Set(balanced.map((c) => slotKey(c.bay, c.col, c.tier)));
    expect(occupied.size).toBe(balanced.length);
    for (const c of balanced) {
      if (c.tier > 0) {
        expect(occupied.has(slotKey(c.bay, c.col, c.tier - 1))).toBe(true);
      }
    }
  });

  it('19. computeBalancedStowPlan handles odd container counts cleanly with < 0.5 deg heel', () => {
    const oddSet = [
      ...createInitialPortContainers(),
      createPortContainer('hazmat-imo3', 3, 4, 1, 901),
    ];
    expect(oddSet.length % 2).toBe(1);
    const balanced = computeBalancedStowPlan(oddSet);
    const report = computeVesselStability(balanced);
    expect(report.absHeelAngleDeg).toBeLessThan(0.5);
    expect(report.gmMeters).toBeGreaterThan(1.8);
  });

  it('20. computeBalancedStowPlan returns empty array for empty input', () => {
    expect(computeBalancedStowPlan([])).toEqual([]);
  });

  it('21. findNextOpenSlot picks lowest free tier for a direct raycasted (bay, col)', () => {
    const initial = createInitialPortContainers();
    // Bay 0, Col 0 has tier 0 occupied in initial layout -> next must be tier 1
    const slot = findNextOpenSlot(initial, [], 0, 0);
    expect(slot).toEqual({ bay: 0, col: 0, tier: 1 });
  });

  it('22. findNextOpenSlot returns null when clicked bay/col column is full (4 tiers)', () => {
    const fullColumn: PortContainer[] = [0, 1, 2, 3].map((tier) =>
      createPortContainer('dry-40', 2, 3, tier, tier + 1),
    );
    expect(findNextOpenSlot(fullColumn, [], 2, 3)).toBeNull();
  });

  it('23. findNextOpenSlot avoids slots already reserved in crane queues', () => {
    const initial = createInitialPortContainers();
    const reserved = [{ bay: 0, col: 0, tier: 1 }];
    const slot = findNextOpenSlot(initial, reserved, 0, 0);
    expect(slot).toEqual({ bay: 0, col: 0, tier: 2 });
  });

  it('24. findNextOpenSlot automatically chooses a balanced low-tier open slot when no preference given', () => {
    const initial = createInitialPortContainers();
    const slot = findNextOpenSlot(initial);
    expect(slot).not.toBeNull();
    expect(slot!.tier).toBe(1);
  });

  it('25. maps vessel local coordinates to world coordinates with SHIP_CENTER_X offset', () => {
    const local = getSlotLocalPosition(1, 2, 0);
    const world = getSlotWorldPosition(1, 2, 0);
    expect(local.x).toBe(0);
    expect(world.x).toBeCloseTo(SHIP_CENTER_X, 2);
    expect(world.y).toBe(local.y);
    expect(world.z).toBe(local.z);
  });

  it('26. dispatches forward bays (0, 1) to STS Crane 0 and aft bays (2, 3) to STS Crane 1', () => {
    expect(getCraneIndexForBay(0)).toBe(0);
    expect(getCraneIndexForBay(1)).toBe(0);
    expect(getCraneIndexForBay(2)).toBe(1);
    expect(getCraneIndexForBay(3)).toBe(1);
  });

  it('27. initializes STS Gantry Crane in IDLE state at home Z rail and safe hoist height', () => {
    const crane0 = createInitialCraneState(0);
    const crane1 = createInitialCraneState(1);
    expect(crane0.phase).toBe('IDLE');
    expect(crane0.gantryZ).toBe(CRANE_HOME_Z[0]);
    expect(crane0.spreaderY).toBe(CRANE_SAFE_HOIST_Y);
    expect(crane0.carryingContainer).toBeNull();
    expect(crane1.gantryZ).toBe(CRANE_HOME_Z[1]);
  });

  it('28. executes complete 8-phase STS Crane sequence and emits placedContainer exactly once', () => {
    let crane = createInitialCraneState(0);
    const targetBox = createPortContainer('reefer-40', 1, 3, 1, 42);
    crane = enqueueCraneJob(crane, targetBox);

    const visitedPhases: CranePhase[] = ['IDLE', crane.phase];
    const placed: PortContainer[] = [];

    // Step at 60fps (1/60s) for up to 10 seconds
    for (let step = 0; step < 600; step++) {
      const res = stepCraneState(crane, 1 / 60);
      crane = res.nextState;
      if (visitedPhases[visitedPhases.length - 1] !== crane.phase) {
        visitedPhases.push(crane.phase);
      }
      if (res.placedContainer) {
        placed.push(res.placedContainer);
      }
      if (crane.phase === 'IDLE' && placed.length > 0) {
        break;
      }
    }

    // Must visit every single phase in CRANE_PHASE_ORDER and return to IDLE
    expect(visitedPhases).toEqual([...CRANE_PHASE_ORDER, 'IDLE']);
    expect(placed).toHaveLength(1);
    expect(placed[0].id).toBe(targetBox.id);
    expect(crane.completedLifts).toBe(1);
    expect(crane.carryingContainer).toBeNull();
    expect(crane.attachedContainerPos).toBeNull();
  });

  it('29. tracks spreader height, trolley X, twist-lock latch, sway, and attached container during HOIST & TROLLEY_OVER_BAY', () => {
    let crane = createInitialCraneState(0);
    const targetBox = createPortContainer('hazmat-imo3', 0, 4, 0, 77);
    crane = enqueueCraneJob(crane, targetBox);

    let sawHoistCarried = false;
    let sawTrolleyMoveAndSway = false;
    let maxTrolleyX = QUAY_PICKUP_X;

    for (let i = 0; i < 400; i++) {
      const res = stepCraneState(crane, 1 / 60);
      crane = res.nextState;
      if (crane.phase === 'HOIST' && crane.carryingContainer) {
        sawHoistCarried = true;
        expect(crane.twistLockEngaged).toBe(true);
        expect(crane.attachedContainerPos).not.toBeNull();
      }
      if (crane.phase === 'TROLLEY_OVER_BAY') {
        maxTrolleyX = Math.max(maxTrolleyX, crane.trolleyX);
        if (Math.abs(crane.swayRad) > 0.01 && crane.attachedContainerPos) {
          sawTrolleyMoveAndSway = true;
        }
      }
    }

    expect(sawHoistCarried).toBe(true);
    expect(sawTrolleyMoveAndSway).toBe(true);
    expect(maxTrolleyX).toBeGreaterThan(SHIP_CENTER_X);
  });

  it('30. processes multi-container FIFO crane queues sequentially without dropping lifts', () => {
    let crane = createInitialCraneState(1);
    const first = createPortContainer('dry-40', 2, 1, 1, 101);
    const second = createPortContainer('reefer-40', 3, 3, 1, 102);
    crane = enqueueCraneJob(crane, first);
    crane = enqueueCraneJob(crane, second);
    expect(crane.queue).toHaveLength(1);

    const placedIds: string[] = [];
    for (let i = 0; i < 900; i++) {
      const res = stepCraneState(crane, 1 / 60);
      crane = res.nextState;
      if (res.placedContainer) placedIds.push(res.placedContainer.id);
      if (crane.phase === 'IDLE' && placedIds.length === 2) break;
    }

    expect(placedIds).toEqual([first.id, second.id]);
    expect(crane.completedLifts).toBe(2);
    expect(crane.queue).toHaveLength(0);
  });

  it('31. sampleOceanWaveMotion amplifies swell height, heave, roll, and wind in SUEZ STORM SEA mode', () => {
    let maxCalmHeave = 0;
    let maxStormHeave = 0;
    let maxCalmRoll = 0;
    let maxStormRoll = 0;
    for (let t = 0; t < 10; t += 0.2) {
      const calm = sampleOceanWaveMotion(t, 'calm');
      const storm = sampleOceanWaveMotion(t, 'storm');
      maxCalmHeave = Math.max(maxCalmHeave, Math.abs(calm.heaveY));
      maxStormHeave = Math.max(maxStormHeave, Math.abs(storm.heaveY));
      maxCalmRoll = Math.max(maxCalmRoll, Math.abs(calm.waveRollRad));
      maxStormRoll = Math.max(maxStormRoll, Math.abs(storm.waveRollRad));
      expect(storm.waveHeightM).toBeGreaterThan(calm.waveHeightM * 4);
      expect(storm.windKnots).toBeGreaterThan(calm.windKnots * 3);
    }
    expect(maxStormHeave).toBeGreaterThan(maxCalmHeave * 3);
    expect(maxStormRoll).toBeGreaterThan(maxCalmRoll * 5);
  });

  it('32. camera presets and cubic easing produce distinct, bounded, smooth interpolation values', () => {
    const quay = getCameraPresetPose('quay-overview');
    const cabin = getCameraPresetPose('crane-cabin');
    const bow = getCameraPresetPose('vessel-bow');
    expect(Object.keys(CAMERA_PRESETS)).toHaveLength(3);
    expect(quay.position).not.toEqual(cabin.position);
    expect(cabin.position).not.toEqual(bow.position);
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 5);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(-0.2)).toBe(0);
    expect(easeInOutCubic(1.5)).toBe(1);
  });
});
