import { FX_USD_TO_VND, VIETQR_CONFIG } from '../data/corridors';
import type { I18nDict } from '../data/i18n';
import { formatMoney, formatVnd } from '../engines/freight';
import { buildVietQrPayload } from '../engines/vietQr';
import type {
  CargoSkuItem,
  ContainerSpec,
  Currency,
  CustomsDutyResult,
  Lang,
  PrintDocTab,
  WaybillRecord,
} from '../types/logistics';
import { CloseIcon, MeridianLogo, PrinterIcon } from './Icons';
import { QrSvg } from './QrSvg';

interface DocumentSheetProps {
  waybill: WaybillRecord;
  lang: Lang;
  currency: Currency;
  packingSkus: CargoSkuItem[];
  packingContainer: ContainerSpec;
  customsResult: CustomsDutyResult;
}

function BillOfLadingSheet({
  waybill,
  lang,
  currency,
}: Pick<DocumentSheetProps, 'waybill' | 'lang' | 'currency'>) {
  const totalVnd = Math.round(waybill.totalFreightUsd * FX_USD_TO_VND);
  const depositVnd = Math.round(totalVnd * VIETQR_CONFIG.depositRatio);
  const verifyQrPayload = buildVietQrPayload(
    depositVnd,
    `${waybill.id} BL VERIFY`,
  );

  return (
    <div className="bg-white p-6 text-[#0f172a] sm:p-8">
      {/* Official Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#0f172a] pb-4">
        <div className="flex items-center gap-3">
          <MeridianLogo className="h-10 w-10 text-[#0f172a]" />
          <div>
            <div className="text-lg font-extrabold tracking-tight text-[#0f172a]">
              MERIDIAN GLOBAL LOGISTICS JSC
            </div>
            <div className="font-mono-tech text-[10px] tracking-[0.14em] text-[#475569]">
              OCEAN BILL OF LADING / MULTIMODAL TRANSPORT DOCUMENT
            </div>
            <div className="text-[11px] text-[#475569]">
              Saigon Maritime Tower, Dist. 1, Ho Chi Minh City · ISO 28000 / AEO Certified
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="font-mono-tech inline-block border border-[#0f172a] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            ORIGINAL — NON-NEGOTIABLE COPY
          </div>
          <div className="font-mono-tech mt-1.5 text-sm font-bold">
            B/L NO: {waybill.blNumber}
          </div>
          <div className="font-mono-tech text-xs text-[#475569]">
            WAYBILL: {waybill.id} · ISSUED: {waybill.createdAt.slice(0, 10)}
          </div>
        </div>
      </div>

      {/* Shipper / Consignee / Verification QR Grid */}
      <div className="mt-4 grid grid-cols-1 border border-[#0f172a] sm:grid-cols-12">
        <div className="border-b border-[#0f172a] p-3 sm:col-span-5 sm:border-r sm:border-b-0">
          <div className="font-mono-tech text-[10px] font-bold uppercase text-[#475569]">
            1. SHIPPER / EXPORTER
          </div>
          <div className="mt-1 text-sm font-bold">{waybill.shipperCompany}</div>
          <div className="text-xs text-[#334155]">Attn: {waybill.shipperName}</div>
          <div className="mt-1 text-xs text-[#334155]">
            {lang === 'vi' ? waybill.originLabelVi : waybill.originLabelEn} ({waybill.originCode})
          </div>
        </div>

        <div className="border-b border-[#0f172a] p-3 sm:col-span-5 sm:border-r sm:border-b-0">
          <div className="font-mono-tech text-[10px] font-bold uppercase text-[#475569]">
            2. CONSIGNEE / IMPORTER
          </div>
          <div className="mt-1 text-sm font-bold">{waybill.consigneeCompany}</div>
          <div className="text-xs text-[#334155]">Attn: {waybill.consigneeName}</div>
          <div className="mt-1 text-xs text-[#334155]">
            {lang === 'vi' ? waybill.destLabelVi : waybill.destLabelEn} ({waybill.destCode})
          </div>
        </div>

        <div className="flex flex-col items-center justify-center p-2.5 sm:col-span-2">
          <QrSvg
            value={verifyQrPayload}
            sizePx={88}
            label={`MBBank VietQR ${waybill.id}`}
          />
          <span className="font-mono-tech mt-1 text-[9px] text-[#475569]">
            MBBANK VIETQR
          </span>
        </div>
      </div>

      {/* Routing & Vessel Matrix */}
      <div className="grid grid-cols-2 border-x border-b border-[#0f172a] text-xs sm:grid-cols-4">
        <div className="border-r border-b border-[#0f172a] p-2.5 sm:border-b-0">
          <div className="font-mono-tech text-[9px] font-bold uppercase text-[#475569]">
            VESSEL / FLIGHT &amp; VOYAGE
          </div>
          <div className="font-mono-tech mt-0.5 font-semibold">
            {waybill.vesselOrFlight}
          </div>
        </div>
        <div className="border-b border-[#0f172a] p-2.5 sm:border-r sm:border-b-0">
          <div className="font-mono-tech text-[9px] font-bold uppercase text-[#475569]">
            PORT OF LOADING
          </div>
          <div className="mt-0.5 font-semibold">
            {waybill.originCode} · {waybill.originLabelEn}
          </div>
        </div>
        <div className="border-r border-[#0f172a] p-2.5">
          <div className="font-mono-tech text-[9px] font-bold uppercase text-[#475569]">
            PORT OF DISCHARGE
          </div>
          <div className="mt-0.5 font-semibold">
            {waybill.destCode} · {waybill.destLabelEn}
          </div>
        </div>
        <div className="p-2.5">
          <div className="font-mono-tech text-[9px] font-bold uppercase text-[#475569]">
            INCOTERMS 2020 / ETA
          </div>
          <div className="font-mono-tech mt-0.5 font-bold">
            {waybill.incoterm} · ETA {waybill.etaDate}
          </div>
        </div>
      </div>

      {/* Cargo Particulars Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse border border-[#0f172a] text-left text-xs">
          <thead>
            <tr className="bg-[#f1f5f9]">
              <th className="font-mono-tech border border-[#0f172a] px-2.5 py-2 text-[10px]">
                CONTAINER / SEAL NO.
              </th>
              <th className="font-mono-tech border border-[#0f172a] px-2.5 py-2 text-[10px]">
                PKGS
              </th>
              <th className="font-mono-tech border border-[#0f172a] px-2.5 py-2 text-[10px]">
                DESCRIPTION OF GOODS &amp; HS CODE
              </th>
              <th className="font-mono-tech border border-[#0f172a] px-2.5 py-2 text-[10px]">
                GROSS (KG)
              </th>
              <th className="font-mono-tech border border-[#0f172a] px-2.5 py-2 text-[10px]">
                VOLUME (CBM)
              </th>
              <th className="font-mono-tech border border-[#0f172a] px-2.5 py-2 text-[10px]">
                CHARGEABLE
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-mono-tech border border-[#0f172a] px-2.5 py-3 align-top">
                <div className="font-bold">{waybill.containerOrAwb}</div>
                <div className="mt-1 text-[10px] text-[#475569]">
                  SEAL: {waybill.sealNumber}
                </div>
                {waybill.reeferTempC !== null &&
                  waybill.reeferTempC !== undefined && (
                    <div className="mt-1 text-[10px] font-semibold text-[#0284c7]">
                      TEMP SET: {waybill.reeferTempC}°C / {waybill.humidityPct ?? 50}% RH
                    </div>
                  )}
              </td>
              <td className="font-mono-tech border border-[#0f172a] px-2.5 py-3 align-top font-bold">
                {waybill.packages}
              </td>
              <td className="border border-[#0f172a] px-2.5 py-3 align-top">
                <div className="font-bold">
                  {lang === 'vi' ? waybill.commodityVi : waybill.commodityEn}
                </div>
                <div className="font-mono-tech mt-1 text-[10px] text-[#475569]">
                  HS TARIFF CODE: {waybill.hsCode} · MODE: {waybill.mode.toUpperCase()}
                </div>
                <div className="mt-1 text-[10px] text-[#475569]">
                  SHIPPER&apos;S LOAD, STOW AND COUNT · CLEAN ON BOARD
                </div>
              </td>
              <td className="font-mono-tech border border-[#0f172a] px-2.5 py-3 align-top font-semibold">
                {waybill.grossWeightKg.toLocaleString('en-US')}
              </td>
              <td className="font-mono-tech border border-[#0f172a] px-2.5 py-3 align-top font-semibold">
                {waybill.volumeCbm.toFixed(3)}
              </td>
              <td className="font-mono-tech border border-[#0f172a] px-2.5 py-3 align-top font-bold">
                {waybill.chargeableWeightKg.toLocaleString('en-US')} kg
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Freight Summary & Carrier Attestation */}
      <div className="mt-4 grid grid-cols-1 gap-4 border border-[#0f172a] p-3 text-xs sm:grid-cols-2">
        <div>
          <div className="font-mono-tech text-[10px] font-bold uppercase text-[#475569]">
            FREIGHT &amp; MBBANK VIETQR SETTLEMENT
          </div>
          <div className="font-mono-tech mt-1.5 flex justify-between">
            <span>Total Assessed Freight:</span>
            <strong>{formatMoney(waybill.totalFreightUsd, currency)}</strong>
          </div>
          <div className="font-mono-tech mt-0.5 flex justify-between text-[#475569]">
            <span>VND Equivalent (FX {FX_USD_TO_VND.toLocaleString('en-US')}):</span>
            <span>{formatVnd(totalVnd)}</span>
          </div>
          <div className="font-mono-tech mt-0.5 flex justify-between text-[#475569]">
            <span>
              {VIETQR_CONFIG.bankName} ({VIETQR_CONFIG.bankBin}):
            </span>
            <span>
              {VIETQR_CONFIG.accountNumber} · {VIETQR_CONFIG.accountHolder}
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between border-t border-[#cbd5e1] pt-3 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
          <div className="text-[10px] leading-relaxed text-[#475569]">
            RECEIVED by the Carrier in apparent good order and condition unless otherwise stated herein, to be transported subject to Meridian Global Standard Trading Conditions &amp; Hague-Visby Rules.
          </div>
          <div className="mt-4 flex items-end justify-between border-t border-dashed border-[#64748b] pt-2">
            <span className="font-mono-tech text-[10px] font-bold">
              SIGNED AS CARRIER: MERIDIAN CONTROL TOWER
            </span>
            <span className="font-mono-tech text-[10px] text-[#475569]">
              DIGITALLY VERIFIED
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommercialInvoiceSheet({
  waybill,
  lang,
  currency,
  customsResult,
}: Pick<
  DocumentSheetProps,
  'waybill' | 'lang' | 'currency' | 'customsResult'
>) {
  const digits = waybill.id.replace('MRD-', '');
  const invoiceNo = `INV-2026-${digits}`;
  const fobUsd = Math.max(
    customsResult.fobValueUsd,
    Math.round(waybill.totalFreightUsd * 8.5),
  );
  const freightUsd = waybill.totalFreightUsd;
  const insuranceUsd = Math.round(fobUsd * 0.0045);
  const totalInvoiceUsd = fobUsd + freightUsd + insuranceUsd;
  const totalInvoiceVnd = Math.round(totalInvoiceUsd * FX_USD_TO_VND);
  const depositVnd = Math.round(
    Math.round(waybill.totalFreightUsd * FX_USD_TO_VND) *
      VIETQR_CONFIG.depositRatio,
  );
  const qrPayload = buildVietQrPayload(depositVnd, `${invoiceNo} MERIDIAN`);
  const unitPriceUsd =
    waybill.packages > 0 ? fobUsd / waybill.packages : fobUsd;

  return (
    <div className="bg-white p-6 text-[#0f172a] sm:p-8" data-testid="sheet-commercial-invoice">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#0f172a] pb-4">
        <div className="flex items-center gap-3">
          <MeridianLogo className="h-10 w-10 text-[#0f172a]" />
          <div>
            <div className="text-lg font-extrabold tracking-tight text-[#0f172a]">
              COMMERCIAL INVOICE
            </div>
            <div className="font-mono-tech text-[10px] tracking-[0.14em] text-[#475569]">
              MERIDIAN GLOBAL SUPPLY CHAIN · CUSTOMS &amp; FTA DECLARATION
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono-tech text-sm font-bold">
            INVOICE NO: {invoiceNo}
          </div>
          <div className="font-mono-tech text-xs text-[#475569]">
            DATE: {waybill.createdAt.slice(0, 10)} · B/L: {waybill.blNumber}
          </div>
          <div className="font-mono-tech mt-1 inline-block border border-[#0f172a] px-2 py-0.5 text-[10px] font-bold">
            INCOTERMS 2020: {waybill.incoterm} · FTA: {customsResult.regime}
          </div>
        </div>
      </div>

      {/* Exporter / Importer Grid */}
      <div className="mt-4 grid grid-cols-1 border border-[#0f172a] text-xs sm:grid-cols-2">
        <div className="border-b border-[#0f172a] p-3 sm:border-r sm:border-b-0">
          <div className="font-mono-tech text-[10px] font-bold uppercase text-[#475569]">
            EXPORTER / SELLER
          </div>
          <div className="mt-1 text-sm font-bold">{waybill.shipperCompany}</div>
          <div className="text-[#334155]">Contact: {waybill.shipperName}</div>
          <div className="mt-0.5 text-[#334155]">
            Origin: {lang === 'vi' ? waybill.originLabelVi : waybill.originLabelEn} ({waybill.originCode})
          </div>
          <div className="font-mono-tech mt-1 text-[10px] text-[#475569]">
            TAX ID / EORI: VN-0316884120 · REX REGISTERED
          </div>
        </div>
        <div className="p-3">
          <div className="font-mono-tech text-[10px] font-bold uppercase text-[#475569]">
            CONSIGNEE / BUYER
          </div>
          <div className="mt-1 text-sm font-bold">{waybill.consigneeCompany}</div>
          <div className="text-[#334155]">Contact: {waybill.consigneeName}</div>
          <div className="mt-0.5 text-[#334155]">
            Destination: {lang === 'vi' ? waybill.destLabelVi : waybill.destLabelEn} ({waybill.destCode})
          </div>
          <div className="font-mono-tech mt-1 text-[10px] text-[#475569]">
            PAYMENT TERMS: T/T &amp; MBBANK VIETQR SETTLEMENT
          </div>
        </div>
      </div>

      {/* Commercial Line Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse border border-[#0f172a] text-left text-xs">
          <thead>
            <tr className="bg-[#f1f5f9]">
              <th className="font-mono-tech border border-[#0f172a] px-2.5 py-2 text-[10px]">
                ITEM
              </th>
              <th className="font-mono-tech border border-[#0f172a] px-2.5 py-2 text-[10px]">
                HS CODE
              </th>
              <th className="font-mono-tech border border-[#0f172a] px-2.5 py-2 text-[10px]">
                DESCRIPTION OF GOODS
              </th>
              <th className="font-mono-tech border border-[#0f172a] px-2.5 py-2 text-right text-[10px]">
                QTY (PKGS)
              </th>
              <th className="font-mono-tech border border-[#0f172a] px-2.5 py-2 text-right text-[10px]">
                UNIT PRICE
              </th>
              <th className="font-mono-tech border border-[#0f172a] px-2.5 py-2 text-right text-[10px]">
                AMOUNT
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="font-mono-tech border border-[#0f172a] px-2.5 py-2.5">
                01
              </td>
              <td className="font-mono-tech border border-[#0f172a] px-2.5 py-2.5 font-bold">
                {waybill.hsCode}
              </td>
              <td className="border border-[#0f172a] px-2.5 py-2.5">
                <div className="font-bold">
                  {lang === 'vi' ? waybill.commodityVi : waybill.commodityEn}
                </div>
                <div className="font-mono-tech mt-0.5 text-[10px] text-[#475569]">
                  Container/AWB: {waybill.containerOrAwb} · Country of Origin: VIETNAM
                </div>
              </td>
              <td className="font-mono-tech border border-[#0f172a] px-2.5 py-2.5 text-right">
                {waybill.packages}
              </td>
              <td className="font-mono-tech border border-[#0f172a] px-2.5 py-2.5 text-right">
                {formatMoney(unitPriceUsd, currency)}
              </td>
              <td className="font-mono-tech border border-[#0f172a] px-2.5 py-2.5 text-right font-bold">
                {formatMoney(fobUsd, currency)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Valuation Totals & MBBank VietQR Settlement */}
      <div className="mt-4 grid grid-cols-1 gap-4 border border-[#0f172a] p-3.5 text-xs sm:grid-cols-12">
        <div className="flex items-center gap-3 sm:col-span-6">
          <QrSvg
            value={qrPayload}
            sizePx={96}
            label={`MBBank VietQR Commercial Invoice ${invoiceNo}`}
          />
          <div className="space-y-0.5">
            <div className="font-mono-tech text-[10px] font-bold uppercase text-[#0284c7]">
              LIVE MBBANK VIETQR (NAPAS 247)
            </div>
            <div className="font-mono-tech font-bold">
              {VIETQR_CONFIG.bankName} · BIN {VIETQR_CONFIG.bankBin}
            </div>
            <div className="font-mono-tech font-bold text-[#0f172a]">
              ACC: {VIETQR_CONFIG.accountNumber}
            </div>
            <div className="font-mono-tech text-[11px] text-[#334155]">
              {VIETQR_CONFIG.accountHolder}
            </div>
            <div className="font-mono-tech text-[10px] text-[#475569]">
              20% Freight Deposit: {formatVnd(depositVnd)}
            </div>
          </div>
        </div>

        <div className="space-y-1.5 border-t border-[#cbd5e1] pt-3 sm:col-span-6 sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
          <div className="font-mono-tech flex justify-between">
            <span>FOB Subtotal:</span>
            <span>{formatMoney(fobUsd, currency)}</span>
          </div>
          <div className="font-mono-tech flex justify-between">
            <span>International Freight:</span>
            <span>{formatMoney(freightUsd, currency)}</span>
          </div>
          <div className="font-mono-tech flex justify-between">
            <span>Marine / Air Insurance (0.45%):</span>
            <span>{formatMoney(insuranceUsd, currency)}</span>
          </div>
          <div className="font-mono-tech flex justify-between border-t border-[#0f172a] pt-1.5 text-sm font-extrabold">
            <span>TOTAL {waybill.incoterm} INVOICE VALUE:</span>
            <span>{formatMoney(totalInvoiceUsd, currency)}</span>
          </div>
          <div className="font-mono-tech flex justify-between text-[10px] text-[#475569]">
            <span>VND Customs Valuation Ref:</span>
            <span>{formatVnd(totalInvoiceVnd)}</span>
          </div>
        </div>
      </div>

      {/* Origin / FTA Attestation */}
      <div className="mt-4 border border-[#0f172a] bg-[#f8fafc] p-3 text-[10px] leading-relaxed text-[#334155]">
        <strong className="font-mono-tech text-[#0f172a]">
          FTA ORIGIN DECLARATION ({customsResult.regime} · DUTY {customsResult.appliedDutyRatePct}% / VAT {customsResult.vatRatePct}%):
        </strong>{' '}
        The exporter of the products covered by this document declares that, except where otherwise clearly indicated, these products are of Vietnam preferential origin under {customsResult.regime} rules of origin.
      </div>
    </div>
  );
}

function PackingListSheet({
  waybill,
  packingSkus,
  packingContainer,
}: Pick<DocumentSheetProps, 'waybill' | 'packingSkus' | 'packingContainer'>) {
  const digits = waybill.id.replace('MRD-', '');
  const plNo = `PKL-2026-${digits}`;

  const rows =
    packingSkus.length > 0
      ? packingSkus.map((sku, idx) => {
          const unitCbm =
            (sku.lengthCm * sku.widthCm * sku.heightCm) / 1_000_000;
          const totalCbm = unitCbm * sku.qty;
          const totalGross = sku.weightKg * sku.qty;
          const totalNet = Math.round(totalGross * 0.92 * 10) / 10;
          return {
            mark: `MRD-${idx + 1}/${packingSkus.length} · ${sku.skuCode}`,
            desc: sku.name,
            dims: `${sku.lengthCm}×${sku.widthCm}×${sku.heightCm}`,
            qty: sku.qty,
            netKg: totalNet,
            grossKg: totalGross,
            cbm: totalCbm,
            handling: sku.stackable ? 'STACKABLE' : 'TOP-LOAD ONLY',
          };
        })
      : [
          {
            mark: `MRD-1/1 · ${waybill.id}`,
            desc: waybill.commodityEn,
            dims: '120×80×95',
            qty: waybill.packages,
            netKg: Math.round(waybill.grossWeightKg * 0.92),
            grossKg: waybill.grossWeightKg,
            cbm: waybill.volumeCbm,
            handling: 'STANDARD',
          },
        ];

  const totalQty = rows.reduce((s, r) => s + r.qty, 0);
  const totalNet = rows.reduce((s, r) => s + r.netKg, 0);
  const totalGross = rows.reduce((s, r) => s + r.grossKg, 0);
  const totalCbm = rows.reduce((s, r) => s + r.cbm, 0);

  return (
    <div className="bg-white p-6 text-[#0f172a] sm:p-8" data-testid="sheet-packing-list">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-[#0f172a] pb-4">
        <div className="flex items-center gap-3">
          <MeridianLogo className="h-10 w-10 text-[#0f172a]" />
          <div>
            <div className="text-lg font-extrabold tracking-tight text-[#0f172a]">
              PACKING LIST &amp; SOLAS e-VGM SCHEDULE
            </div>
            <div className="font-mono-tech text-[10px] tracking-[0.14em] text-[#475569]">
              MERIDIAN CONTAINER LAB · LOAD PLAN SPECIFICATION
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono-tech text-sm font-bold">
            PACKING LIST: {plNo}
          </div>
          <div className="font-mono-tech text-xs text-[#475569]">
            CONTAINER: {packingContainer.nameEn} ({packingContainer.code})
          </div>
          <div className="font-mono-tech text-xs text-[#475569]">
            WAYBILL: {waybill.id} · SEAL: {waybill.sealNumber}
          </div>
        </div>
      </div>

      {/* Container Spec Banner */}
      <div className="mt-4 grid grid-cols-2 border border-[#0f172a] bg-[#f8fafc] text-xs sm:grid-cols-4">
        <div className="border-r border-b border-[#0f172a] p-2.5 sm:border-b-0">
          <div className="font-mono-tech text-[9px] font-bold text-[#475569]">
            EQUIPMENT TYPE
          </div>
          <div className="font-mono-tech font-bold">{packingContainer.nameEn}</div>
        </div>
        <div className="border-b border-[#0f172a] p-2.5 sm:border-r sm:border-b-0">
          <div className="font-mono-tech text-[9px] font-bold text-[#475569]">
            INTERNAL CLEARANCE
          </div>
          <div className="font-mono-tech font-bold">
            {packingContainer.innerLengthCm}×{packingContainer.innerWidthCm}×
            {packingContainer.innerHeightCm} cm
          </div>
        </div>
        <div className="border-r border-[#0f172a] p-2.5">
          <div className="font-mono-tech text-[9px] font-bold text-[#475569]">
            TARE + CARGO (e-VGM)
          </div>
          <div className="font-mono-tech font-bold">
            {(packingContainer.tareWeightKg + totalGross).toLocaleString('en-US')} kg
          </div>
        </div>
        <div className="p-2.5">
          <div className="font-mono-tech text-[9px] font-bold text-[#475569]">
            ROUTING / VESSEL
          </div>
          <div className="font-mono-tech font-bold">
            {waybill.originCode} → {waybill.destCode}
          </div>
        </div>
      </div>

      {/* Multi-SKU Carton Schedule */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse border border-[#0f172a] text-left text-xs">
          <thead>
            <tr className="bg-[#f1f5f9]">
              <th className="font-mono-tech border border-[#0f172a] px-2 py-2 text-[10px]">
                MARKS &amp; SKU
              </th>
              <th className="font-mono-tech border border-[#0f172a] px-2 py-2 text-[10px]">
                DESCRIPTION &amp; HANDLING
              </th>
              <th className="font-mono-tech border border-[#0f172a] px-2 py-2 text-[10px]">
                DIMS (CM)
              </th>
              <th className="font-mono-tech border border-[#0f172a] px-2 py-2 text-right text-[10px]">
                CTNS
              </th>
              <th className="font-mono-tech border border-[#0f172a] px-2 py-2 text-right text-[10px]">
                NET (KG)
              </th>
              <th className="font-mono-tech border border-[#0f172a] px-2 py-2 text-right text-[10px]">
                GROSS (KG)
              </th>
              <th className="font-mono-tech border border-[#0f172a] px-2 py-2 text-right text-[10px]">
                CBM
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.mark}>
                <td className="font-mono-tech border border-[#0f172a] px-2 py-2 font-bold">
                  {row.mark}
                </td>
                <td className="border border-[#0f172a] px-2 py-2">
                  <div className="font-semibold">{row.desc}</div>
                  <div className="font-mono-tech text-[9px] text-[#475569]">
                    {row.handling}
                  </div>
                </td>
                <td className="font-mono-tech border border-[#0f172a] px-2 py-2">
                  {row.dims}
                </td>
                <td className="font-mono-tech border border-[#0f172a] px-2 py-2 text-right font-bold">
                  {row.qty}
                </td>
                <td className="font-mono-tech border border-[#0f172a] px-2 py-2 text-right">
                  {row.netKg.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                </td>
                <td className="font-mono-tech border border-[#0f172a] px-2 py-2 text-right font-semibold">
                  {row.grossKg.toLocaleString('en-US', { maximumFractionDigits: 1 })}
                </td>
                <td className="font-mono-tech border border-[#0f172a] px-2 py-2 text-right font-semibold">
                  {row.cbm.toFixed(3)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#f1f5f9] font-bold">
              <td
                colSpan={3}
                className="font-mono-tech border border-[#0f172a] px-2 py-2 text-right"
              >
                TOTAL MANIFEST SUMMARY
              </td>
              <td className="font-mono-tech border border-[#0f172a] px-2 py-2 text-right">
                {totalQty}
              </td>
              <td className="font-mono-tech border border-[#0f172a] px-2 py-2 text-right">
                {totalNet.toLocaleString('en-US', { maximumFractionDigits: 1 })}
              </td>
              <td className="font-mono-tech border border-[#0f172a] px-2 py-2 text-right">
                {totalGross.toLocaleString('en-US', { maximumFractionDigits: 1 })}
              </td>
              <td className="font-mono-tech border border-[#0f172a] px-2 py-2 text-right">
                {totalCbm.toFixed(3)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Signoff Footer */}
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border border-[#0f172a] p-3 text-xs">
        <div>
          <div className="font-mono-tech text-[10px] font-bold uppercase text-[#475569]">
            SHIPPER WEIGHBRIDGE DECLARATION (SOLAS VGM METHOD 1)
          </div>
          <div className="mt-1 text-[11px] text-[#334155]">
            Shipper: <strong>{waybill.shipperCompany}</strong> · Consignee:{' '}
            <strong>{waybill.consigneeCompany}</strong>
          </div>
        </div>
        <div className="font-mono-tech border-t border-dashed border-[#64748b] pt-1 text-[10px] font-bold">
          WAREHOUSE SUPERVISOR SIGNATURE &amp; STAMP
        </div>
      </div>
    </div>
  );
}

interface BillOfLadingPrintProps {
  t: I18nDict;
  lang: Lang;
  currency: Currency;
  printWaybill: WaybillRecord;
  modalWaybill: WaybillRecord | null;
  docTab: PrintDocTab;
  setDocTab: (tab: PrintDocTab) => void;
  packingSkus: CargoSkuItem[];
  packingContainer: ContainerSpec;
  customsResult: CustomsDutyResult;
  onCloseModal: () => void;
}

export function BillOfLadingPrint({
  t,
  lang,
  currency,
  printWaybill,
  modalWaybill,
  docTab,
  setDocTab,
  packingSkus,
  packingContainer,
  customsResult,
  onCloseModal,
}: BillOfLadingPrintProps) {
  const activeForPrint = modalWaybill ?? printWaybill;

  const renderActiveSheet = (wb: WaybillRecord) => {
    if (docTab === 'invoice') {
      return (
        <CommercialInvoiceSheet
          waybill={wb}
          lang={lang}
          currency={currency}
          customsResult={customsResult}
        />
      );
    }
    if (docTab === 'packing') {
      return (
        <PackingListSheet
          waybill={wb}
          packingSkus={packingSkus}
          packingContainer={packingContainer}
        />
      );
    }
    return <BillOfLadingSheet waybill={wb} lang={lang} currency={currency} />;
  };

  return (
    <>
      {/* Hidden on screen, razor-sharp A4 layout during window.print() */}
      <div className="print-only-bl">{renderActiveSheet(activeForPrint)}</div>

      {/* Interactive A4 Preview Modal with 3 Trade Document Tabs */}
      {modalWaybill && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={t.blModalTitle}
        >
          <div className="panel-card flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'bl', label: t.docTabBl },
                    { id: 'invoice', label: t.docTabInvoice },
                    { id: 'packing', label: t.docTabPacking },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDocTab(tab.id)}
                    data-testid={`print-tab-${tab.id}`}
                    className={`cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors ${
                      docTab === tab.id
                        ? 'bg-[var(--accent-cyan)] text-white'
                        : 'border border-[var(--border)] bg-[var(--bg-panel)] text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  data-testid="trigger-print-bl"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--accent-emerald)] px-3.5 py-1.5 text-xs font-bold text-white hover:opacity-90"
                >
                  <PrinterIcon className="h-3.5 w-3.5" />
                  <span>{t.printNowBtn}</span>
                </button>
                <button
                  type="button"
                  onClick={onCloseModal}
                  aria-label={t.closeBtn}
                  data-testid="close-bl-modal"
                  className="cursor-pointer rounded-md border border-[var(--border)] p-1.5 text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-y-auto bg-[#cbd5e1] p-3 sm:p-6">
              <div className="mx-auto max-w-[794px] shadow-2xl">
                {renderActiveSheet(modalWaybill)}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
