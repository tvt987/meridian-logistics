import type {
  DisruptionScenarioId,
  GlobalMapState,
  GlobalPortNode,
  GlobalPortNodeSpec,
  GlobalSeaLane,
  MapDisruptionZone,
  PortStatusLevel,
} from '../types/logistics';

export const GLOBAL_MAP_PORT_SPECS: GlobalPortNodeSpec[] = [
  {
    code: 'VNSGN',
    shortLabel: 'Cat Lai HCMC',
    nameEn: 'Cat Lai Port, HCMC',
    nameVi: 'Cảng Cát Lái, TP.HCM',
    countryEn: 'Vietnam',
    countryVi: 'Việt Nam',
    regionEn: 'Southeast Asia Export Gateway',
    regionVi: 'Cửa ngõ Xuất khẩu Đông Nam Á',
    x: 365,
    y: 224,
    type: 'sea',
    baseDwellHours: 14,
    baseCongestionPct: 74,
    annualThroughputMTeu: 6.8,
    dailyThroughputTeu: 18630,
    customsChannel: 'GREEN',
    linkedCorridorId: 'vn-eu-sea',
  },
  {
    code: 'VNHPH',
    shortLabel: 'Hai Phong',
    nameEn: 'Lach Huyen Deepwater, Hai Phong',
    nameVi: 'Cảng Nước sâu Lạch Huyện, Hải Phòng',
    countryEn: 'Vietnam',
    countryVi: 'Việt Nam',
    regionEn: 'Northern Vietnam Gateway',
    regionVi: 'Cửa ngõ Miền Bắc Việt Nam',
    x: 365,
    y: 189,
    type: 'sea',
    baseDwellHours: 11,
    baseCongestionPct: 66,
    annualThroughputMTeu: 2.4,
    dailyThroughputTeu: 6575,
    customsChannel: 'GREEN',
    linkedCorridorId: 'vn-us-sea',
  },
  {
    code: 'SGSIN',
    shortLabel: 'Singapore SIN',
    nameEn: 'PSA Tuas & Changi Air Hub (SIN)',
    nameVi: 'Cảng PSA Tuas & Sân bay Changi (SIN)',
    countryEn: 'Singapore',
    countryVi: 'Singapore',
    regionEn: 'Malacca Strait Transshipment Hub',
    regionVi: 'Trung tâm Trung chuyển Eo biển Malacca',
    x: 352,
    y: 252,
    type: 'multimodal',
    baseDwellHours: 9,
    baseCongestionPct: 71,
    annualThroughputMTeu: 39.0,
    dailyThroughputTeu: 106850,
    customsChannel: 'GREEN',
    linkedCorridorId: 'vn-us-sea',
  },
  {
    code: 'AEDXB',
    shortLabel: 'Dubai DXB',
    nameEn: 'Jebel Ali Port & Dubai Air Cargo (DXB)',
    nameVi: 'Cảng Jebel Ali & Hàng không Dubai (DXB)',
    countryEn: 'United Arab Emirates',
    countryVi: 'UAE',
    regionEn: 'Middle East Sea-Air Bridge',
    regionVi: 'Cầu nối Biển–Hàng không Trung Đông',
    x: 224,
    y: 184,
    type: 'multimodal',
    baseDwellHours: 8,
    baseCongestionPct: 64,
    annualThroughputMTeu: 14.5,
    dailyThroughputTeu: 39725,
    customsChannel: 'GREEN',
    linkedCorridorId: 'vn-eu-sea',
  },
  {
    code: 'EGSUZ',
    shortLabel: 'Suez Canal',
    nameEn: 'Suez Canal Maritime Chokepoint',
    nameVi: 'Kênh đào Suez (Tuyến Biển Đỏ)',
    countryEn: 'Egypt',
    countryVi: 'Ai Cập',
    regionEn: 'Red Sea / Mediterranean Transit',
    regionVi: 'Hành lang Biển Đỏ / Địa Trung Hải',
    x: 170,
    y: 160,
    type: 'chokepoint',
    baseDwellHours: 16,
    baseCongestionPct: 69,
    annualThroughputMTeu: 22.4,
    dailyThroughputTeu: 61370,
    customsChannel: 'TRANSIT',
    linkedCorridorId: 'vn-eu-sea',
  },
  {
    code: 'ZACPT',
    shortLabel: 'Cape of Good Hope',
    nameEn: 'Cape of Good Hope Diversion Corridor',
    nameVi: 'Mũi Hảo Vọng (Tuyến Vòng Châu Phi)',
    countryEn: 'South Africa',
    countryVi: 'Nam Phi',
    regionEn: 'South Atlantic Reroute Waypoint',
    regionVi: 'Điểm Chuyển tuyến Nam Đại Tây Dương',
    x: 138,
    y: 366,
    type: 'chokepoint',
    baseDwellHours: 6,
    baseCongestionPct: 48,
    annualThroughputMTeu: 1.4,
    dailyThroughputTeu: 3835,
    customsChannel: 'TRANSIT',
    linkedCorridorId: 'vn-eu-sea',
  },
  {
    code: 'NLRTM',
    shortLabel: 'Rotterdam RTM',
    nameEn: 'Port of Rotterdam (Maasvlakte II)',
    nameVi: 'Cảng Rotterdam (Maasvlakte II)',
    countryEn: 'Netherlands',
    countryVi: 'Hà Lan',
    regionEn: 'European Union Gateway',
    regionVi: 'Cửa ngõ Liên minh Châu Âu (EU)',
    x: 92,
    y: 93,
    type: 'sea',
    baseDwellHours: 16,
    baseCongestionPct: 76,
    annualThroughputMTeu: 13.8,
    dailyThroughputTeu: 37810,
    customsChannel: 'GREEN',
    linkedCorridorId: 'vn-eu-sea',
  },
  {
    code: 'USLAX',
    shortLabel: 'Los Angeles LAX',
    nameEn: 'Port of Los Angeles (Pier 400)',
    nameVi: 'Cảng Los Angeles (Pier 400)',
    countryEn: 'United States',
    countryVi: 'Hoa Kỳ',
    regionEn: 'US West Coast Trans-Pacific Gateway',
    regionVi: 'Cửa ngõ Bờ Tây Hoa Kỳ (USWC)',
    x: 725,
    y: 150,
    type: 'sea',
    baseDwellHours: 22,
    baseCongestionPct: 81,
    annualThroughputMTeu: 9.9,
    dailyThroughputTeu: 27125,
    customsChannel: 'AMBER',
    linkedCorridorId: 'vn-us-sea',
  },
];

function classifyPortStatus(congestionPct: number): PortStatusLevel {
  if (congestionPct >= 92) return 'critical';
  if (congestionPct >= 82) return 'elevated';
  if (congestionPct >= 70) return 'moderate';
  return 'optimal';
}

export function getGlobalPortSpec(code: string): GlobalPortNodeSpec {
  return (
    GLOBAL_MAP_PORT_SPECS.find(
      (p) => p.code.toUpperCase() === code.toUpperCase(),
    ) ?? GLOBAL_MAP_PORT_SPECS[0]
  );
}

/**
 * Pure deterministic world sea-lane & port telemetry engine synchronized with
 * Port Disruption Reroute Lab toggles (Red Sea Closure, Cat Lai Congestion, USWC Strike).
 */
export function buildGlobalMapState(
  activeDisruptions: DisruptionScenarioId[],
): GlobalMapState {
  const activeSet = new Set<DisruptionScenarioId>(activeDisruptions);
  const redSeaActive = activeSet.has('red-sea-suez');
  const catLaiActive = activeSet.has('cat-lai-congestion');
  const uswcActive = activeSet.has('uswc-port-strike');

  const ports: GlobalPortNode[] = GLOBAL_MAP_PORT_SPECS.map((spec) => {
    let dwellDelta = 0;
    let congestionDelta = 0;
    let impactEn: string | null = null;
    let impactVi: string | null = null;

    if (redSeaActive) {
      if (spec.code === 'EGSUZ') {
        dwellDelta += 288;
        congestionDelta += 29;
        impactEn = 'Suez transit suspended — mainline liners diverting around Cape (+12d)';
        impactVi = 'Tạm dừng qua Suez — tàu mẹ chuyển vòng Mũi Hảo Vọng (+12 ngày)';
      } else if (spec.code === 'ZACPT') {
        dwellDelta += 18;
        congestionDelta += 34;
        impactEn = 'Cape diversion bunker surge — +140% diverted Asia-EU vessel volume';
        impactVi = 'Tăng đột biến tàu vòng Mũi Hảo Vọng — lưu lượng Á–Âu tăng +140%';
      } else if (spec.code === 'AEDXB') {
        dwellDelta += 6;
        congestionDelta += 14;
        impactEn = 'High Sea-Air transshipment intake (Jebel Ali -> DXB air bridge)';
        impactVi = 'Tăng tải chuyển tiếp Biển–Bay (Jebel Ali -> Sân bay DXB)';
      } else if (spec.code === 'NLRTM') {
        dwellDelta += 14;
        congestionDelta += 9;
        impactEn = 'Vessel bunching from delayed Cape arrivals at Maasvlakte II';
        impactVi = 'Dồn tàu cập cầu do chậm hành trình vòng Mũi Hảo Vọng';
      }
    }

    if (catLaiActive) {
      if (spec.code === 'VNSGN') {
        dwellDelta += 96;
        congestionDelta += 20;
        impactEn = 'Yard density >92% — +4d berth dwell & export gate slot queuing';
        impactVi = 'Mật độ bãi >92% — chờ cầu bến +4 ngày & ùn tắc cổng hạ bãi';
      } else if (spec.code === 'SGSIN') {
        dwellDelta += 10;
        congestionDelta += 8;
        impactEn = 'Feeder rollover spillover from HCMC terminals';
        impactVi = 'Áp lực tàu gom feeder dồn từ cảng TP.HCM';
      }
    }

    if (uswcActive) {
      if (spec.code === 'USLAX') {
        dwellDelta += 216;
        congestionDelta += 16;
        impactEn = 'USWC terminal lockout — +9d San Pedro Bay anchorage queue';
        impactVi = 'Đình công Bờ Tây Mỹ — xếp hàng neo đậu Vịnh San Pedro +9 ngày';
      } else if (spec.code === 'SGSIN' && !impactEn) {
        dwellDelta += 8;
        congestionDelta += 10;
        impactEn = 'Trans-Pacific Sea-Air surge diverting US-bound freight via Changi';
        impactVi = 'Tăng đột biến hàng Biển–Bay chuyển hướng sang Mỹ qua Changi';
      } else if (spec.code === 'VNHPH') {
        dwellDelta += 12;
        congestionDelta += 7;
        impactEn = 'Blank sailings & equipment repositioning delay on USWC string';
        impactVi = 'Cắt chuyến (blank sailing) & thiếu vỏ container tuyến Mỹ';
      }
    }

    const effectiveDwellHours = spec.baseDwellHours + dwellDelta;
    const effectiveCongestionPct = Math.min(
      99,
      spec.baseCongestionPct + congestionDelta,
    );

    return {
      ...spec,
      effectiveDwellHours,
      effectiveCongestionPct,
      status: classifyPortStatus(effectiveCongestionPct),
      disruptionDeltaHours: dwellDelta,
      disruptionImpactEn: impactEn,
      disruptionImpactVi: impactVi,
    };
  });

  const euOceanDelay = (redSeaActive ? 12 : 0) + (catLaiActive ? 4 : 0);
  const usOceanDelay = (uswcActive ? 9 : 0) + (catLaiActive ? 4 : 0);

  const lanes: GlobalSeaLane[] = [
    {
      id: 'ocean-direct-eu',
      corridorId: 'vn-eu-sea',
      kind: 'ocean-direct',
      labelEn: 'Ocean Direct (Suez -> RTM)',
      labelVi: 'Đường biển Thẳng (Suez -> RTM)',
      badgeText: redSeaActive ? 'BLOCKED · SUEZ' : `${28 + euOceanDelay}d`,
      originCode: 'VNSGN',
      destCode: 'NLRTM',
      viaCode: 'EGSUZ',
      svgPath:
        'M 365 224 C 362 240, 358 248, 352 252 C 324 256, 286 246, 250 232 C 218 220, 192 206, 178 182 C 174 172, 172 165, 170 160 C 150 144, 108 144, 62 142 C 44 130, 56 104, 92 93',
      baseTransitDays: 28,
      effectiveTransitDays: 28 + euOceanDelay,
      delayDays: euOceanDelay,
      status: redSeaActive
        ? 'blocked'
        : catLaiActive
          ? 'congested'
          : 'active',
      vesselName: 'MV MERIDIAN TITAN',
      vesselPos: { x: 256, y: 234 },
      markerType: 'ship',
    },
    {
      id: 'cape-reroute-eu',
      corridorId: 'vn-eu-sea',
      kind: 'cape-reroute',
      labelEn: 'Cape Reroute +12d (ZACPT)',
      labelVi: 'Tuyến Vòng Mũi Hảo Vọng +12d',
      badgeText: redSeaActive ? `REROUTED · ${40 + (catLaiActive ? 4 : 0)}d` : '+12d STANDBY',
      originCode: 'VNSGN',
      destCode: 'NLRTM',
      viaCode: 'ZACPT',
      svgPath:
        'M 365 224 C 362 242, 358 250, 352 252 C 318 272, 268 314, 212 350 C 182 368, 158 378, 138 366 C 98 340, 52 290, 26 226 C 12 180, 26 124, 92 93',
      baseTransitDays: 40,
      effectiveTransitDays: 40 + (catLaiActive ? 4 : 0),
      delayDays: 12 + (catLaiActive ? 4 : 0),
      status: redSeaActive ? 'rerouted' : 'standby',
      vesselName: 'MV CAPE SOVEREIGN',
      vesselPos: { x: 138, y: 366 },
      markerType: 'ship',
    },
    {
      id: 'sea-air-dxb',
      corridorId: 'vn-eu-sea',
      kind: 'sea-air-hybrid',
      labelEn: 'Sea-Air Hybrid via DXB',
      labelVi: 'Kết hợp Biển–Bay qua DXB',
      badgeText: `${14 + (redSeaActive ? 1 : 0) + (catLaiActive ? 1.5 : 0)}d · DXB`,
      originCode: 'VNSGN',
      destCode: 'NLRTM',
      viaCode: 'AEDXB',
      svgPath:
        'M 365 224 C 360 242, 356 248, 352 252 C 318 254, 276 238, 246 212 C 236 202, 230 192, 224 184',
      secondaryAirPath: 'M 224 184 Q 162 126, 92 93',
      baseTransitDays: 14,
      effectiveTransitDays:
        14 + (redSeaActive ? 1 : 0) + (catLaiActive ? 1.5 : 0),
      delayDays: (redSeaActive ? 1 : 0) + (catLaiActive ? 1.5 : 0),
      status: redSeaActive ? 'active' : 'standby',
      vesselName: 'SEA-AIR DXB EXPRESS',
      vesselPos: { x: 224, y: 184 },
      markerType: 'hybrid',
    },
    {
      id: 'ocean-direct-us',
      corridorId: 'vn-us-sea',
      kind: 'ocean-direct',
      labelEn: 'Trans-Pacific Ocean (HPH -> LAX)',
      labelVi: 'Biển Thái Bình Dương (HPH -> LAX)',
      badgeText: uswcActive ? `STRIKE · ${20 + usOceanDelay}d` : `${20 + usOceanDelay}d`,
      originCode: 'VNHPH',
      destCode: 'USLAX',
      svgPath:
        'M 365 189 C 402 184, 442 162, 504 134 C 572 104, 650 112, 725 150',
      baseTransitDays: 20,
      effectiveTransitDays: 20 + usOceanDelay,
      delayDays: usOceanDelay,
      status: uswcActive || catLaiActive ? 'congested' : 'active',
      vesselName: 'MV PACIFIC HORIZON',
      vesselPos: { x: 548, y: 118 },
      markerType: 'ship',
    },
    {
      id: 'sea-air-sin',
      corridorId: 'vn-us-sea',
      kind: 'sea-air-hybrid',
      labelEn: 'Sea-Air Hybrid via SIN',
      labelVi: 'Kết hợp Biển–Bay qua SIN',
      badgeText: `${11 + (uswcActive ? 1 : 0) + (catLaiActive ? 1.5 : 0)}d · SIN`,
      originCode: 'VNHPH',
      destCode: 'USLAX',
      viaCode: 'SGSIN',
      svgPath: 'M 365 189 C 384 214, 376 240, 352 252',
      secondaryAirPath: 'M 352 252 Q 528 110, 725 150',
      baseTransitDays: 11,
      effectiveTransitDays:
        11 + (uswcActive ? 1 : 0) + (catLaiActive ? 1.5 : 0),
      delayDays: (uswcActive ? 1 : 0) + (catLaiActive ? 1.5 : 0),
      status: uswcActive ? 'active' : 'standby',
      vesselName: 'SEA-AIR SIN BRIDGE',
      vesselPos: { x: 528, y: 158 },
      markerType: 'hybrid',
    },
    {
      id: 'direct-air-eu',
      corridorId: 'vn-de-air',
      kind: 'direct-air',
      labelEn: 'Direct Air Freight (SGN -> EU)',
      labelVi: 'Hàng không Chuyên cơ (SGN -> EU)',
      badgeText: '2-3d · B777F',
      originCode: 'VNSGN',
      destCode: 'NLRTM',
      svgPath: 'M 365 224 Q 236 92, 92 93',
      baseTransitDays: 2,
      effectiveTransitDays: catLaiActive ? 2.5 : 2,
      delayDays: catLaiActive ? 0.5 : 0,
      status: 'active',
      vesselName: 'MRD-777F CARGO',
      vesselPos: { x: 230, y: 126 },
      markerType: 'plane',
    },
  ];

  const zones: MapDisruptionZone[] = [
    {
      id: 'red-sea-suez',
      code: 'RED SEA / SUEZ',
      labelEn: 'Red Sea Closure',
      labelVi: 'Đóng tuyến Biển Đỏ',
      impactBadge: '+12d CAPE DIVERT',
      cx: 174,
      cy: 172,
      radius: 26,
      severity: 'critical',
      active: redSeaActive,
    },
    {
      id: 'cat-lai-congestion',
      code: 'VNSGN PEAK',
      labelEn: 'Cat Lai Congestion',
      labelVi: 'Ùn tắc Cát Lái',
      impactBadge: '+4d BERTH DWELL',
      cx: 365,
      cy: 224,
      radius: 22,
      severity: 'high',
      active: catLaiActive,
    },
    {
      id: 'uswc-port-strike',
      code: 'USWC STRIKE',
      labelEn: 'USWC Strike',
      labelVi: 'Đình công Bờ Tây Mỹ',
      impactBadge: '+9d LAX QUEUE',
      cx: 725,
      cy: 150,
      radius: 24,
      severity: 'critical',
      active: uswcActive,
    },
  ];

  const congestedPortCount = ports.filter(
    (p) => p.status === 'elevated' || p.status === 'critical',
  ).length;

  const totalDailyTeuAtRisk = ports
    .filter((p) => p.disruptionDeltaHours > 0)
    .reduce((sum, p) => sum + p.dailyThroughputTeu, 0);

  let advisoryEn =
    'All global maritime lanes & air corridors operating at nominal schedule reliability (0 active shocks).';
  let advisoryVi =
    'Toàn bộ tuyến hàng hải và hàng không quốc tế vận hành ổn định theo lịch trình tiêu chuẩn (0 sự cố).';

  if (redSeaActive && uswcActive) {
    advisoryEn =
      'DUAL CHOKEPOINT ALERT: Asia-EU liners diverting via Cape (+12d) & USWC locked (+9d) — shift urgent cargo to DXB/SIN Sea-Air bridges.';
    advisoryVi =
      'CẢNH BÁO KÉP: Tuyến Á–Âu vòng Mũi Hảo Vọng (+12d) & Bờ Tây Mỹ đình công (+9d) — chuyển hàng gấp sang cầu nối Biển–Bay DXB/SIN.';
  } else if (redSeaActive) {
    advisoryEn =
      'RED SEA DIVERSION ACTIVE: Suez direct suspended; vessels rerouting around Cape of Good Hope (+12d). Sea-Air via Dubai DXB cuts transit to 15d.';
    advisoryVi =
      'CHUYỂN TUYẾN BIỂN ĐỎ: Tạm ngưng Suez; tàu đi vòng Mũi Hảo Vọng (+12 ngày). Biển–Bay qua Dubai DXB rút ngắn còn 15 ngày.';
  } else if (uswcActive) {
    advisoryEn =
      'USWC STRIKE ACTIVE: Los Angeles Pier 400 anchorage backed up +9d. Sea-Air Hybrid via Singapore SIN preserves 12d Pacific SLA.';
    advisoryVi =
      'ĐÌNH CÔNG BỜ TÂY MỸ: Cảng Los Angeles dồn neo đậu +9 ngày. Biển–Bay qua Singapore SIN giữ chuẩn SLA 12 ngày.';
  } else if (catLaiActive) {
    advisoryEn =
      'CAT LAI PEAK CONGESTION: VNSGN yard density >92% (+4d berth dwell). Pre-gate containers early or route North via Hai Phong Lach Huyen.';
    advisoryVi =
      'ÙN TẮC CAO ĐIỂM CÁT LÁI: Mật độ bãi VNSGN >92% (+4 ngày chờ cầu). Hạ bãi sớm hoặc điều phối qua Lạch Huyện Hải Phòng.';
  }

  return {
    ports,
    lanes,
    zones,
    activeDisruptions: Array.from(activeSet),
    capeRerouteActive: redSeaActive,
    congestedPortCount,
    totalDailyTeuAtRisk,
    advisoryEn,
    advisoryVi,
  };
}
