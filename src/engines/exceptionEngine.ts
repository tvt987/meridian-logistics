import type { AlertSeverity, AlertStatus, ExceptionAlert } from '../types/logistics';

export const EXCEPTIONS_STORAGE_KEY = 'meridian_exceptions_v2';

export const INITIAL_EXCEPTION_ALERTS: ExceptionAlert[] = [
  {
    id: 'EXC-2601',
    waybillId: 'MRD-88412',
    corridorId: 'vn-eu-sea',
    portCode: 'EGSCN',
    severity: 'critical',
    status: 'open',
    category: 'reefer',
    titleEn: 'Reefer Thermal Excursion (+1.8°C Delta)',
    titleVi: 'Cảnh báo Lệch Nhiệt Container Lạnh (+1.8°C)',
    detailEn:
      'MRDU 482910-4 evaporator sensor drifted to -16.6°C approaching Suez anchorage. Compressor auto-defrost cycle extended.',
    detailVi:
      'Cảm biến dàn lạnh MRDU 482910-4 dao động lên -16.6°C gần vùng neo kênh Suez. Chu kỳ xả đá kéo dài vượt ngưỡng.',
    actionEn: 'Dispatch remote genset boost & confirm captain reefer log',
    actionVi: 'Kích hoạt tăng công suất máy phát lạnh & xác nhận nhật ký tàu',
    slaMinutesRemaining: 42,
    detectedAt: '2026-11-27 04:15 UTC',
  },
  {
    id: 'EXC-2602',
    waybillId: 'MRD-77304',
    corridorId: 'vn-us-sea',
    portCode: 'USLAX',
    severity: 'warning',
    status: 'open',
    category: 'congestion',
    titleEn: 'USLAX Pier 400 Berth Dwell Elevated (26h)',
    titleVi: 'Tắc nghẽn Cầu cảng USLAX Pier 400 (Chờ 26h)',
    detailEn:
      'Peak Trans-Pacific import surge pushed berth occupancy to 87%. Customs channel shifted to AMBER.',
    detailVi:
      'Cao điểm hàng nhập xuyên Thái Bình Dương đẩy công suất cầu bến lên 87%. Luồng hải quan chuyển AMBER.',
    actionEn: 'Pre-file US CBP entry & lock off-peak Anaheim drayage gate',
    actionVi: 'Nộp trước hồ sơ US CBP & đặt lịch xe kéo container khung giờ thấp điểm',
    slaMinutesRemaining: 185,
    detectedAt: '2026-11-27 03:40 UTC',
  },
  {
    id: 'EXC-2603',
    waybillId: 'MRD-94520',
    corridorId: 'vn-eu-sea',
    portCode: 'VNSGN',
    severity: 'warning',
    status: 'open',
    category: 'customs',
    titleEn: 'EVFTA REX Origin Statement Pending Verification',
    titleVi: 'Chờ Xác thực Tự chứng nhận Xuất xứ REX (EVFTA)',
    detailEn:
      'HS 6201.40 outerwear lot requires exporter REX registration stamp prior to MV MERIDIAN AURORA cut-off to secure 3.5% duty.',
    detailVi:
      'Lô áo khoác HS 6201.40 cần xác nhận mã REX xuất khẩu trước giờ cắt máng để hưởng thuế ưu đãi 3.5% EVFTA.',
    actionEn: 'Attach digital Commercial Invoice REX clause & upload to VNACCS',
    actionVi: 'Đính kèm điều khoản REX trên Commercial Invoice & đẩy lên VNACCS',
    slaMinutesRemaining: 310,
    detectedAt: '2026-11-27 02:10 UTC',
  },
  {
    id: 'EXC-2604',
    waybillId: 'MRD-94520',
    corridorId: 'vn-eu-sea',
    portCode: 'VNSGN',
    severity: 'critical',
    status: 'open',
    category: 'cutoff',
    titleEn: 'Cat Lai VGM & SI Cut-Off Approaching (5.5h Left)',
    titleVi: 'Sắp đến Giờ Cắt máng VGM & SI Cảng Cát Lái (Còn 5.5h)',
    detailEn:
      'SOLAS Verified Gross Mass (e-VGM) certificate must be transmitted to Berth B5 gate desk before 18:00 ICT.',
    detailVi:
      'Chứng từ xác nhận khối lượng toàn bộ SOLAS (e-VGM) phải truyền tới cầu B5 trước 18:00 giờ VN.',
    actionEn: 'Submit e-VGM from Container Optimizer weighbridge slip',
    actionVi: 'Truyền phiếu cân e-VGM trực tiếp từ Công cụ Đóng hàng Container',
    slaMinutesRemaining: 330,
    detectedAt: '2026-11-27 04:55 UTC',
  },
  {
    id: 'EXC-2605',
    waybillId: 'MRD-90215',
    corridorId: 'vn-de-air',
    portCode: 'FRA',
    severity: 'info',
    status: 'acknowledged',
    category: 'customs',
    titleEn: 'German ATLAS DDP Customs Released (Green Channel)',
    titleVi: 'Hải quan Đức ATLAS DDP Đã Thông quan (Luồng Xanh)',
    detailEn:
      'AWB 176-90215840 semiconductor LiDAR crates cleared Zollamt Frankfurt in 2.1h with zero physical inspection.',
    detailVi:
      'Lô bán dẫn LiDAR AWB 176-90215840 thông quan tại Frankfurt trong 2.1 giờ, miễn kiểm hóa thực tế.',
    actionEn: 'Release air-ride van dispatch to Munich Assembly Plant',
    actionVi: 'Phát lệnh xe giảm xóc khí chuyên dụng giao nhà máy Munich',
    slaMinutesRemaining: 480,
    detectedAt: '2026-11-26 14:20 UTC',
  },
];

export function loadStoredExceptions(): ExceptionAlert[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return INITIAL_EXCEPTION_ALERTS.map((a) => ({ ...a }));
  }
  try {
    const raw = window.localStorage.getItem(EXCEPTIONS_STORAGE_KEY);
    if (!raw) return INITIAL_EXCEPTION_ALERTS.map((a) => ({ ...a }));
    const parsed = JSON.parse(raw) as ExceptionAlert[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return INITIAL_EXCEPTION_ALERTS.map((a) => ({ ...a }));
    }
    return parsed;
  } catch {
    return INITIAL_EXCEPTION_ALERTS.map((a) => ({ ...a }));
  }
}

export function saveExceptions(alerts: ExceptionAlert[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(EXCEPTIONS_STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    // Graceful quota handling
  }
}

export function updateAlertStatus(
  alerts: ExceptionAlert[],
  alertId: string,
  nextStatus: AlertStatus,
  nowIso: string = new Date().toISOString(),
): ExceptionAlert[] {
  return alerts.map((a) => {
    if (a.id !== alertId) return a;
    return {
      ...a,
      status: nextStatus,
      resolvedAt:
        nextStatus === 'resolved'
          ? `${nowIso.slice(0, 16).replace('T', ' ')} UTC`
          : undefined,
    };
  });
}

export function filterExceptions(
  alerts: ExceptionAlert[],
  severityFilter: 'all' | AlertSeverity,
  includeResolved: boolean,
): ExceptionAlert[] {
  return alerts.filter((a) => {
    if (!includeResolved && a.status === 'resolved') return false;
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    return true;
  });
}

export function countActiveExceptions(alerts: ExceptionAlert[]): {
  totalActive: number;
  critical: number;
  warning: number;
  info: number;
  resolved: number;
} {
  let critical = 0;
  let warning = 0;
  let info = 0;
  let resolved = 0;

  for (const a of alerts) {
    if (a.status === 'resolved') {
      resolved += 1;
      continue;
    }
    if (a.severity === 'critical') critical += 1;
    else if (a.severity === 'warning') warning += 1;
    else info += 1;
  }

  return {
    totalActive: critical + warning + info,
    critical,
    warning,
    info,
    resolved,
  };
}

export function createSimulatedAlert(
  existingAlerts: ExceptionAlert[],
  nowIso: string = new Date().toISOString(),
): ExceptionAlert {
  const num = 2606 + existingAlerts.length;
  return {
    id: `EXC-${num}`,
    waybillId: 'MRD-88412',
    corridorId: 'vn-eu-sea',
    portCode: 'NLRTM',
    severity: 'warning',
    status: 'open',
    category: 'security',
    titleEn: 'IoT Seal Telemetry Ping Delay (>15m)',
    titleVi: 'Độ trễ Tín hiệu Niêm phong Điện tử IoT (>15 phút)',
    detailEn:
      'Satellite relay handoff delayed seal heartbeat on MV MERIDIAN TITAN. Optical tamper circuit remains INTACT.',
    detailVi:
      'Chuyển vùng vệ tinh làm chậm gói tin niêm phong trên MV MERIDIAN TITAN. Mạch chống mở trái phép vẫn AN TOÀN.',
    actionEn: 'Trigger redundant Iridium ping & verify seal hash ISO-17712',
    actionVi: 'Gửi lệnh ping dự phòng qua vệ tinh Iridium & đối chiếu mã niêm phong',
    slaMinutesRemaining: 95,
    detectedAt: `${nowIso.slice(0, 16).replace('T', ' ')} UTC`,
  };
}
