import { FX_USD_TO_VND, VIETQR_CONFIG } from '../data/corridors';
import type { I18nDict } from '../data/i18n';
import { formatMoney, formatVnd } from '../engines/freight';
import { buildVietQrPayload } from '../engines/vietQr';
import type { Currency, Lang, WaybillRecord } from '../types/logistics';
import { CloseIcon, MeridianLogo, PrinterIcon } from './Icons';
import { QrSvg } from './QrSvg';

interface BillOfLadingDocumentProps {
  waybill: WaybillRecord;
  lang: Lang;
  currency: Currency;
}

function BillOfLadingSheet({
  waybill,
  lang,
  currency,
}: BillOfLadingDocumentProps) {
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
            label={`Bill of Lading QR ${waybill.id}`}
          />
          <span className="font-mono-tech mt-1 text-[9px] text-[#475569]">
            VIETQR / E-BL
          </span>
        </div>
      </div>

      {/* Routing & Vessel Matrix */}
      <div className="grid grid-cols-2 border-x border-b border-[#0f172a] text-xs sm:grid-cols-4">
        <div className="border-r border-b border-[#0f172a] p-2.5 sm:border-b-0">
          <div className="font-mono-tech text-[9px] font-bold uppercase text-[#475569]">
            VESSEL / FLIGHT & VOYAGE
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
                DESCRIPTION OF GOODS & HS CODE
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
            FREIGHT & SETTLEMENT SUMMARY
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
            <span>VietQR Techcombank (970407):</span>
            <span>{VIETQR_CONFIG.accountNumber}</span>
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

interface BillOfLadingPrintProps {
  t: I18nDict;
  lang: Lang;
  currency: Currency;
  printWaybill: WaybillRecord;
  modalWaybill: WaybillRecord | null;
  onCloseModal: () => void;
}

export function BillOfLadingPrint({
  t,
  lang,
  currency,
  printWaybill,
  modalWaybill,
  onCloseModal,
}: BillOfLadingPrintProps) {
  const activeForPrint = modalWaybill ?? printWaybill;

  return (
    <>
      {/* Hidden on screen, razor-sharp A4 layout during window.print() */}
      <div className="print-only-bl">
        <BillOfLadingSheet
          waybill={activeForPrint}
          lang={lang}
          currency={currency}
        />
      </div>

      {/* Interactive A4 Preview Modal */}
      {modalWaybill && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={t.blModalTitle}
        >
          <div className="panel-card flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
              <div className="font-mono-tech text-xs font-bold text-[var(--text)]">
                {t.blModalTitle} · {modalWaybill.blNumber}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  data-testid="trigger-print-bl"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--accent-cyan)] px-3.5 py-1.5 text-xs font-bold text-white hover:opacity-90"
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
                <BillOfLadingSheet
                  waybill={modalWaybill}
                  lang={lang}
                  currency={currency}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
