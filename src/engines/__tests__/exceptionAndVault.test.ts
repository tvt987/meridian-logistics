import { describe, expect, it } from 'vitest';
import { PRELOADED_WAYBILLS } from '../../data/waybills';
import {
  countActiveExceptions,
  createSimulatedAlert,
  filterExceptions,
  INITIAL_EXCEPTION_ALERTS,
  loadStoredExceptions,
  saveExceptions,
  updateAlertStatus,
} from '../exceptionEngine';
import { calculateFreightQuote } from '../freight';
import {
  advanceWaybillStage,
  createBookedWaybill,
  deleteUserWaybill,
} from '../waybillEngine';

describe('Exception Alert Control Tower & Shipment Vault (v2.0)', () => {
  it('initializes with critical, warning and info operational alerts and tallies counts accurately', () => {
    const counts = countActiveExceptions(INITIAL_EXCEPTION_ALERTS);
    expect(counts.critical).toBe(2);
    expect(counts.warning).toBe(2);
    expect(counts.info).toBe(1);
    expect(counts.totalActive).toBe(5);
    expect(counts.resolved).toBe(0);
  });

  it('acknowledges and resolves exception alerts with UTC timestamps and filters resolved items', () => {
    const acked = updateAlertStatus(
      INITIAL_EXCEPTION_ALERTS,
      'EXC-2601',
      'acknowledged',
    );
    expect(acked.find((a) => a.id === 'EXC-2601')?.status).toBe('acknowledged');

    const resolved = updateAlertStatus(
      acked,
      'EXC-2601',
      'resolved',
      '2026-11-27T06:00:00Z',
    );
    const target = resolved.find((a) => a.id === 'EXC-2601');
    expect(target?.status).toBe('resolved');
    expect(target?.resolvedAt).toBe('2026-11-27 06:00 UTC');

    expect(filterExceptions(resolved, 'critical', false)).toHaveLength(1);
    expect(filterExceptions(resolved, 'critical', true)).toHaveLength(2);
  });

  it('simulates new telemetry exception alerts with unique incrementing IDs', () => {
    const sim = createSimulatedAlert(
      INITIAL_EXCEPTION_ALERTS,
      '2026-11-27T06:30:00Z',
    );
    expect(sim.id).toMatch(/^EXC-\d+$/);
    expect(INITIAL_EXCEPTION_ALERTS.some((a) => a.id === sim.id)).toBe(false);
    expect(sim.status).toBe('open');
  });

  it('persists exception alert states in localStorage and reloads them cleanly', () => {
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
      const updated = updateAlertStatus(
        INITIAL_EXCEPTION_ALERTS,
        'EXC-2602',
        'resolved',
      );
      saveExceptions(updated);
      const reloaded = loadStoredExceptions();
      expect(reloaded.find((a) => a.id === 'EXC-2602')?.status).toBe('resolved');
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      });
    }
  });

  it('advances shipment customs stages sequentially up to stage 6 completed', () => {
    const target = PRELOADED_WAYBILLS.find((w) => w.id === 'MRD-88412')!;
    expect(target.currentStage).toBe(4);
    const step5 = advanceWaybillStage(PRELOADED_WAYBILLS, 'MRD-88412');
    const wb5 = step5.find((w) => w.id === 'MRD-88412')!;
    expect(wb5.currentStage).toBe(5);
    expect(wb5.stages[3].status).toBe('completed');
    expect(wb5.stages[4].status).toBe('active');

    const step6 = advanceWaybillStage(step5, 'MRD-88412');
    const wb6 = step6.find((w) => w.id === 'MRD-88412')!;
    expect(wb6.currentStage).toBe(6);
    expect(wb6.stages[5].status).toBe('completed');

    // Advancing past stage 6 is idempotent
    const step7 = advanceWaybillStage(step6, 'MRD-88412');
    expect(step7.find((w) => w.id === 'MRD-88412')?.currentStage).toBe(6);
  });

  it('deletes user-booked waybills from the Shipment Vault while protecting preloaded enterprise records', () => {
    const input = {
      corridorId: 'vn-eu-sea',
      mode: 'sea-fcl-40' as const,
      lengthCm: 100,
      widthCm: 80,
      heightCm: 80,
      grossWeightKg: 100,
      packages: 10,
      declaredValueUsd: 50000,
      incoterm: 'CIF' as const,
      customsClearance: true,
      cargoInsurance: true,
      reeferMonitoring: false,
    };
    const quote = calculateFreightQuote(input);
    const userWb = createBookedWaybill(
      input,
      quote,
      {
        shipperName: 'Tinh',
        shipperCompany: 'TVT Export',
        contactEmail: 'tinhkun102@gmail.com',
        consigneeName: 'Anna',
        consigneeCompany: 'Nordic Trade',
        commodity: 'Servers',
        hsCode: '8471.50.10',
      },
      new Set(PRELOADED_WAYBILLS.map((w) => w.id)),
    );
    const combined = [userWb, ...PRELOADED_WAYBILLS];
    const afterDeleteUser = deleteUserWaybill(combined, userWb.id);
    expect(afterDeleteUser).toHaveLength(PRELOADED_WAYBILLS.length);

    // Preloaded record cannot be deleted
    const afterAttemptPreloaded = deleteUserWaybill(afterDeleteUser, 'MRD-88412');
    expect(afterAttemptPreloaded).toHaveLength(PRELOADED_WAYBILLS.length);
  });
});
