import { FX_USD_TO_VND } from '../data/corridors';
import type {
  Incoterm2020Code,
  IncotermComparisonRow,
  IncotermParty,
  IncotermsAllocationInput,
  IncotermsAllocationResult,
  IncotermStageBreakdown,
  IncotermStageId,
} from '../types/logistics';

export const INCOTERMS_2020_ORDER: Incoterm2020Code[] = [
  'EXW',
  'FCA',
  'FOB',
  'CFR',
  'CIF',
  'DAP',
  'DDP',
];

export interface IncotermStageMeta {
  index: number;
  id: IncotermStageId;
  shortEn: string;
  shortVi: string;
  labelEn: string;
  labelVi: string;
}

export const INCOTERM_STAGES: IncotermStageMeta[] = [
  {
    index: 1,
    id: 'factory-gate',
    shortEn: 'Factory Gate',
    shortVi: 'Cổng Nhà máy',
    labelEn: 'Factory Gate & Export Packaging',
    labelVi: 'Đóng gói Xuất khẩu & Cổng Nhà máy',
  },
  {
    index: 2,
    id: 'origin-inland',
    shortEn: 'Origin Inland',
    shortVi: 'Nội địa Xuất',
    labelEn: 'Origin Inland Haulage',
    labelVi: 'Vận tải Nội địa Đầu xuất',
  },
  {
    index: 3,
    id: 'export-customs',
    shortEn: 'Export Customs',
    shortVi: 'Hải quan Xuất',
    labelEn: 'Export Customs & VNACCS',
    labelVi: 'Thông quan Xuất khẩu & VNACCS',
  },
  {
    index: 4,
    id: 'port-loading',
    shortEn: 'Port Loading',
    shortVi: 'Xếp hàng Cảng',
    labelEn: 'Origin THC & Vessel Loading',
    labelVi: 'Phí THC & Xếp hàng lên Tàu',
  },
  {
    index: 5,
    id: 'main-freight',
    shortEn: 'Main Freight',
    shortVi: 'Cước Quốc tế',
    labelEn: 'Main Ocean / Air Freight',
    labelVi: 'Cước Biển / Hàng không Chính',
  },
  {
    index: 6,
    id: 'marine-insurance',
    shortEn: 'Insurance',
    shortVi: 'Bảo hiểm',
    labelEn: 'Marine / Cargo Insurance',
    labelVi: 'Bảo hiểm Hàng hải / Mọi rủi ro',
  },
  {
    index: 7,
    id: 'import-customs',
    shortEn: 'Import & Duty',
    shortVi: 'Hải quan & Thuế',
    labelEn: 'Import Customs & EVFTA/MFN Duty',
    labelVi: 'Thông quan Nhập & Thuế EVFTA/MFN',
  },
  {
    index: 8,
    id: 'buyer-warehouse',
    shortEn: 'Buyer Whse',
    shortVi: 'Kho Người mua',
    labelEn: 'Destination Drayage & Buyer Warehouse',
    labelVi: 'Kéo hàng & Giao Kho Người mua',
  },
];

interface IncotermRuleSpec {
  code: Incoterm2020Code;
  fullNameEn: string;
  fullNameVi: string;
  groupCode: 'E' | 'F' | 'C' | 'D';
  seaOnly: boolean;
  sellerCostStages: Set<number>;
  sellerRiskStages: Set<number>;
  riskTransferStageIndex: number;
  costTransferStageIndex: number;
  insuranceRequired: boolean;
  insuranceCoverageEn: string;
  insuranceCoverageVi: string;
  warningsEn: string[];
  warningsVi: string[];
}

const INCOTERM_RULES: Record<Incoterm2020Code, IncotermRuleSpec> = {
  EXW: {
    code: 'EXW',
    fullNameEn: 'Ex Works (Named Factory)',
    fullNameVi: 'Giao tại Xưởng (EXW)',
    groupCode: 'E',
    seaOnly: false,
    sellerCostStages: new Set([1]),
    sellerRiskStages: new Set([1]),
    riskTransferStageIndex: 1,
    costTransferStageIndex: 1,
    insuranceRequired: false,
    insuranceCoverageEn: 'Buyer optional — full transit exposure from factory dock',
    insuranceCoverageVi: 'Người mua tự mua — chịu rủi ro ngay từ cổng nhà máy',
    warningsEn: [
      'Foreign buyers often lack a local Vietnam tax ID to file VNACCS export customs under EXW.',
      'ICC 2020 recommends FCA over EXW for cross-border containerized trade.',
    ],
    warningsVi: [
      'Người mua nước ngoài thường không có pháp nhân tại Việt Nam để đứng tên tờ khai xuất khẩu VNACCS.',
      'ICC 2020 khuyến nghị dùng FCA thay cho EXW với thương mại container xuyên biên giới.',
    ],
  },
  FCA: {
    code: 'FCA',
    fullNameEn: 'Free Carrier (Named CY / Hub)',
    fullNameVi: 'Giao cho Người chuyên chở (FCA)',
    groupCode: 'F',
    seaOnly: false,
    sellerCostStages: new Set([1, 2, 3]),
    sellerRiskStages: new Set([1, 2, 3]),
    riskTransferStageIndex: 3,
    costTransferStageIndex: 3,
    insuranceRequired: false,
    insuranceCoverageEn: 'Buyer arranges main-leg marine / air insurance',
    insuranceCoverageVi: 'Người mua tự thu xếp bảo hiểm chặng quốc tế',
    warningsEn: [
      'Optimal ICC 2020 rule for containerized FCL/LCL & Air Freight handed over at inland CY or CFS.',
      'Buyer controls ocean/air carrier contract & freight rate negotiation.',
    ],
    warningsVi: [
      'Điều kiện ICC 2020 tối ưu nhất cho hàng container FCL/LCL & Hàng không bàn giao tại bãi CY/CFS.',
      'Người mua nắm quyền đàm phán trực tiếp giá cước hãng tàu/hàng không.',
    ],
  },
  FOB: {
    code: 'FOB',
    fullNameEn: 'Free On Board (Port of Shipment)',
    fullNameVi: 'Giao lên Tàu tại Cảng xuất (FOB)',
    groupCode: 'F',
    seaOnly: true,
    sellerCostStages: new Set([1, 2, 3, 4]),
    sellerRiskStages: new Set([1, 2, 3, 4]),
    riskTransferStageIndex: 4,
    costTransferStageIndex: 4,
    insuranceRequired: false,
    insuranceCoverageEn: 'Buyer insures ocean leg from vessel rail onward',
    insuranceCoverageVi: 'Người mua mua bảo hiểm chặng biển từ khi hàng lên tàu',
    warningsEn: [
      'Strictly sea & inland waterway transport only — never apply FOB to air cargo.',
      'Containerized cargo sits at terminal CY before loading; risk ambiguity exists between gate-in and onboard.',
    ],
    warningsVi: [
      'Chỉ áp dụng vận tải biển & thủy nội địa — tuyệt đối không dùng FOB cho hàng không.',
      'Hàng container chờ tại bãi CY trước khi xếp tàu có khoảng trống rủi ro giữa hạ bãi và lên boong.',
    ],
  },
  CFR: {
    code: 'CFR',
    fullNameEn: 'Cost and Freight (Port of Destination)',
    fullNameVi: 'Tiền hàng & Cước biển (CFR)',
    groupCode: 'C',
    seaOnly: true,
    sellerCostStages: new Set([1, 2, 3, 4, 5]),
    sellerRiskStages: new Set([1, 2, 3, 4]),
    riskTransferStageIndex: 4,
    costTransferStageIndex: 5,
    insuranceRequired: false,
    insuranceCoverageEn: 'CRITICAL GAP: Seller pays freight, but Buyer bears ocean risk — Buyer must buy insurance!',
    insuranceCoverageVi: 'LỖ HỔNG RỦI RO: Người bán trả cước biển nhưng Người mua chịu rủi ro từ cảng xuất — phải mua bảo hiểm!',
    warningsEn: [
      'COST / RISK SPLIT POINT: Risk passes to Buyer at Origin Port Loading (Stage 4) while Seller pays Main Freight (Stage 5).',
      'Marine insurance is NOT included — Buyer faces uninsured ocean loss unless covered separately.',
    ],
    warningsVi: [
      'ĐIỂM TÁCH CHI PHÍ & RỦI RO: Rủi ro chuyển sang Người mua tại Cảng xuất (Mốc 4) dù Người bán trả Cước chính (Mốc 5).',
      'KHÔNG bao gồm bảo hiểm hàng hải — Người mua chịu thiệt hại toàn bộ nếu không tự mua bảo hiểm.',
    ],
  },
  CIF: {
    code: 'CIF',
    fullNameEn: 'Cost, Insurance & Freight',
    fullNameVi: 'Tiền hàng, Bảo hiểm & Cước (CIF)',
    groupCode: 'C',
    seaOnly: true,
    sellerCostStages: new Set([1, 2, 3, 4, 5, 6]),
    sellerRiskStages: new Set([1, 2, 3, 4]),
    riskTransferStageIndex: 4,
    costTransferStageIndex: 6,
    insuranceRequired: true,
    insuranceCoverageEn: 'Mandatory Seller Insurance — Institute Cargo Clauses (C) min. 110% invoice value',
    insuranceCoverageVi: 'Bắt buộc Người bán mua Bảo hiểm — chuẩn tối thiểu ICC (C) 110% trị giá hóa đơn',
    warningsEn: [
      'COST / RISK SPLIT POINT: Risk transfers at Origin Port Loading (Stage 4) even though Seller pays Freight + Insurance (Stages 5-6).',
      'Minimum CIF cover is ICC (C) named perils only — upgrade contract to ICC (A) All-Risk for high-value electronics.',
    ],
    warningsVi: [
      'ĐIỂM TÁCH CHI PHÍ & RỦI RO: Rủi ro chuyển ngay tại Cảng xuất (Mốc 4) dù Người bán trả Cước & Bảo hiểm (Mốc 5-6).',
      'Mức bảo hiểm mặc định của CIF chỉ là ICC (C) tối thiểu — hàng điện tử giá trị cao cần yêu cầu nâng lên ICC (A).',
    ],
  },
  DAP: {
    code: 'DAP',
    fullNameEn: 'Delivered At Place (Buyer Facility)',
    fullNameVi: 'Giao hàng tại Điểm đích (DAP)',
    groupCode: 'D',
    seaOnly: false,
    sellerCostStages: new Set([1, 2, 3, 4, 5, 6, 8]),
    sellerRiskStages: new Set([1, 2, 3, 4, 5, 6, 8]),
    riskTransferStageIndex: 8,
    costTransferStageIndex: 8,
    insuranceRequired: false,
    insuranceCoverageEn: 'Seller bears transit risk to Buyer door (insurance strongly advised for Seller)',
    insuranceCoverageVi: 'Người bán gánh toàn bộ rủi ro tới kho Người mua (khuyến nghị Người bán tự mua bảo hiểm)',
    warningsEn: [
      'Buyer remains legally responsible for Stage 7 Import Customs clearance & EVFTA/MFN duties.',
      'Delayed Buyer customs clearance at destination port can trigger demurrage charged back to Buyer.',
    ],
    warningsVi: [
      'Người mua vẫn chịu trách nhiệm pháp lý cho Mốc 7: Thông quan nhập khẩu & nộp thuế EVFTA/MFN.',
      'Nếu Người mua chậm thông quan tại cảng đích, phí lưu container (DEM/DET) có thể phát sinh tranh chấp.',
    ],
  },
  DDP: {
    code: 'DDP',
    fullNameEn: 'Delivered Duty Paid (Turnkey Door)',
    fullNameVi: 'Giao hàng Đã nộp thuế Trọn gói (DDP)',
    groupCode: 'D',
    seaOnly: false,
    sellerCostStages: new Set([1, 2, 3, 4, 5, 6, 7, 8]),
    sellerRiskStages: new Set([1, 2, 3, 4, 5, 6, 7, 8]),
    riskTransferStageIndex: 8,
    costTransferStageIndex: 8,
    insuranceRequired: false,
    insuranceCoverageEn: 'Maximum Seller liability across all 8 stages including import duties & final drayage',
    insuranceCoverageVi: 'Trách nhiệm tối đa của Người bán xuyên suốt cả 8 mốc gồm thuế nhập khẩu & kéo hàng tận kho',
    warningsEn: [
      'MAXIMUM SELLER EXPOSURE: Seller must act as Importer of Record (IOR) and pay destination VAT/Import Duties.',
      'Verify EU EORI / US Customs Bond registration before signing DDP; reclaim of import VAT may be blocked for non-resident sellers.',
    ],
    warningsVi: [
      'TRÁCH NHIỆM TỐI ĐA CHO NGƯỜI BÁN: Người bán phải đứng tên Importer of Record (IOR) và nộp toàn bộ thuế nhập khẩu/VAT đích.',
      'Cần kiểm tra mã EORI (EU) hoặc Customs Bond (Mỹ) trước khi ký DDP; người bán nước ngoài có thể không được hoàn VAT đích.',
    ],
  },
};

export interface IncotermPresetScenario {
  id: string;
  labelEn: string;
  labelVi: string;
  input: Omit<IncotermsAllocationInput, 'incoterm'>;
}

export const INCOTERM_SCENARIO_PRESETS: IncotermPresetScenario[] = [
  {
    id: 'vn-eu-evfta-fcl',
    labelEn: 'VN -> EU Electronics ($120k · EVFTA 0%)',
    labelVi: 'VN -> EU Điện tử ($120k · EVFTA 0%)',
    input: {
      cargoValueUsd: 120000,
      originInlandUsd: 420,
      exportCustomsUsd: 185,
      originThcUsd: 390,
      mainFreightUsd: 4480,
      insuranceRatePct: 0.45,
      importDutyRatePct: 3.5,
      importCustomsUsd: 310,
      destinationDrayageUsd: 680,
    },
  },
  {
    id: 'vn-us-apparel-mfn',
    labelEn: 'VN -> US Apparel ($85k · MFN 12%)',
    labelVi: 'VN -> Mỹ May mặc ($85k · MFN 12%)',
    input: {
      cargoValueUsd: 85000,
      originInlandUsd: 360,
      exportCustomsUsd: 165,
      originThcUsd: 340,
      mainFreightUsd: 4920,
      insuranceRatePct: 0.45,
      importDutyRatePct: 12.0,
      importCustomsUsd: 340,
      destinationDrayageUsd: 840,
    },
  },
  {
    id: 'vn-jp-coldchain-cptpp',
    labelEn: 'VN -> JP Cold-Chain ($150k · CPTPP 2%)',
    labelVi: 'VN -> Nhật Chuỗi lạnh ($150k · CPTPP 2%)',
    input: {
      cargoValueUsd: 150000,
      originInlandUsd: 480,
      exportCustomsUsd: 210,
      originThcUsd: 420,
      mainFreightUsd: 3250,
      insuranceRatePct: 0.55,
      importDutyRatePct: 2.0,
      importCustomsUsd: 290,
      destinationDrayageUsd: 610,
    },
  },
];

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function round1(n: number): number {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}

function buildStageCosts(input: IncotermsAllocationInput): number[] {
  const cargoValue = Math.max(1000, Number(input.cargoValueUsd) || 1000);
  const originInland = Math.max(0, Number(input.originInlandUsd) || 0);
  const exportCustoms = Math.max(0, Number(input.exportCustomsUsd) || 0);
  const originThc = Math.max(0, Number(input.originThcUsd) || 0);
  const mainFreight = Math.max(0, Number(input.mainFreightUsd) || 0);
  const insRate = Math.max(0, Math.min(5, Number(input.insuranceRatePct) || 0));
  const dutyRate = Math.max(
    0,
    Math.min(100, Number(input.importDutyRatePct) || 0),
  );
  const importCustoms = Math.max(0, Number(input.importCustomsUsd) || 0);
  const destDrayage = Math.max(0, Number(input.destinationDrayageUsd) || 0);

  // Stage 1: Export packaging & factory gate handling (0.35% of cargo value, min $160)
  const factoryPackaging = round2(Math.max(160, cargoValue * 0.0035));
  // Stage 6: Marine insurance on 110% of (Cargo + Main Freight)
  const marineInsurance = round2(
    Math.max(45, (cargoValue + mainFreight) * 1.1 * (insRate / 100)),
  );
  // Stage 7: Import Customs Brokerage + Import Duty on CIF valuation
  const cifBase = cargoValue + mainFreight + marineInsurance;
  const importDutyAndClearance = round2(
    importCustoms + cifBase * (dutyRate / 100),
  );

  return [
    factoryPackaging, // 1: factory-gate
    round2(originInland), // 2: origin-inland
    round2(exportCustoms), // 3: export-customs
    round2(originThc), // 4: port-loading
    round2(mainFreight), // 5: main-freight
    marineInsurance, // 6: marine-insurance
    importDutyAndClearance, // 7: import-customs
    round2(destDrayage), // 8: buyer-warehouse
  ];
}

function computeSingleIncotermTotals(
  code: Incoterm2020Code,
  stageCosts: number[],
): {
  sellerCostUsd: number;
  buyerCostUsd: number;
  sellerSharePct: number;
  buyerSharePct: number;
  stages: IncotermStageBreakdown[];
} {
  const rule = INCOTERM_RULES[code];
  let sellerSum = 0;
  let buyerSum = 0;

  const stages: IncotermStageBreakdown[] = INCOTERM_STAGES.map((meta, idx) => {
    const costUsd = stageCosts[idx];
    const costOwner: IncotermParty = rule.sellerCostStages.has(meta.index)
      ? 'seller'
      : 'buyer';
    const riskOwner: IncotermParty = rule.sellerRiskStages.has(meta.index)
      ? 'seller'
      : 'buyer';

    if (costOwner === 'seller') {
      sellerSum += costUsd;
    } else {
      buyerSum += costUsd;
    }

    return {
      index: meta.index,
      id: meta.id,
      shortEn: meta.shortEn,
      shortVi: meta.shortVi,
      labelEn: meta.labelEn,
      labelVi: meta.labelVi,
      costOwner,
      riskOwner,
      costUsd,
      costVnd: Math.round(costUsd * FX_USD_TO_VND),
    };
  });

  const sellerCostUsd = round2(sellerSum);
  const buyerCostUsd = round2(buyerSum);
  const totalLogistics = Math.max(0.01, sellerCostUsd + buyerCostUsd);
  const sellerSharePct = round1((sellerCostUsd / totalLogistics) * 100);
  const buyerSharePct = round1(Math.max(0, 100 - sellerSharePct));

  return {
    sellerCostUsd,
    buyerCostUsd,
    sellerSharePct,
    buyerSharePct,
    stages,
  };
}

/**
 * Computes exact ICC Incoterms 2020 Seller vs Buyer Cost & Risk transfer allocation
 * across all 8 physical handover stages for EXW, FCA, FOB, CFR, CIF, DAP, and DDP.
 */
export function calculateIncotermsAllocation(
  input: IncotermsAllocationInput,
): IncotermsAllocationResult {
  const code: Incoterm2020Code = INCOTERM_RULES[input.incoterm]
    ? input.incoterm
    : 'CIF';
  const rule = INCOTERM_RULES[code];
  const cargoValueUsd = Math.max(1000, round2(Number(input.cargoValueUsd) || 1000));
  const stageCosts = buildStageCosts(input);

  const activeCalc = computeSingleIncotermTotals(code, stageCosts);
  const totalLogisticsCostUsd = round2(
    activeCalc.sellerCostUsd + activeCalc.buyerCostUsd,
  );

  const riskStageMeta = INCOTERM_STAGES[rule.riskTransferStageIndex - 1];
  const costStageMeta = INCOTERM_STAGES[rule.costTransferStageIndex - 1];

  const allTermsComparison: IncotermComparisonRow[] = INCOTERMS_2020_ORDER.map(
    (termCode) => {
      const termRule = INCOTERM_RULES[termCode];
      const totals = computeSingleIncotermTotals(termCode, stageCosts);
      return {
        code: termCode,
        fullNameEn: termRule.fullNameEn,
        fullNameVi: termRule.fullNameVi,
        sellerCostUsd: totals.sellerCostUsd,
        buyerCostUsd: totals.buyerCostUsd,
        sellerSharePct: totals.sellerSharePct,
        buyerSharePct: totals.buyerSharePct,
        riskTransferStageIndex: termRule.riskTransferStageIndex,
        costTransferStageIndex: termRule.costTransferStageIndex,
        hasCostRiskSplit:
          termRule.riskTransferStageIndex !== termRule.costTransferStageIndex,
        insuranceRequired: termRule.insuranceRequired,
        seaOnly: termRule.seaOnly,
      };
    },
  );

  return {
    incoterm: code,
    fullNameEn: rule.fullNameEn,
    fullNameVi: rule.fullNameVi,
    groupCode: rule.groupCode,
    seaOnly: rule.seaOnly,
    transportScopeEn: rule.seaOnly
      ? 'Sea & Inland Waterway Only'
      : 'Any Mode (Ocean / Air / Road / Multimodal)',
    transportScopeVi: rule.seaOnly
      ? 'Chỉ Đường biển & Thủy nội địa'
      : 'Mọi Phương thức (Biển / Hàng không / Bộ / Đa phương thức)',
    cargoValueUsd,
    totalLogisticsCostUsd,
    totalLogisticsCostVnd: Math.round(totalLogisticsCostUsd * FX_USD_TO_VND),
    sellerCostUsd: activeCalc.sellerCostUsd,
    sellerCostVnd: Math.round(activeCalc.sellerCostUsd * FX_USD_TO_VND),
    buyerCostUsd: activeCalc.buyerCostUsd,
    buyerCostVnd: Math.round(activeCalc.buyerCostUsd * FX_USD_TO_VND),
    sellerSharePct: activeCalc.sellerSharePct,
    buyerSharePct: activeCalc.buyerSharePct,
    sellerTotalContractUsd: round2(cargoValueUsd + activeCalc.sellerCostUsd),
    buyerTotalOutlayUsd: round2(cargoValueUsd + totalLogisticsCostUsd),
    riskTransferStageIndex: rule.riskTransferStageIndex,
    riskTransferStageLabelEn: riskStageMeta.labelEn,
    riskTransferStageLabelVi: riskStageMeta.labelVi,
    costTransferStageIndex: rule.costTransferStageIndex,
    costTransferStageLabelEn: costStageMeta.labelEn,
    costTransferStageLabelVi: costStageMeta.labelVi,
    hasCostRiskSplit:
      rule.riskTransferStageIndex !== rule.costTransferStageIndex,
    insuranceRequired: rule.insuranceRequired,
    insuranceCoverageEn: rule.insuranceCoverageEn,
    insuranceCoverageVi: rule.insuranceCoverageVi,
    complianceWarningsEn: rule.warningsEn,
    complianceWarningsVi: rule.warningsVi,
    stages: activeCalc.stages,
    allTermsComparison,
  };
}
