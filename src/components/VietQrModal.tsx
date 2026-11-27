import { useMemo, useState } from 'react';
import { VIETQR_CONFIG } from '../data/corridors';
import type { I18nDict } from '../data/i18n';
import { formatMoney, formatVnd } from '../engines/freight';
import { buildVietQrPayload } from '../engines/vietQr';
import type {
  BookingCustomerForm,
  Currency,
  FreightQuoteInput,
  FreightQuoteResult,
  ShippingCorridor,
  WaybillRecord,
} from '../types/logistics';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  CloseIcon,
  CopyIcon,
  PrinterIcon,
} from './Icons';
import { QrSvg } from './QrSvg';

export interface VietQrModalProps {
  t: I18nDict;
  currency: Currency;
  activeCorridor: ShippingCorridor;
  quoteInput: FreightQuoteInput;
  quote: FreightQuoteResult;
  customerForm: BookingCustomerForm;
  setCustomerForm: React.Dispatch<React.SetStateAction<BookingCustomerForm>>;
  bookedWaybill: WaybillRecord | null;
  onConfirmBooking: (e: React.FormEvent) => void;
  onClose: () => void;
  onTrackWaybill: (waybillId: string) => void;
  onPreviewBl: (waybill: WaybillRecord) => void;
}

export function VietQrModal({
  t,
  currency,
  activeCorridor,
  quoteInput,
  quote,
  customerForm,
  setCustomerForm,
  bookedWaybill,
  onConfirmBooking,
  onClose,
  onTrackWaybill,
  onPreviewBl,
}: VietQrModalProps) {
  const [copiedAccount, setCopiedAccount] = useState(false);

  const vietQrMemo = bookedWaybill
    ? `${bookedWaybill.id} MERIDIAN`
    : 'MERIDIAN FREIGHT DEPOSIT';

  const vietQrPayload = useMemo(
    () => buildVietQrPayload(quote.depositVnd, vietQrMemo),
    [quote.depositVnd, vietQrMemo],
  );

  const handleCopyAccount = async () => {
    try {
      await navigator.clipboard.writeText(VIETQR_CONFIG.accountNumber);
      setCopiedAccount(true);
      window.setTimeout(() => setCopiedAccount(false), 2000);
    } catch {
      setCopiedAccount(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t.bookingModalTitle}
    >
      <div className="panel-card max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-[var(--border)] pb-3.5">
          <div>
            <div className="font-mono-tech text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-cyan)]">
              {activeCorridor.code} · {t.modeLabels[quoteInput.mode]}
            </div>
            <h3 className="mt-0.5 text-lg font-bold text-[var(--text)]">
              {bookedWaybill ? t.bookingIssuedTitle : t.bookingModalTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="cursor-pointer rounded-md border border-[var(--border)] p-1.5 text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        {!bookedWaybill ? (
          <form onSubmit={onConfirmBooking} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)]">
                  {t.shipperName}
                </label>
                <input
                  type="text"
                  required
                  value={customerForm.shipperName}
                  onChange={(e) =>
                    setCustomerForm((f) => ({
                      ...f,
                      shipperName: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-cyan)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)]">
                  {t.shipperCompany}
                </label>
                <input
                  type="text"
                  required
                  value={customerForm.shipperCompany}
                  onChange={(e) =>
                    setCustomerForm((f) => ({
                      ...f,
                      shipperCompany: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-cyan)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)]">
                  {t.consigneeName}
                </label>
                <input
                  type="text"
                  required
                  value={customerForm.consigneeName}
                  onChange={(e) =>
                    setCustomerForm((f) => ({
                      ...f,
                      consigneeName: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-cyan)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)]">
                  {t.consigneeCompany}
                </label>
                <input
                  type="text"
                  required
                  value={customerForm.consigneeCompany}
                  onChange={(e) =>
                    setCustomerForm((f) => ({
                      ...f,
                      consigneeCompany: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-cyan)] focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[var(--text-muted)]">
                  {t.commodityDesc}
                </label>
                <input
                  type="text"
                  required
                  value={customerForm.commodity}
                  onChange={(e) =>
                    setCustomerForm((f) => ({
                      ...f,
                      commodity: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-cyan)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)]">
                  {t.hsCodeLabel}
                </label>
                <input
                  type="text"
                  required
                  value={customerForm.hsCode}
                  onChange={(e) =>
                    setCustomerForm((f) => ({
                      ...f,
                      hsCode: e.target.value,
                    }))
                  }
                  className="font-mono-tech mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-cyan)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)]">
                  {t.contactEmail}
                </label>
                <input
                  type="email"
                  required
                  value={customerForm.contactEmail}
                  onChange={(e) =>
                    setCustomerForm((f) => ({
                      ...f,
                      contactEmail: e.target.value,
                    }))
                  }
                  className="mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text)] focus:border-[var(--accent-cyan)] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 text-xs">
              <div>
                <span className="text-[var(--text-muted)]">
                  {t.totalEstimate}:{' '}
                </span>
                <strong className="font-mono-tech text-[var(--text)]">
                  {formatMoney(quote.totalUsd, currency)}
                </strong>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">
                  VietQR (20%):{' '}
                </span>
                <strong className="font-mono-tech text-[var(--accent-amber)]">
                  {formatVnd(quote.depositVnd)}
                </strong>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                {t.cancelBtn}
              </button>
              <button
                type="submit"
                data-testid="confirm-booking-submit"
                className="cursor-pointer rounded-lg bg-[var(--accent-cyan)] px-5 py-2 text-sm font-bold text-white hover:opacity-90"
              >
                {t.confirmBookingBtn}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-4 space-y-5">
            <div className="flex items-center gap-3 rounded-lg border border-[var(--accent-emerald)]/40 bg-[var(--accent-emerald-soft)] px-4 py-3">
              <CheckCircleIcon className="h-5 w-5 shrink-0 text-[var(--accent-emerald)]" />
              <div className="text-sm">
                <div className="font-bold text-[var(--text)]">
                  Waybill{' '}
                  <span
                    data-testid="issued-waybill-id"
                    className="font-mono-tech text-[var(--accent-emerald)]"
                  >
                    {bookedWaybill.id}
                  </span>{' '}
                  · {bookedWaybill.blNumber}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {bookedWaybill.containerOrAwb} · ETA {bookedWaybill.etaDate}
                </div>
              </div>
            </div>

            {/* MBBank VietQR Box */}
            <div className="grid grid-cols-1 gap-5 rounded-xl border border-[var(--border)] bg-[var(--bg-elevated)] p-4 sm:grid-cols-12 sm:items-center">
              <div className="flex flex-col items-center sm:col-span-5">
                <QrSvg
                  value={vietQrPayload}
                  sizePx={172}
                  label={`MBBank VietQR for ${bookedWaybill.id}`}
                />
                <span className="font-mono-tech mt-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--accent-amber)]">
                  NAPAS 247 · BIN {VIETQR_CONFIG.bankBin}
                </span>
              </div>
              <div className="space-y-2.5 text-xs sm:col-span-7">
                <p className="leading-relaxed text-[var(--text-muted)]">
                  {t.vietQrInstructions}
                </p>
                <div className="space-y-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-panel)] p-3">
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--text-muted)]">
                      {t.bankLabel}
                    </span>
                    <span className="font-semibold text-[var(--text)]">
                      {VIETQR_CONFIG.bankName} ({VIETQR_CONFIG.bankBin})
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--text-muted)]">
                      {t.accountNoLabel}
                    </span>
                    <span className="font-mono-tech font-bold text-[var(--accent-cyan)]">
                      {VIETQR_CONFIG.accountNumber}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--text-muted)]">
                      {t.beneficiaryLabel}
                    </span>
                    <span className="font-mono-tech font-semibold text-[var(--text)]">
                      {VIETQR_CONFIG.accountHolder}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--text-muted)]">
                      {t.depositDue}
                    </span>
                    <span className="font-mono-tech font-bold text-[var(--accent-amber)]">
                      {formatVnd(quote.depositVnd)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[var(--text-muted)]">
                      {t.transferMemoLabel}
                    </span>
                    <span className="font-mono-tech font-semibold text-[var(--text)]">
                      {vietQrMemo}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyAccount}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--border-strong)] bg-[var(--bg-panel)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:border-[var(--accent-cyan)]"
                >
                  <CopyIcon className="h-3.5 w-3.5" />
                  <span>{copiedAccount ? t.copied : t.copyAccount}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onPreviewBl(bookedWaybill);
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-4 py-2 text-xs font-semibold text-[var(--text)] hover:border-[var(--accent-cyan)]"
              >
                <PrinterIcon className="h-4 w-4" />
                <span>{t.printNewBl}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onTrackWaybill(bookedWaybill.id);
                }}
                data-testid="track-booked-waybill"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--accent-cyan)] px-4 py-2 text-xs font-bold text-white hover:opacity-90"
              >
                <span>{t.trackNewWaybill}</span>
                <ArrowRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VietQrModal;
