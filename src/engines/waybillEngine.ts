import { PRELOADED_WAYBILLS } from '../data/waybills';
import type {
  BookingCustomerForm,
  FreightQuoteInput,
  FreightQuoteResult,
  WaybillRecord,
  WaybillStage,
} from '../types/logistics';
import { getCorridorById } from './freight';

export const WAYBILLS_STORAGE_KEY = 'meridian_waybills_v1';
export const UTF8_BOM = '\uFEFF';

export function loadStoredWaybills(): WaybillRecord[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [...PRELOADED_WAYBILLS];
  }
  try {
    const raw = window.localStorage.getItem(WAYBILLS_STORAGE_KEY);
    if (!raw) return [...PRELOADED_WAYBILLS];
    const parsed = JSON.parse(raw) as WaybillRecord[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [...PRELOADED_WAYBILLS];
    }
    // Preserve any user-booked waybills first and ensure all preloaded IDs stay available
    const existingIds = new Set(parsed.map((w) => w.id));
    const missingPreloaded = PRELOADED_WAYBILLS.filter(
      (p) => !existingIds.has(p.id),
    );
    return [...parsed, ...missingPreloaded];
  } catch {
    return [...PRELOADED_WAYBILLS];
  }
}

export function saveWaybills(records: WaybillRecord[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(WAYBILLS_STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function generateWaybillId(existingIds: Set<string>): string {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const num = Math.floor(10000 + Math.random() * 89999);
    const candidate = `MRD-${num}`;
    if (!existingIds.has(candidate)) {
      return candidate;
    }
  }
  return `MRD-${String(Date.now()).slice(-5)}`;
}

export function createBookedWaybill(
  input: FreightQuoteInput,
  quote: FreightQuoteResult,
  form: BookingCustomerForm,
  existingIds: Set<string>,
  nowDate: Date = new Date(),
): WaybillRecord {
  const corridor = getCorridorById(input.corridorId);
  const id = generateWaybillId(existingIds);
  const digits = id.replace('MRD-', '');
  const isAir = input.mode === 'air-express' || input.mode === 'air-standard';
  const blNumber = isAir ? `MRD-AWB-176-${digits}` : `MRD-BL-2026-${digits}`;

  const containerOrAwb = isAir
    ? `AWB 176-${digits}840 (ULD PMC)`
    : input.mode === 'sea-fcl-40'
      ? `MRDU ${digits}4-0 (40'HC ${input.reeferMonitoring ? 'Reefer' : 'Dry'})`
      : input.mode === 'sea-fcl-20'
        ? `MRDU ${digits}2-0 (20' ${input.reeferMonitoring ? 'Reefer' : 'Dry'})`
        : input.mode === 'road-ftl'
          ? `TRK-VN-${digits} (Cross-Border FTL)`
          : `MRDU ${digits}1-8 (LCL Consol)`;

  const eta = new Date(
    nowDate.getTime() + quote.transitDaysMax * 24 * 60 * 60 * 1000,
  );
  const etaDate = eta.toISOString().slice(0, 10);
  const issuedStamp = `${nowDate.toISOString().slice(0, 16).replace('T', ' ')} UTC`;

  const stages: WaybillStage[] = [
    {
      step: 1,
      titleEn: 'Booking Confirmed & Equipment Allocated',
      titleVi: 'Xác nhận Booking & Phân bổ Thiết bị/Container',
      locationCode: corridor.originCode,
      locationEn: `${corridor.originNameEn} Operations Desk`,
      locationVi: `Điều vận ${corridor.originNameVi}`,
      timestamp: issuedStamp,
      reference: `BK-${digits}-VN`,
      status: 'completed',
    },
    {
      step: 2,
      titleEn: 'Export Customs Declaration & Gate-In Queued',
      titleVi: 'Đang chờ Thông quan Xuất khẩu & Hạ bãi Gate-In',
      locationCode: corridor.originCode,
      locationEn: `${corridor.originNameEn} Customs Terminal`,
      locationVi: `Hải quan Cửa khẩu ${corridor.originNameVi}`,
      timestamp: 'Scheduled +12h',
      reference: `CUS-${digits}`,
      status: 'active',
    },
    {
      step: 3,
      titleEn: isAir
        ? 'Main-Deck Freighter Uplift & Departure'
        : 'Vessel Loading & Main-Leg Departure',
      titleVi: isAir
        ? 'Xếp hàng lên Chuyên cơ & Cất cánh'
        : 'Xếp Container lên Tàu & Khởi hành',
      locationCode: corridor.originCode,
      locationEn: corridor.vesselName,
      locationVi: corridor.vesselName,
      timestamp: 'Pending Departure',
      reference: corridor.callsign.split('·')[0].trim(),
      status: 'pending',
    },
    {
      step: 4,
      titleEn: 'Live Corridor Telemetry & Transshipment Check',
      titleVi: 'Giám sát Hành trình Trực tuyến & Trung chuyển',
      locationCode: 'INTL',
      locationEn: `${corridor.code} Active Corridor`,
      locationVi: `Tuyến quốc tế ${corridor.code}`,
      timestamp: 'In Transit',
      reference: `TLM-${digits}`,
      status: 'pending',
    },
    {
      step: 5,
      titleEn: `Destination Import Customs (${input.incoterm})`,
      titleVi: `Hải quan Nhập khẩu Cảng đích (${input.incoterm})`,
      locationCode: corridor.destCode,
      locationEn: `${corridor.destNameEn} Customs Hub`,
      locationVi: `Hải quan ${corridor.destNameVi}`,
      timestamp: `Est. ${etaDate}`,
      reference: `IMP-${corridor.destCode}`,
      status: 'pending',
    },
    {
      step: 6,
      titleEn: 'Final-Mile Delivery & Digital POD Signed',
      titleVi: 'Giao hàng Chặng cuối & Ký xác nhận POD',
      locationCode: corridor.destCode,
      locationEn: `${corridor.destNameEn} Logistics Zone`,
      locationVi: `Khu Hậu cần ${corridor.destNameVi}`,
      timestamp: `Est. ${etaDate}`,
      reference: 'POD-PENDING',
      status: 'pending',
    },
  ];

  const cleanCommodity = form.commodity.trim() || 'General Commercial Cargo';

  return {
    id,
    blNumber,
    containerOrAwb,
    sealNumber: `ISO-17712-${digits}`,
    corridorId: corridor.id,
    mode: input.mode,
    incoterm: input.incoterm,
    shipperName: form.shipperName.trim() || 'Truong Van Tinh',
    shipperCompany: form.shipperCompany.trim() || 'Meridian Trade Partner',
    consigneeName: form.consigneeName.trim() || 'Global Consignee Desk',
    consigneeCompany: form.consigneeCompany.trim() || 'Destination Importer Ltd',
    originCode: corridor.originCode,
    originLabelEn: corridor.originNameEn,
    originLabelVi: corridor.originNameVi,
    destCode: corridor.destCode,
    destLabelEn: corridor.destNameEn,
    destLabelVi: corridor.destNameVi,
    commodityEn: cleanCommodity,
    commodityVi: cleanCommodity,
    hsCode: form.hsCode.trim() || '8471.30',
    packages: input.packages,
    grossWeightKg: quote.totalGrossWeightKg,
    volumeCbm: quote.totalVolumeCbm,
    chargeableWeightKg: quote.chargeableWeightKg,
    totalFreightUsd: quote.totalUsd,
    vesselOrFlight: corridor.vesselName,
    etaDate,
    createdAt: nowDate.toISOString(),
    currentStage: 2,
    isUserBooked: true,
    reeferTempC: input.reeferMonitoring ? corridor.telemetry.tempC : null,
    humidityPct: corridor.telemetry.humidityPct,
    stages,
  };
}

export function filterWaybills(
  records: WaybillRecord[],
  query: string,
): WaybillRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return records;
  return records.filter((w) => {
    const haystack = [
      w.id,
      w.blNumber,
      w.containerOrAwb,
      w.shipperName,
      w.shipperCompany,
      w.consigneeName,
      w.consigneeCompany,
      w.originCode,
      w.originLabelEn,
      w.originLabelVi,
      w.destCode,
      w.destLabelEn,
      w.destLabelVi,
      w.commodityEn,
      w.commodityVi,
      w.hsCode,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  // Neutralize formula injection in spreadsheet software + RFC 4180 quoting
  const safe = /^[=+\-@]/.test(str) ? `'${str}` : str;
  if (/[",\n\r]/.test(safe)) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

/**
 * Builds a UTF-8 BOM prefixed RFC 4180 CSV manifest for Excel compatibility with Vietnamese diacritics.
 */
export function buildCsvManifestWithBom(records: WaybillRecord[]): string {
  const headers = [
    'Waybill ID',
    'B/L or AWB Number',
    'Container / AWB',
    'Mode',
    'Incoterm',
    'Origin Code',
    'Origin Port',
    'Destination Code',
    'Destination Port',
    'Shipper Company',
    'Consignee Company',
    'Commodity',
    'HS Code',
    'Packages',
    'Gross Weight (kg)',
    'Volume (CBM)',
    'Chargeable Weight (kg)',
    'Total Freight (USD)',
    'Stage (1-6)',
    'ETA Date',
  ];

  const rows = records.map((r) => [
    r.id,
    r.blNumber,
    r.containerOrAwb,
    r.mode,
    r.incoterm,
    r.originCode,
    r.originLabelVi,
    r.destCode,
    r.destLabelVi,
    r.shipperCompany,
    r.consigneeCompany,
    r.commodityVi,
    r.hsCode,
    r.packages,
    r.grossWeightKg,
    r.volumeCbm,
    r.chargeableWeightKg,
    r.totalFreightUsd,
    `${r.currentStage}/6`,
    r.etaDate,
  ]);

  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => row.map(escapeCsvCell).join(',')),
  ];

  return `${UTF8_BOM}${lines.join('\r\n')}\r\n`;
}

export function triggerCsvDownload(
  records: WaybillRecord[],
  filename: string,
): void {
  const csvContent = buildCsvManifestWithBom(records);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
