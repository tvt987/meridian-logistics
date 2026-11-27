import { describe, expect, it } from 'vitest';
import { FX_USD_TO_VND, SHIPPING_CORRIDORS, VIETQR_CONFIG } from '../../data/corridors';
import { PRELOADED_WAYBILLS } from '../../data/waybills';
import type { FreightQuoteInput } from '../../types/logistics';
import {
  calculateFreightQuote,
  formatCountdown,
  formatMoney,
  getVolumetricDivisor,
} from '../freight';
import { buildVietQrPayload, computeCrc16Ccitt, generateQrMatrix } from '../vietQr';
import {
  buildCsvManifestWithBom,
  createBookedWaybill,
  filterWaybills,
  generateWaybillId,
  UTF8_BOM,
} from '../waybillEngine';

const BASE_INPUT: FreightQuoteInput = {
  corridorId: 'vn-eu-sea',
  mode: 'air-express',
  lengthCm: 120,
  widthCm: 80,
  heightCm: 95,
  grossWeightKg: 95,
  packages: 6,
  declaredValueUsd: 50000,
  incoterm: 'FOB',
  customsClearance: false,
  cargoInsurance: false,
  reeferMonitoring: false,
};

describe('Volumetric Weight & CBM Calculations (src/engines/freight.ts)', () => {
  it('computes exact total volume in CBM from L x W x H x packages', () => {
    const q = calculateFreightQuote(BASE_INPUT);
    // 120 * 80 * 95 * 6 / 1_000_000 = 5.472 CBM
    expect(q.totalVolumeCbm).toBe(5.472);
    expect(q.totalGrossWeightKg).toBe(570);
  });

  it('uses IATA divisor 6000 for Air Express and picks volumetric weight when greater than gross', () => {
    expect(getVolumetricDivisor('air-express')).toBe(6000);
    const q = calculateFreightQuote({ ...BASE_INPUT, mode: 'air-express' });
    // 5,472,000 / 6000 = 912 kg > 570 kg gross
    expect(q.volumetricDivisor).toBe(6000);
    expect(q.volumetricWeightKg).toBe(912);
    expect(q.chargeableWeightKg).toBe(912);
    expect(q.governingMetric).toBe('volumetric');
  });

  it('uses divisor 5000 for Air Standard yielding higher volumetric weight than 6000', () => {
    expect(getVolumetricDivisor('air-standard')).toBe(5000);
    const qExpress = calculateFreightQuote({ ...BASE_INPUT, mode: 'air-express' });
    const qStd = calculateFreightQuote({ ...BASE_INPUT, mode: 'air-standard' });
    // 5,472,000 / 5000 = 1094.4 kg -> ceil = 1095 kg
    expect(qStd.volumetricWeightKg).toBe(1094.4);
    expect(qStd.chargeableWeightKg).toBe(1095);
    expect(qStd.volumetricWeightKg).toBeGreaterThan(qExpress.volumetricWeightKg);
  });

  it('selects actual gross weight as chargeable basis when dense cargo exceeds volumetric weight', () => {
    const dense = calculateFreightQuote({
      ...BASE_INPUT,
      mode: 'air-express',
      lengthCm: 40,
      widthCm: 40,
      heightCm: 40,
      grossWeightKg: 80,
      packages: 4,
    });
    // Volumetric = 40*40*40*4 / 6000 = 42.67 kg vs Gross = 320 kg
    expect(dense.governingMetric).toBe('actual');
    expect(dense.chargeableWeightKg).toBe(320);
  });

  it('applies Road FTL divisor 4000 correctly', () => {
    expect(getVolumetricDivisor('road-ftl')).toBe(4000);
    const road = calculateFreightQuote({
      ...BASE_INPUT,
      mode: 'road-ftl',
      lengthCm: 100,
      widthCm: 100,
      heightCm: 80,
      grossWeightKg: 100,
      packages: 2,
    });
    // 1,600,000 / 4000 = 400 kg > 200 kg gross
    expect(road.volumetricWeightKg).toBe(400);
    expect(road.chargeableWeightKg).toBe(400);
    expect(road.transitDaysMin).toBe(4);
    expect(road.transitDaysMax).toBe(6);
  });

  it('enforces minimum 1.0 CBM W/M revenue ton for small Sea LCL shipments', () => {
    const tinyLcl = calculateFreightQuote({
      ...BASE_INPUT,
      mode: 'sea-lcl',
      lengthCm: 50,
      widthCm: 40,
      heightCm: 30,
      grossWeightKg: 25,
      packages: 2,
    });
    expect(tinyLcl.totalVolumeCbm).toBe(0.12);
    expect(tinyLcl.revenueTonsCbm).toBe(1);
    expect(tinyLcl.governingMetric).toBe('cbm');
    expect(tinyLcl.baseFreightUsd).toBeGreaterThanOrEqual(165);
  });

  it('bills Sea LCL by weight-ton when heavy cargo exceeds CBM volume (W/M rule)', () => {
    const heavyLcl = calculateFreightQuote({
      ...BASE_INPUT,
      mode: 'sea-lcl',
      lengthCm: 100,
      widthCm: 100,
      heightCm: 50,
      grossWeightKg: 2200,
      packages: 2,
    });
    // Volume = 1.0 CBM, Weight = 4,400 kg = 4.4 revenue tons
    expect(heavyLcl.totalVolumeCbm).toBe(1);
    expect(heavyLcl.revenueTonsCbm).toBe(4.4);
    expect(heavyLcl.chargeableWeightKg).toBe(4400);
  });

  it('scales Sea FCL 20ft container count automatically when volume exceeds 33.2 CBM', () => {
    const multi20 = calculateFreightQuote({
      ...BASE_INPUT,
      mode: 'sea-fcl-20',
      lengthCm: 120,
      widthCm: 100,
      heightCm: 150,
      grossWeightKg: 500,
      packages: 25, // 45 CBM -> requires 2 x 20ft containers
    });
    expect(multi20.totalVolumeCbm).toBe(45);
    expect(multi20.containersRequired).toBe(2);
    expect(multi20.governingMetric).toBe('container');
    expect(multi20.containerUtilizationPct).toBe(Math.round((45 / 66.4) * 100));
  });

  it('scales Sea FCL 40ft HC container count by payload when weight exceeds 28,800 kg', () => {
    const heavy40 = calculateFreightQuote({
      ...BASE_INPUT,
      mode: 'sea-fcl-40',
      lengthCm: 100,
      widthCm: 100,
      heightCm: 100,
      grossWeightKg: 2000,
      packages: 16, // 16 CBM, 32,000 kg -> 2 x 40ft containers due to weight limit
    });
    expect(heavy40.containersRequired).toBe(2);
    expect(heavy40.baseFreightUsd).toBe(
      SHIPPING_CORRIDORS[0].baseRateFcl40Usd * 2,
    );
  });
});

describe('Incoterms 2020, Insurance, Reefer & Currency Math', () => {
  it('excludes duties and optional insurance under FOB when add-ons are disabled', () => {
    const fob = calculateFreightQuote({
      ...BASE_INPUT,
      incoterm: 'FOB',
      customsClearance: false,
      cargoInsurance: false,
    });
    expect(fob.customsBrokerageUsd).toBe(0);
    expect(fob.importDutiesUsd).toBe(0);
    expect(fob.insuranceUsd).toBe(0);
  });

  it('automatically mandates all-risk cargo insurance under CIF (0.45% declared value, min $45)', () => {
    const cifHigh = calculateFreightQuote({
      ...BASE_INPUT,
      incoterm: 'CIF',
      declaredValueUsd: 100000,
      cargoInsurance: false,
    });
    expect(cifHigh.insuranceUsd).toBe(450);

    const cifLow = calculateFreightQuote({
      ...BASE_INPUT,
      incoterm: 'CIF',
      declaredValueUsd: 2000,
      cargoInsurance: false,
    });
    expect(cifLow.insuranceUsd).toBe(45);
  });

  it('includes destination customs brokerage, 4.5% duties + $220 drayage, and insurance under DDP', () => {
    const ddp = calculateFreightQuote({
      ...BASE_INPUT,
      incoterm: 'DDP',
      declaredValueUsd: 40000,
      customsClearance: false,
      cargoInsurance: false,
    });
    expect(ddp.customsBrokerageUsd).toBe(285);
    expect(ddp.importDutiesUsd).toBe(40000 * 0.045 + 220);
    expect(ddp.insuranceUsd).toBe(180);
  });

  it('adds 18% base freight + $65 telemetry fee when active reefer monitoring is enabled', () => {
    const dry = calculateFreightQuote({ ...BASE_INPUT, reeferMonitoring: false });
    const reefer = calculateFreightQuote({ ...BASE_INPUT, reeferMonitoring: true });
    expect(dry.reeferSurchargeUsd).toBe(0);
    expect(reefer.reeferSurchargeUsd).toBeCloseTo(
      dry.baseFreightUsd * 0.18 + 65,
      2,
    );
    expect(reefer.totalUsd).toBeCloseTo(
      dry.totalUsd + reefer.reeferSurchargeUsd,
      2,
    );
  });

  it('sums itemized charges accurately and computes VND & 20% VietQR deposit correctly', () => {
    const q = calculateFreightQuote({
      ...BASE_INPUT,
      incoterm: 'DDP',
      reeferMonitoring: true,
    });
    const manualSum =
      q.baseFreightUsd +
      q.fuelSurchargeUsd +
      q.terminalHandlingUsd +
      q.customsBrokerageUsd +
      q.importDutiesUsd +
      q.insuranceUsd +
      q.reeferSurchargeUsd;
    expect(q.totalUsd).toBeCloseTo(manualSum, 2);
    expect(q.totalVnd).toBe(Math.round(q.totalUsd * FX_USD_TO_VND));
    expect(q.depositVnd).toBe(
      Math.round(q.totalVnd * VIETQR_CONFIG.depositRatio),
    );
  });

  it('estimates dramatically lower CO2e carbon emissions for ocean FCL than air freight', () => {
    const air = calculateFreightQuote({ ...BASE_INPUT, mode: 'air-express' });
    const sea = calculateFreightQuote({ ...BASE_INPUT, mode: 'sea-fcl-20' });
    expect(air.estimatedCo2Kg).toBeGreaterThan(sea.estimatedCo2Kg * 20);
  });

  it('formats USD, VND currency strings and ETA countdown timers cleanly', () => {
    expect(formatMoney(1250.5, 'USD')).toBe('$1,250.50');
    expect(formatMoney(100, 'VND')).toContain('₫');
    expect(formatCountdown(90061)).toBe('1d 01h 01m 01s');
    expect(formatCountdown(3665)).toBe('01h 01m 05s');
    expect(formatCountdown(-15)).toBe('00h 00m 00s');
  });

  it('sanitizes zero or negative dimension inputs safely without NaN', () => {
    const q = calculateFreightQuote({
      ...BASE_INPUT,
      lengthCm: -50,
      widthCm: 0,
      heightCm: 0,
      grossWeightKg: -10,
      packages: 0,
      declaredValueUsd: 0,
    });
    expect(Number.isFinite(q.totalUsd)).toBe(true);
    expect(q.totalUsd).toBeGreaterThan(0);
    expect(q.totalVolumeCbm).toBeGreaterThan(0);
  });
});

describe('Techcombank VietQR EMVCo & Offline QR Matrix (src/engines/vietQr.ts)', () => {
  it('computes known standard CRC-16/CCITT-FALSE check value (0x29B1 for "123456789")', () => {
    expect(computeCrc16Ccitt('123456789')).toBe('29B1');
  });

  it('encodes Techcombank BIN 970407, account 19077742964012, VND 704 and valid CRC', () => {
    const payload = buildVietQrPayload(12500000, 'MRD-88412 MERIDIAN');
    expect(payload).toContain('970407');
    expect(payload).toContain('19077742964012');
    expect(payload).toContain('A000000727');
    expect(payload).toContain('5303704');
    expect(payload).toContain('540812500000');
    expect(payload).toContain('MRD-88412 MERIDIAN');
    const body = payload.slice(0, -4);
    const crc = payload.slice(-4);
    expect(computeCrc16Ccitt(body)).toBe(crc);
  });

  it('generates an offline square boolean QR matrix synchronously', () => {
    const payload = buildVietQrPayload(5000000, 'MRD-90215');
    const matrix = generateQrMatrix(payload);
    expect(matrix.size).toBeGreaterThan(20);
    expect(matrix.modules.length).toBe(matrix.size * matrix.size);
    expect(matrix.modules.some(Boolean)).toBe(true);
  });
});

describe('Waybill Tracker, Booking Persistence & UTF-8 BOM CSV Export (src/engines/waybillEngine.ts)', () => {
  it('ships 5 realistic preloaded waybills each with 6 chronological milestones', () => {
    expect(PRELOADED_WAYBILLS.length).toBe(5);
    expect(PRELOADED_WAYBILLS.map((w) => w.id)).toContain('MRD-88412');
    expect(PRELOADED_WAYBILLS.map((w) => w.id)).toContain('MRD-90215');
    for (const wb of PRELOADED_WAYBILLS) {
      expect(wb.stages.length).toBe(6);
      expect(wb.currentStage).toBeGreaterThanOrEqual(1);
      expect(wb.currentStage).toBeLessThanOrEqual(6);
    }
  });

  it('filters waybills by ID, port UN/LOCODE, container, or company case-insensitively', () => {
    expect(filterWaybills(PRELOADED_WAYBILLS, 'mrd-88412')).toHaveLength(1);
    expect(filterWaybills(PRELOADED_WAYBILLS, 'NLRTM').length).toBeGreaterThanOrEqual(2);
    expect(filterWaybills(PRELOADED_WAYBILLS, 'Bavaria')).toHaveLength(1);
    expect(filterWaybills(PRELOADED_WAYBILLS, 'NONEXISTENT-999')).toHaveLength(0);
    expect(filterWaybills(PRELOADED_WAYBILLS, '')).toHaveLength(5);
  });

  it('creates a unique newly booked Waybill with 6 stages and Air AWB prefix for air mode', () => {
    const airInput: FreightQuoteInput = {
      ...BASE_INPUT,
      corridorId: 'vn-de-air',
      mode: 'air-express',
      incoterm: 'DDP',
      reeferMonitoring: true,
    };
    const quote = calculateFreightQuote(airInput);
    const existing = new Set(PRELOADED_WAYBILLS.map((w) => w.id));
    const booked = createBookedWaybill(
      airInput,
      quote,
      {
        shipperName: 'Truong Van Tinh',
        shipperCompany: 'TVT Tech Export',
        contactEmail: 'tinhkun102@gmail.com',
        consigneeName: 'Elena Weber',
        consigneeCompany: 'Rhine Systems AG',
        commodity: 'Edge AI Vision Modules',
        hsCode: '8542.31',
      },
      existing,
      new Date('2026-11-27T01:00:00Z'),
    );
    expect(booked.id).toMatch(/^MRD-\d{5}$/);
    expect(existing.has(booked.id)).toBe(false);
    expect(booked.blNumber).toContain('MRD-AWB-176-');
    expect(booked.isUserBooked).toBe(true);
    expect(booked.stages).toHaveLength(6);
    expect(booked.totalFreightUsd).toBe(quote.totalUsd);
    expect(booked.reeferTempC).not.toBeNull();
  });

  it('generates collision-free waybill IDs even when existing set is populated', () => {
    const existing = new Set(['MRD-88412', 'MRD-90215']);
    const id = generateWaybillId(existing);
    expect(id).toMatch(/^MRD-\d{5}$/);
    expect(existing.has(id)).toBe(false);
  });

  it('exports UTF-8 BOM prefixed CSV manifest with proper quoting and formula-injection guard', () => {
    const poisoned = {
      ...PRELOADED_WAYBILLS[0],
      commodityVi: '=CMD("danger"), Hàng "Đặc biệt"',
    };
    const csv = buildCsvManifestWithBom([poisoned, PRELOADED_WAYBILLS[1]]);
    expect(csv.startsWith(UTF8_BOM)).toBe(true);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('Waybill ID,B/L or AWB Number');
    expect(csv).toContain('MRD-88412');
    expect(csv).toContain('MRD-90215');
    // Formula neutralized with leading single quote and inner quotes doubled per RFC 4180
    expect(csv).toContain(`"'=CMD(""danger""), Hàng ""Đặc biệt"""`);
  });

  it('persists newly booked waybills into localStorage and reloads them alongside preloaded records', async () => {
    const store = new Map<string, string>();
    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        localStorage: {
          getItem: (k: string) => store.get(k) ?? null,
          setItem: (k: string, v: string) => {
            store.set(k, v);
          },
        },
      },
    });
    try {
      const { loadStoredWaybills, saveWaybills } = await import('../waybillEngine');
      const quote = calculateFreightQuote(BASE_INPUT);
      const booked = createBookedWaybill(
        BASE_INPUT,
        quote,
        {
          shipperName: 'Tinh',
          shipperCompany: 'TVT',
          contactEmail: 'tinhkun102@gmail.com',
          consigneeName: 'Hans',
          consigneeCompany: 'EU Corp',
          commodity: 'Sensors',
          hsCode: '8542.31',
        },
        new Set(PRELOADED_WAYBILLS.map((w) => w.id)),
      );
      saveWaybills([booked, ...PRELOADED_WAYBILLS]);
      const reloaded = loadStoredWaybills();
      expect(reloaded[0].id).toBe(booked.id);
      expect(reloaded.length).toBe(PRELOADED_WAYBILLS.length + 1);
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      });
    }
  });
});
