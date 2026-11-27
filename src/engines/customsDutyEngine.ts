import { FX_USD_TO_VND } from '../data/corridors';
import type {
  CustomsDutyInput,
  CustomsDutyResult,
  FtaRegime,
  HsTariffPreset,
  RegimeComparisonRow,
} from '../types/logistics';

export const FTA_REGIME_META: Record<
  FtaRegime,
  {
    code: FtaRegime;
    labelEn: string;
    labelVi: string;
    certificateLabel: string;
    originRegionEn: string;
    originRegionVi: string;
  }
> = {
  MFN: {
    code: 'MFN',
    labelEn: 'MFN (WTO Standard)',
    labelVi: 'Thuế MFN (WTO Tiêu chuẩn)',
    certificateLabel: 'Standard Commercial Invoice',
    originRegionEn: 'Global WTO Members',
    originRegionVi: 'Các nước thành viên WTO',
  },
  EVFTA: {
    code: 'EVFTA',
    labelEn: 'EVFTA (EU – Vietnam)',
    labelVi: 'EVFTA (EU – Việt Nam)',
    certificateLabel: 'EUR.1 / REX Self-Cert',
    originRegionEn: 'European Union (27 States)',
    originRegionVi: 'Liên minh Châu Âu (EU-27)',
  },
  CPTPP: {
    code: 'CPTPP',
    labelEn: 'CPTPP (Pacific Rim)',
    labelVi: 'CPTPP (Xuyên Thái Bình Dương)',
    certificateLabel: 'CPTPP Origin Cert',
    originRegionEn: 'JP, AU, CA, SG, UK, MX...',
    originRegionVi: 'Nhật, Úc, Canada, Singapore, Anh...',
  },
  ACFTA: {
    code: 'ACFTA',
    labelEn: 'ACFTA (Form E)',
    labelVi: 'ACFTA (C/O Form E)',
    certificateLabel: 'C/O Form E (ASEAN–China)',
    originRegionEn: 'China & ASEAN Corridor',
    originRegionVi: 'Trung Quốc & Khối ASEAN',
  },
};

export const VIETNAM_HS_PRESETS: HsTariffPreset[] = [
  {
    id: 'electronics-servers',
    hsCode: '8471.50.10',
    categoryEn: 'Electronics / AI Servers',
    categoryVi: 'Điện tử / Máy chủ AI',
    descriptionEn: 'Enterprise Rackmount Servers, GPU Compute Nodes & Switching Gear',
    descriptionVi: 'Máy chủ Rackmount Doanh nghiệp, Cụm GPU AI & Thiết bị Chuyển mạch',
    mfnRatePct: 5,
    evftaRatePct: 0,
    cptppRatePct: 0,
    acftaRatePct: 0,
    defaultSctRatePct: 0,
    defaultVatRatePct: 8,
    defaultFobUsd: 128000,
    defaultFreightUsd: 4850,
    defaultInsuranceUsd: 598,
    defaultUnits: 32,
    coNoteEn: 'ITA-1 & EVFTA/CPTPP/Form E reduce import duty to 0%; eligible for VN 8% VAT relief.',
    coNoteVi: 'Ưu đãi 0% theo EVFTA/CPTPP/Form E; áp dụng mức thuế GTGT giảm 8% theo Nghị định VN.',
  },
  {
    id: 'industrial-machinery',
    hsCode: '8457.10.00',
    categoryEn: 'Industrial Machinery',
    categoryVi: 'Máy móc Công nghiệp CNC',
    descriptionEn: '5-Axis CNC Machining Centers, SMT Lines & Robotics Arms',
    descriptionVi: 'Trung tâm Gia công CNC 5 trục, Dây chuyền SMT & Cánh tay Robot',
    mfnRatePct: 10,
    evftaRatePct: 0,
    cptppRatePct: 0,
    acftaRatePct: 0,
    defaultSctRatePct: 0,
    defaultVatRatePct: 8,
    defaultFobUsd: 185000,
    defaultFreightUsd: 5600,
    defaultInsuranceUsd: 858,
    defaultUnits: 4,
    coNoteEn: 'Zero-duty capital equipment under EVFTA (EUR.1), CPTPP, and ACFTA Form E.',
    coNoteVi: 'Thuế nhập khẩu 0% cho máy móc tạo tài sản cố định khi xuất trình EUR.1 / CPTPP / Form E.',
  },
  {
    id: 'apparel-textiles',
    hsCode: '6201.40.90',
    categoryEn: 'Apparel / Textiles',
    categoryVi: 'May mặc / Vải kỹ thuật',
    descriptionEn: 'Technical Waterproof Outerwear, Performance Fabrics & Garment Lots',
    descriptionVi: 'Áo khoác Kỹ thuật Chống thấm, Vải chức năng & Lô hàng Thời trang',
    mfnRatePct: 20,
    evftaRatePct: 3.5,
    cptppRatePct: 0,
    acftaRatePct: 5,
    defaultSctRatePct: 0,
    defaultVatRatePct: 8,
    defaultFobUsd: 42000,
    defaultFreightUsd: 2450,
    defaultInsuranceUsd: 200,
    defaultUnits: 1200,
    coNoteEn: 'CPTPP yarn-forward grants 0% duty; EVFTA cuts MFN 20% down to 3.5%.',
    coNoteVi: 'CPTPP hưởng thuế 0% (quy tắc từ sợi trở đi); EVFTA giảm mạnh từ 20% xuống 3.5%.',
  },
  {
    id: 'specialty-coffee-agri',
    hsCode: '0901.21.20',
    categoryEn: 'Specialty Coffee / Agri',
    categoryVi: 'Cà phê Đặc sản / Nông sản',
    descriptionEn: 'Roasted Single-Origin Specialty Coffee Beans & High-Grade Extracts',
    descriptionVi: 'Cà phê Hạt Rang Đặc sản Single-Origin & Chiết xuất Nông sản Cao cấp',
    mfnRatePct: 30,
    evftaRatePct: 5,
    cptppRatePct: 4,
    acftaRatePct: 5,
    defaultSctRatePct: 0,
    defaultVatRatePct: 8,
    defaultFobUsd: 36000,
    defaultFreightUsd: 1920,
    defaultInsuranceUsd: 171,
    defaultUnits: 2400,
    coNoteEn: 'Phytosanitary certificate + FTA C/O cuts 30% MFN tariff to 4–5%.',
    coNoteVi: 'Cần Giấy kiểm dịch thực vật + C/O FTA giúp giảm thuế MFN 30% xuống chỉ còn 4–5%.',
  },
  {
    id: 'automotive-ev-parts',
    hsCode: '8708.99.80',
    categoryEn: 'Automotive EV Parts',
    categoryVi: 'Linh kiện Xe điện (EV)',
    descriptionEn: 'EV Inverter Assemblies, Thermal Pumps & Suspension Sub-Frames',
    descriptionVi: 'Cụm Biến tần Xe điện EV, Bơm nhiệt Pin & Khung gầm Treo Chính xác',
    mfnRatePct: 18,
    evftaRatePct: 6.2,
    cptppRatePct: 3.5,
    acftaRatePct: 5,
    defaultSctRatePct: 0,
    defaultVatRatePct: 10,
    defaultFobUsd: 96000,
    defaultFreightUsd: 3800,
    defaultInsuranceUsd: 449,
    defaultUnits: 160,
    coNoteEn: 'Standard 10% VAT applies to automotive assemblies; CPTPP cuts duty from 18% to 3.5%.',
    coNoteVi: 'Áp dụng VAT tiêu chuẩn 10% cho phụ tùng ô tô; CPTPP giảm thuế nhập khẩu từ 18% xuống 3.5%.',
  },
  {
    id: 'cosmetics-medical',
    hsCode: '3304.99.30',
    categoryEn: 'Cosmetics / Medical',
    categoryVi: 'Mỹ phẩm / Thiết bị Y tế',
    descriptionEn: 'Clinical Derma Serums, Aesthetic Formulas & Diagnostic Consumables',
    descriptionVi: 'Dược mỹ phẩm Lâm sàng, Tinh chất Thẩm mỹ & Vật tư Y tế Chuyên dụng',
    mfnRatePct: 20,
    evftaRatePct: 2.5,
    cptppRatePct: 0,
    acftaRatePct: 5,
    defaultSctRatePct: 10,
    defaultVatRatePct: 10,
    defaultFobUsd: 64000,
    defaultFreightUsd: 3150,
    defaultInsuranceUsd: 302,
    defaultUnits: 800,
    coNoteEn: 'Requires MoH Proclamation ID; includes 10% SCT modeling for luxury/specialty tier & 10% VAT.',
    coNoteVi: 'Yêu cầu Phiếu công bố Bộ Y tế; hỗ trợ tính thuế TTĐB (SCT) và VAT 10% chuẩn Hải quan VN.',
  },
];

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function getHsPresetById(presetId: string): HsTariffPreset {
  return (
    VIETNAM_HS_PRESETS.find((p) => p.id === presetId) ?? VIETNAM_HS_PRESETS[0]
  );
}

export function getDutyRateForRegime(
  preset: HsTariffPreset,
  regime: FtaRegime,
): number {
  switch (regime) {
    case 'MFN':
      return preset.mfnRatePct;
    case 'EVFTA':
      return preset.evftaRatePct;
    case 'CPTPP':
      return preset.cptppRatePct;
    case 'ACFTA':
      return preset.acftaRatePct;
  }
}

/**
 * Calculates Vietnam Customs CIF Valuation, Cascading Import Duty -> Special Consumption Tax (TTĐB) -> Import VAT (8%/10%),
 * Total Landed Cost, Landed Cost per Unit, and 4-Regime FTA Savings Matrix.
 */
export function calculateVietnamCustomsDuty(
  rawInput: CustomsDutyInput,
): CustomsDutyResult {
  const preset = getHsPresetById(rawInput.presetId);
  const fobValueUsd = Math.max(100, round2(Number(rawInput.fobValueUsd) || 100));
  const freightUsd = Math.max(0, round2(Number(rawInput.freightUsd) || 0));
  const insuranceUsd = Math.max(0, round2(Number(rawInput.insuranceUsd) || 0));
  const unitQuantity = Math.max(1, Math.floor(Number(rawInput.unitQuantity) || 1));
  const vatRatePct: 8 | 10 = rawInput.vatRatePct === 8 ? 8 : 10;
  const sctRatePct = Math.max(
    0,
    Math.min(150, round2(Number(rawInput.sctRatePct) || 0)),
  );
  const localClearanceFeesUsd = Math.max(
    0,
    round2(Number(rawInput.localClearanceFeesUsd) || 0),
  );

  const cifValueUsd = round2(fobValueUsd + freightUsd + insuranceUsd);
  const cifValueVnd = Math.round(cifValueUsd * FX_USD_TO_VND);

  const computeForRegime = (regime: FtaRegime) => {
    const dutyRatePct = getDutyRateForRegime(preset, regime);
    const importDutyUsd = round2(cifValueUsd * (dutyRatePct / 100));
    const sctUsd = round2((cifValueUsd + importDutyUsd) * (sctRatePct / 100));
    const vatUsd = round2(
      (cifValueUsd + importDutyUsd + sctUsd) * (vatRatePct / 100),
    );
    const totalTaxesUsd = round2(importDutyUsd + sctUsd + vatUsd);
    const totalLandedCostUsd = round2(
      cifValueUsd + totalTaxesUsd + localClearanceFeesUsd,
    );
    const totalLandedCostVnd = Math.round(totalLandedCostUsd * FX_USD_TO_VND);
    const landedCostPerUnitUsd = round2(totalLandedCostUsd / unitQuantity);

    return {
      regime,
      certificateLabel: FTA_REGIME_META[regime].certificateLabel,
      dutyRatePct,
      importDutyUsd,
      sctUsd,
      vatUsd,
      totalTaxesUsd,
      totalLandedCostUsd,
      totalLandedCostVnd,
      landedCostPerUnitUsd,
    };
  };

  const regimes: FtaRegime[] = ['MFN', 'EVFTA', 'CPTPP', 'ACFTA'];
  const rawComparisons = regimes.map(computeForRegime);
  const mfnRow = rawComparisons[0];

  const comparisons: RegimeComparisonRow[] = rawComparisons.map((row) => {
    const savingsVsMfnUsd = round2(
      Math.max(0, mfnRow.totalLandedCostUsd - row.totalLandedCostUsd),
    );
    return {
      ...row,
      savingsVsMfnUsd,
      savingsVsMfnVnd: Math.round(savingsVsMfnUsd * FX_USD_TO_VND),
    };
  });

  const selectedRow =
    comparisons.find((c) => c.regime === rawInput.regime) ?? comparisons[0];

  // Determine optimal regime (lowest total landed cost, preferring FTA over MFN on tie)
  let bestRow = comparisons[0];
  for (const row of comparisons) {
    if (row.totalLandedCostUsd < bestRow.totalLandedCostUsd) {
      bestRow = row;
    }
  }

  const effectiveTaxBurdenPct =
    cifValueUsd > 0
      ? round2((selectedRow.totalTaxesUsd / cifValueUsd) * 100)
      : 0;

  const landedCostPerUnitVnd = Math.round(
    selectedRow.totalLandedCostVnd / unitQuantity,
  );

  return {
    preset,
    hsCode: (rawInput.customHsCode ?? '').trim() || preset.hsCode,
    regime: selectedRow.regime,
    unitQuantity,
    fobValueUsd,
    freightUsd,
    insuranceUsd,
    cifValueUsd,
    cifValueVnd,
    appliedDutyRatePct: selectedRow.dutyRatePct,
    sctRatePct,
    vatRatePct,
    importDutyUsd: selectedRow.importDutyUsd,
    sctUsd: selectedRow.sctUsd,
    vatUsd: selectedRow.vatUsd,
    totalTaxesUsd: selectedRow.totalTaxesUsd,
    localClearanceFeesUsd,
    totalLandedCostUsd: selectedRow.totalLandedCostUsd,
    totalLandedCostVnd: selectedRow.totalLandedCostVnd,
    landedCostPerUnitUsd: selectedRow.landedCostPerUnitUsd,
    landedCostPerUnitVnd,
    effectiveTaxBurdenPct,
    savingsVsMfnUsd: selectedRow.savingsVsMfnUsd,
    savingsVsMfnVnd: selectedRow.savingsVsMfnVnd,
    bestRegime: bestRow.regime,
    comparisons,
  };
}
