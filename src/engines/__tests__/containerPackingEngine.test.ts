import { describe, expect, it } from 'vitest';
import type { CargoSkuItem } from '../../types/logistics';
import {
  computeMaxCartonsInSingleContainer,
  CONTAINER_LIST,
  CONTAINER_SPECS,
  evaluateSolasVgmCompliance,
  optimizeContainerLoad,
  STUFFING_PRESETS,
} from '../containerPackingEngine';

const SAMPLE_SKU: CargoSkuItem = {
  id: 'sku-a',
  skuCode: 'SKU-A',
  name: 'Standard Export Carton',
  lengthCm: 100,
  widthCm: 100,
  heightCm: 100,
  weightKg: 250,
  qty: 10,
  stackable: true,
  color: '#0ea5e9',
};

describe('Container Load & Carton Stuffing Optimizer (src/engines/containerPackingEngine.ts)', () => {
  it('exposes all 4 required ISO container specs with authentic dimensions and payloads', () => {
    expect(CONTAINER_LIST).toHaveLength(4);
    expect(CONTAINER_SPECS['20ft-std'].internalVolumeCbm).toBeCloseTo(33.1, 1);
    expect(CONTAINER_SPECS['40ft-std'].internalVolumeCbm).toBeCloseTo(67.6, 1);
    expect(CONTAINER_SPECS['40ft-hc'].innerHeightCm).toBe(269);
    expect(CONTAINER_SPECS['40ft-reefer'].isReefer).toBe(true);
    expect(CONTAINER_SPECS['40ft-reefer'].innerHeightCm).toBeLessThan(
      CONTAINER_SPECS['40ft-std'].innerHeightCm,
    );
  });

  it('computes exact max cartons per single 20ft container respecting geometry and layers', () => {
    // 20ft inner: 589 x 235 x 239 cm -> 5 x 2 x 2 = 20 cubes of 100x100x100 cm
    const maxStackable = computeMaxCartonsInSingleContainer(
      CONTAINER_SPECS['20ft-std'],
      SAMPLE_SKU,
    );
    expect(maxStackable).toBe(20);
  });

  it('enforces single-layer floor limit when carton is marked non-stackable', () => {
    const maxNonStack = computeMaxCartonsInSingleContainer(
      CONTAINER_SPECS['20ft-std'],
      { ...SAMPLE_SKU, stackable: false },
    );
    // 5 x 2 x 1 = 10 cartons max on floor
    expect(maxNonStack).toBe(10);
  });

  it('chooses superior horizontal rotation (L x W vs W x L) to maximize floor capacity', () => {
    // 20ft inner: 589 x 235 cm. Box: 115 x 55 x 200 cm (1 layer)
    // Orient A (115 along L, 55 along W): floor(589/115)=5 * floor(235/55)=4 => 20
    // Orient B (55 along L, 115 along W): floor(589/55)=10 * floor(235/115)=2 => 20
    // Box 230 x 110 x 200 cm:
    // Orient A (230 along L, 110 along W): 2 * 2 = 4
    // Orient B (110 along L, 230 along W): 5 * 1 = 5 (superior!)
    const maxRotated = computeMaxCartonsInSingleContainer(
      CONTAINER_SPECS['20ft-std'],
      {
        ...SAMPLE_SKU,
        lengthCm: 230,
        widthCm: 110,
        heightCm: 200,
        weightKg: 50,
      },
    );
    expect(maxRotated).toBe(5);
  });

  it('caps single-container capacity by max payload weight for dense heavy cargo', () => {
    // 20ft maxPayload = 28,200 kg -> 5,000 kg steel blocks => max 5 blocks
    const maxHeavy = computeMaxCartonsInSingleContainer(
      CONTAINER_SPECS['20ft-std'],
      {
        ...SAMPLE_SKU,
        lengthCm: 60,
        widthCm: 60,
        heightCm: 60,
        weightKg: 5000,
      },
    );
    expect(maxHeavy).toBe(5);
  });

  it('guarantees zero 3D box overlaps and strict internal container bounds for mixed multi-SKU presets', () => {
    const preset = STUFFING_PRESETS[0];
    const res = optimizeContainerLoad(preset.containerType, preset.skus);
    expect(res.totalLoadedCartons).toBe(
      preset.skus.reduce((s, item) => s + item.qty, 0),
    );
    expect(res.unfitCartons).toBe(0);
    expect(res.containersRequired).toBeGreaterThanOrEqual(1);

    for (const bay of res.containers) {
      const boxes = bay.placedBoxes;
      for (let i = 0; i < boxes.length; i += 1) {
        const a = boxes[i];
        expect(a.x).toBeGreaterThanOrEqual(0);
        expect(a.y).toBeGreaterThanOrEqual(0);
        expect(a.z).toBeGreaterThanOrEqual(0);
        expect(a.x + a.l).toBeLessThanOrEqual(res.container.innerLengthCm);
        expect(a.y + a.w).toBeLessThanOrEqual(res.container.innerWidthCm);
        expect(a.z + a.h).toBeLessThanOrEqual(res.container.innerHeightCm);

        for (let j = i + 1; j < boxes.length; j += 1) {
          const b = boxes[j];
          const overlapX = a.x < b.x + b.l && a.x + a.l > b.x;
          const overlapY = a.y < b.y + b.w && a.y + a.w > b.y;
          const overlapZ = a.z < b.z + b.h && a.z + a.h > b.z;
          expect(overlapX && overlapY && overlapZ).toBe(false);
        }
      }
    }
  });

  it('never places another carton above a non-stackable carton', () => {
    const res = optimizeContainerLoad('20ft-std', [
      { ...SAMPLE_SKU, id: 'ns', skuCode: 'NS', stackable: false, qty: 8 },
      { ...SAMPLE_SKU, id: 'st', skuCode: 'ST', stackable: true, qty: 8 },
    ]);
    for (const bay of res.containers) {
      for (const box of bay.placedBoxes) {
        if (!box.stackable) {
          const placedAbove = bay.placedBoxes.some(
            (other) =>
              other.id !== box.id &&
              other.z >= box.z + box.h &&
              other.x < box.x + box.l &&
              other.x + other.l > box.x &&
              other.y < box.y + box.w &&
              other.y + other.w > box.y,
          );
          expect(placedAbove).toBe(false);
        }
      }
    }
  });

  it('automatically allocates a second container when geometric volume exceeds one container', () => {
    const res = optimizeContainerLoad('20ft-std', [
      { ...SAMPLE_SKU, qty: 26 }, // 20 fit in 1x20ft, 6 overflow to container #2
    ]);
    expect(res.containersRequired).toBe(2);
    expect(res.containers[0].cartonCount).toBe(20);
    expect(res.containers[1].cartonCount).toBe(6);
    expect(res.totalLoadedCartons).toBe(26);
  });

  it('automatically allocates multiple containers and flags payload-bound when weight exceeds maxPayloadKg', () => {
    // 20ft maxPayload = 28,200 kg. 12 boxes x 3,000 kg = 36,000 kg -> needs 2 containers (max 9 in container 1)
    const res = optimizeContainerLoad('20ft-std', [
      {
        ...SAMPLE_SKU,
        lengthCm: 80,
        widthCm: 80,
        heightCm: 80,
        weightKg: 3000,
        qty: 12,
      },
    ]);
    expect(res.containersRequired).toBe(2);
    expect(res.containers[0].usedWeightKg).toBeLessThanOrEqual(
      CONTAINER_SPECS['20ft-std'].maxPayloadKg,
    );
    expect(res.limitingFactor).toBe('payload');
  });

  it('detects oversize cartons exceeding internal container height and reports them as unfit', () => {
    const res = optimizeContainerLoad('40ft-reefer', [
      {
        ...SAMPLE_SKU,
        heightCm: 250, // exceeds 40ft-reefer 225 cm internal height
        qty: 5,
      },
    ]);
    expect(res.totalLoadedCartons).toBe(0);
    expect(res.unfitCartons).toBe(5);
    expect(res.limitingFactor).toBe('dimensions');
  });

  it('calculates higher volume utilization in 40ft High Cube when tall 130cm cartons double-stack cleanly', () => {
    const tallSkus: CargoSkuItem[] = [
      {
        ...SAMPLE_SKU,
        lengthCm: 115,
        widthCm: 110,
        heightCm: 130, // 2 layers = 260 cm -> fits in 40'HC (269 cm) but NOT 40'GP (239 cm)!
        weightKg: 400,
        qty: 30,
        stackable: true,
      },
    ];
    const std40 = optimizeContainerLoad('40ft-std', tallSkus);
    const hc40 = optimizeContainerLoad('40ft-hc', tallSkus);
    expect(std40.containersRequired).toBe(2);
    expect(hc40.containersRequired).toBe(1);
  });

  it('computes accurate longitudinal Center of Gravity (CoG) percentage and nose-heavy detection', () => {
    // Loading just 2 cartons at nose (x=0..100 of 1203cm container) => CoG near 4.2% -> nose-heavy
    const res = optimizeContainerLoad('40ft-hc', [{ ...SAMPLE_SKU, qty: 2 }]);
    expect(res.centerOfGravityPct).toBeLessThan(15);
    expect(res.balanceStatus).toBe('nose-heavy');
  });

  it('calculates per-SKU volume shares summing to ~100% across multi-SKU loads', () => {
    const res = optimizeContainerLoad(
      STUFFING_PRESETS[1].containerType,
      STUFFING_PRESETS[1].skus,
    );
    const shareSum = res.skuBreakdown.reduce(
      (sum, item) => sum + item.volumeSharePct,
      0,
    );
    expect(shareSum).toBeCloseTo(100, 0);
    expect(res.volumeUtilizationPct).toBeGreaterThan(0);
    expect(res.volumeUtilizationPct).toBeLessThanOrEqual(100);
  });

  it('sanitizes zero or negative SKU dimensions and quantities without NaN', () => {
    const res = optimizeContainerLoad('20ft-std', [
      {
        ...SAMPLE_SKU,
        lengthCm: -20,
        widthCm: 0,
        heightCm: -5,
        weightKg: -10,
        qty: 0,
      },
    ]);
    expect(Number.isFinite(res.volumeUtilizationPct)).toBe(true);
    expect(Number.isFinite(res.payloadUtilizationPct)).toBe(true);
    expect(res.totalLoadedCartons).toBe(0);
  });

  it('computes 3D Center-of-Gravity (CG X/Y/Z %) and front/rear axle weight shares summing to 100%', () => {
    const preset = STUFFING_PRESETS[0];
    const res = optimizeContainerLoad(preset.containerType, preset.skus);
    expect(res.cgXPct).toBeGreaterThan(36);
    expect(res.cgXPct).toBeLessThan(64);
    expect(res.cgYPct).toBeGreaterThan(38);
    expect(res.cgYPct).toBeLessThan(62);
    expect(res.cgZPct).toBeGreaterThan(15);
    expect(res.cgZPct).toBeLessThanOrEqual(58);
    expect(res.frontAxleSharePct + res.rearAxleSharePct).toBeCloseTo(100, 1);
    expect(res.solasVgmCompliant).toBe(true);
    expect(res.solasViolations).toEqual([]);
  });

  it('calculates exact SOLAS e-VGM Gross Mass (Tare + Cargo) and CSC Max Gross Mass', () => {
    const res = optimizeContainerLoad('20ft-std', [{ ...SAMPLE_SKU, qty: 20 }]);
    const spec = CONTAINER_SPECS['20ft-std'];
    expect(res.vgmGrossKg).toBe(spec.tareWeightKg + 20 * 250);
    expect(res.maxGrossSolasKg).toBe(spec.tareWeightKg + spec.maxPayloadKg);
    expect(res.solasVgmCompliant).toBe(true);
  });

  it('flags SOLAS VGM FAIL with LONGITUDINAL_IMBALANCE when cargo is clustered at container nose', () => {
    const res = optimizeContainerLoad('40ft-hc', [{ ...SAMPLE_SKU, qty: 2 }]);
    expect(res.cgXPct).toBeLessThan(36);
    expect(res.solasVgmCompliant).toBe(false);
    expect(res.solasViolations).toContain('LONGITUDINAL_IMBALANCE');
    expect(res.frontAxleSharePct).toBeGreaterThan(80);
  });

  it('rejects SOLAS VGM compliance with OVERWEIGHT_PAYLOAD when cargo weight exceeds container maxPayloadKg', () => {
    const spec = CONTAINER_SPECS['20ft-std'];
    const audit = evaluateSolasVgmCompliance({
      container: spec,
      usedWeightKg: spec.maxPayloadKg + 500,
      cgXPct: 50,
      cgYPct: 50,
      cgZPct: 40,
      cartonCount: 20,
    });
    expect(audit.solasVgmCompliant).toBe(false);
    expect(audit.solasViolations).toContain('OVERWEIGHT_PAYLOAD');
    expect(audit.vgmGrossKg).toBeGreaterThan(audit.maxGrossSolasKg);
  });

  it('flags HIGH_VERTICAL_CG and LATERAL_IMBALANCE violations in SOLAS CTU stability check', () => {
    const spec = CONTAINER_SPECS['40ft-hc'];
    const audit = evaluateSolasVgmCompliance({
      container: spec,
      usedWeightKg: 12000,
      cgXPct: 50,
      cgYPct: 28,
      cgZPct: 64,
      cartonCount: 16,
    });
    expect(audit.solasVgmCompliant).toBe(false);
    expect(audit.solasViolations).toContain('LATERAL_IMBALANCE');
    expect(audit.solasViolations).toContain('HIGH_VERTICAL_CG');
  });
});
