import { lazy, Suspense, useMemo, useState } from 'react';
import {
  CARGO_PRESETS,
  FX_USD_TO_VND,
  SHIPPING_CORRIDORS,
  VIETQR_CONFIG,
} from '../data/corridors';
import type { I18nDict } from '../data/i18n';
import {
  calculateFreightQuote,
  formatMoney,
  formatVnd,
} from '../engines/freight';
import type {
  BookingCustomerForm,
  Currency,
  FreightQuoteInput,
  Incoterm,
  Lang,
  TransportMode,
  WaybillRecord,
} from '../types/logistics';
import {
  ArrowRightIcon,
  ContainerIcon,
  PlaneIcon,
  ShieldCheckIcon,
  ShipIcon,
  TruckIcon,
} from './Icons';

const VietQrModal = lazy(() => import('./VietQrModal'));

interface FreightQuoteEngineProps {
  t: I18nDict;
  lang: Lang;
  currency: Currency;
  quoteInput: FreightQuoteInput;
  setQuoteInput: React.Dispatch<React.SetStateAction<FreightQuoteInput>>;
  onCreateBooking: (
    input: FreightQuoteInput,
    form: BookingCustomerForm,
  ) => WaybillRecord;
  onTrackWaybill: (waybillId: string) => void;
  onPreviewBl: (waybill: WaybillRecord) => void;
}

const TRANSPORT_MODES: {
  id: TransportMode;
  icon: 'plane' | 'ship' | 'container' | 'truck';
}[] = [
  { id: 'air-express', icon: 'plane' },
  { id: 'air-standard', icon: 'plane' },
  { id: 'sea-lcl', icon: 'ship' },
  { id: 'sea-fcl-20', icon: 'container' },
  { id: 'sea-fcl-40', icon: 'container' },
  { id: 'road-ftl', icon: 'truck' },
];

const INCOTERMS: Incoterm[] = ['FOB', 'CIF', 'DDP'];

function renderModeIcon(kind: 'plane' | 'ship' | 'container' | 'truck') {
  switch (kind) {
    case 'plane':
      return <PlaneIcon className="h-4 w-4 shrink-0" />;
    case 'ship':
      return <ShipIcon className="h-4 w-4 shrink-0" />;
    case 'container':
      return <ContainerIcon className="h-4 w-4 shrink-0" />;
    case 'truck':
      return <TruckIcon className="h-4 w-4 shrink-0" />;
  }
}

export function FreightQuoteEngine({
  t,
  lang,
  currency,
  quoteInput,
  setQuoteInput,
  onCreateBooking,
  onTrackWaybill,
  onPreviewBl,
}: FreightQuoteEngineProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [bookedWaybill, setBookedWaybill] = useState<WaybillRecord | null>(null);
  const [customerForm, setCustomerForm] = useState<BookingCustomerForm>({
    shipperName: 'Truong Van Tinh',
    shipperCompany: 'Saigon Precision Industries JSC',
    contactEmail: 'tinhkun102@gmail.com',
    consigneeName: 'Hendrik van der Berg',
    consigneeCompany: 'Nordic Photonics BV',
    commodity: 'Automotive LiDAR & Semiconductor Assemblies',
    hsCode: '8542.31',
  });

  const quote = useMemo(
    () => calculateFreightQuote(quoteInput),
    [quoteInput],
  );

  const activeCorridor = useMemo(
    () =>
      SHIPPING_CORRIDORS.find((c) => c.id === quoteInput.corridorId) ??
      SHIPPING_CORRIDORS[0],
    [quoteInput.corridorId],
  );

  const updateNum = (field: keyof FreightQuoteInput, raw: string) => {
    const val = Number(raw);
    setQuoteInput((prev) => ({
      ...prev,
      [field]: Number.isFinite(val) ? Math.max(0, val) : 0,
    }));
  };

  const applyPreset = (presetId: string) => {
    const p = CARGO_PRESETS.find((item) => item.id === presetId);
    if (!p) return;
    setQuoteInput((prev) => ({
      ...prev,
      mode: p.recommendedMode,
      lengthCm: p.lengthCm,
      widthCm: p.widthCm,
      heightCm: p.heightCm,
      grossWeightKg: p.grossWeightKg,
      packages: p.packages,
      declaredValueUsd: p.declaredValueUsd,
      reeferMonitoring: p.reefer,
    }));
    setCustomerForm((prev) => ({
      ...prev,
      commodity: lang === 'vi' ? p.commodityVi : p.commodityEn,
      hsCode: p.hsCode,
    }));
  };

  const handleOpenBooking = () => {
    setBookedWaybill(null);
    setModalOpen(true);
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    const created = onCreateBooking(quoteInput, customerForm);
    setBookedWaybill(created);
  };

  const governingLabel = (() => {
    switch (quote.governingMetric) {
      case 'volumetric':
        return t.governingVolumetric;
      case 'cbm':
        return t.governingCbm;
      case 'container':
        return t.governingContainer;
      default:
        return t.governingActual;
    }
  })();

  const maxWeightCompare = Math.max(
    1,
    quote.totalGrossWeightKg,
    quote.volumetricWeightKg,
  );
  const actualBarPct = Math.round(
    (quote.totalGrossWeightKg / maxWeightCompare) * 100,
  );
  const volBarPct = Math.round(
    (quote.volumetricWeightKg / maxWeightCompare) * 100,
  );

  const customsLocked = quoteInput.incoterm === 'DDP';
  const insuranceLocked =
    quoteInput.incoterm === 'CIF' || quoteInput.incoterm === 'DDP';

  return (
    <section
      id="quote-engine"
      className="no-print border-b border-[var(--border)] py-12 lg:py-16"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="text-xs font-bold tracking-[0.12em] text-[var(--accent-cyan)]">
              {t.quoteEyebrow}
            </div>
            <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-[var(--text)] sm:text-3xl">
              {t.quoteTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
              {t.quoteSubtitle}
            </p>
          </div>

          {/* Quick Cargo Presets */}
          <div className="flex flex-col gap-1.5">
            <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">
              {t.cargoPresetsLabel}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {CARGO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  data-testid={`preset-${preset.id}`}
                  className="cursor-pointer rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--accent-cyan)] hover:text-[var(--text)]"
                >
                  {lang === 'vi' ? preset.labelVi : preset.labelEn}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main 12-Col Quote Workspace */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left 7 Cols: Configuration Controls */}
          <div className="space-y-5 lg:col-span-7">
            {/* Corridor & Transport Mode */}
            <div className="panel-card rounded-xl p-5">
              <label
                htmlFor="quote-corridor"
                className="font-mono-tech block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]"
              >
                {t.corridorLabel}
              </label>
              <select
                id="quote-corridor"
                value={quoteInput.corridorId}
                onChange={(e) =>
                  setQuoteInput((prev) => ({
                    ...prev,
                    corridorId: e.target.value,
                  }))
                }
                data-testid="quote-corridor-select"
                className="mt-2 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-sm font-semibold text-[var(--text)] focus:border-[var(--accent-cyan)] focus:outline-none"
              >
                {SHIPPING_CORRIDORS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} —{' '}
                    {lang === 'vi'
                      ? `${c.originNameVi} ↔ ${c.destNameVi}`
                      : `${c.originNameEn} ↔ ${c.destNameEn}`}{' '}
                    ({c.distanceKm.toLocaleString('en-US')} km)
                  </option>
                ))}
              </select>

              <div className="font-mono-tech mt-5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {t.modeLabel}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {TRANSPORT_MODES.map((m) => {
                  const selected = quoteInput.mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        setQuoteInput((prev) => ({ ...prev, mode: m.id }))
                      }
                      data-testid={`mode-${m.id}`}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition-all ${
                        selected
                          ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan-soft)] text-[var(--text)]'
                          : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]'
                      }`}
                    >
                      <span
                        className={
                          selected
                            ? 'text-[var(--accent-cyan)]'
                            : 'text-[var(--text-dim)]'
                        }
                      >
                        {renderModeIcon(m.icon)}
                      </span>
                      <span className="leading-snug">
                        {t.modeLabels[m.id]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dimensions & Volumetric Weight Diagnostic */}
            <div className="panel-card rounded-xl p-5">
              <div className="font-mono-tech text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {t.dimensionsLabel}
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {(
                  [
                    { id: 'lengthCm', label: t.lengthCm, min: 1 },
                    { id: 'widthCm', label: t.widthCm, min: 1 },
                    { id: 'heightCm', label: t.heightCm, min: 1 },
                    { id: 'grossWeightKg', label: t.grossWeightPkg, min: 1 },
                    { id: 'packages', label: t.packageCount, min: 1 },
                    { id: 'declaredValueUsd', label: t.declaredValue, min: 100 },
                  ] as const
                ).map((field) => (
                  <div key={field.id}>
                    <label
                      htmlFor={`input-${field.id}`}
                      className="block text-[11px] font-medium text-[var(--text-muted)]"
                    >
                      {field.label}
                    </label>
                    <input
                      id={`input-${field.id}`}
                      data-testid={`input-${field.id}`}
                      type="number"
                      min={field.min}
                      value={quoteInput[field.id]}
                      onChange={(e) => updateNum(field.id, e.target.value)}
                      className="font-mono-tech mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-semibold text-[var(--text)] focus:border-[var(--accent-cyan)] focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              {/* Volumetric vs Actual Diagnostic Strip */}
              <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[var(--text)]">
                    {t.diagnosticTitle}
                  </span>
                  <span
                    data-testid="governing-metric-badge"
                    className="font-mono-tech rounded border border-[var(--accent-amber)]/35 bg-[var(--accent-amber-soft)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--accent-amber)]"
                  >
                    {governingLabel}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                  <div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {t.totalVolumeCbm}
                    </div>
                    <div
                      data-testid="quote-cbm-value"
                      className="font-mono-tech text-sm font-bold text-[var(--accent-cyan)]"
                    >
                      {quote.totalVolumeCbm.toFixed(3)} CBM
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {t.actualGross}
                    </div>
                    <div className="font-mono-tech text-sm font-bold text-[var(--text)]">
                      {quote.totalGrossWeightKg.toLocaleString('en-US')} kg
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {t.volumetricWeight}
                    </div>
                    <div className="font-mono-tech text-sm font-bold text-[var(--text)]">
                      {quote.volumetricWeightKg.toLocaleString('en-US')} kg
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {t.chargeableBasis}
                    </div>
                    <div
                      data-testid="quote-chargeable-value"
                      className="font-mono-tech text-sm font-bold text-[var(--accent-emerald)]"
                    >
                      {quote.mode === 'sea-lcl'
                        ? `${quote.revenueTonsCbm.toFixed(2)} W/M`
                        : quote.containersRequired > 0
                          ? `${quote.containersRequired} × ${
                              quote.mode === 'sea-fcl-40' ? "40'HC" : "20'FCL"
                            } (${quote.containerUtilizationPct}%)`
                          : `${quote.chargeableWeightKg.toLocaleString('en-US')} kg`}
                    </div>
                  </div>
                </div>

                {/* Comparison Bars */}
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="font-mono-tech w-20 shrink-0 text-[var(--text-muted)]">
                      GROSS WT
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent-cyan)]"
                        style={{ width: `${actualBarPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="font-mono-tech w-20 shrink-0 text-[var(--text-muted)]">
                      VOLUMETRIC
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent-amber)]"
                        style={{ width: `${volBarPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Incoterms 2020 & Add-ons */}
            <div className="panel-card rounded-xl p-5">
              <div className="font-mono-tech text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {t.incotermsLabel}
              </div>
              <div className="mt-2.5 grid grid-cols-3 gap-2">
                {INCOTERMS.map((term) => {
                  const active = quoteInput.incoterm === term;
                  return (
                    <button
                      key={term}
                      type="button"
                      onClick={() =>
                        setQuoteInput((prev) => ({ ...prev, incoterm: term }))
                      }
                      data-testid={`incoterm-${term}`}
                      className={`font-mono-tech cursor-pointer rounded-lg border py-2.5 text-center text-sm font-bold transition-all ${
                        active
                          ? 'border-[var(--accent-emerald)] bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)]'
                          : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:border-[var(--border-strong)] hover:text-[var(--text)]'
                      }`}
                    >
                      {term}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2.5 text-xs leading-relaxed text-[var(--text-muted)]">
                {t.incotermNotes[quoteInput.incoterm]}
              </p>

              <div className="font-mono-tech mt-5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {t.addonsLabel}
              </div>
              <div className="mt-2.5 space-y-2">
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={customsLocked || quoteInput.customsClearance}
                      disabled={customsLocked}
                      onChange={(e) =>
                        setQuoteInput((prev) => ({
                          ...prev,
                          customsClearance: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 accent-[var(--accent-cyan)]"
                    />
                    <span className="text-xs font-medium text-[var(--text)]">
                      {t.addonCustoms}
                    </span>
                  </div>
                  <span className="font-mono-tech text-[11px] font-semibold text-[var(--text-muted)]">
                    {customsLocked ? t.requiredByIncoterm : '+$145'}
                  </span>
                </label>

                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={insuranceLocked || quoteInput.cargoInsurance}
                      disabled={insuranceLocked}
                      onChange={(e) =>
                        setQuoteInput((prev) => ({
                          ...prev,
                          cargoInsurance: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 accent-[var(--accent-cyan)]"
                    />
                    <span className="text-xs font-medium text-[var(--text)]">
                      {t.addonInsurance}
                    </span>
                  </div>
                  <span className="font-mono-tech text-[11px] font-semibold text-[var(--text-muted)]">
                    {insuranceLocked ? t.requiredByIncoterm : '0.45%'}
                  </span>
                </label>

                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={quoteInput.reeferMonitoring}
                      onChange={(e) =>
                        setQuoteInput((prev) => ({
                          ...prev,
                          reeferMonitoring: e.target.checked,
                        }))
                      }
                      data-testid="toggle-reefer"
                      className="h-4 w-4 accent-[var(--accent-cyan)]"
                    />
                    <span className="text-xs font-medium text-[var(--text)]">
                      {t.addonReefer}
                    </span>
                  </div>
                  <span className="font-mono-tech text-[11px] font-semibold text-[var(--accent-cyan)]">
                    IoT -18°C / +4°C
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Right 5 Cols: Itemized Quote Summary & Instant VietQR Booking */}
          <div className="lg:col-span-5">
            <div className="panel-card sticky top-20 rounded-xl p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-4">
                <div>
                  <div className="font-mono-tech text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-cyan)]">
                    {activeCorridor.code} · {quoteInput.incoterm}
                  </div>
                  <h3 className="mt-0.5 text-lg font-bold text-[var(--text)]">
                    {t.quoteSummaryTitle}
                  </h3>
                </div>
                <span className="font-mono-tech rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-semibold text-[var(--text)]">
                  {t.modeLabels[quoteInput.mode].split(' ')[0]}
                </span>
              </div>

              {/* Itemized Line Table */}
              <div className="mt-4 space-y-2.5 text-sm">
                {[
                  { label: t.lineBaseFreight, amount: quote.baseFreightUsd },
                  { label: t.lineFuel, amount: quote.fuelSurchargeUsd },
                  { label: t.lineThc, amount: quote.terminalHandlingUsd },
                  ...(quote.customsBrokerageUsd > 0
                    ? [
                        {
                          label: t.lineCustoms,
                          amount: quote.customsBrokerageUsd,
                        },
                      ]
                    : []),
                  ...(quote.importDutiesUsd > 0
                    ? [{ label: t.lineDuties, amount: quote.importDutiesUsd }]
                    : []),
                  ...(quote.insuranceUsd > 0
                    ? [{ label: t.lineInsurance, amount: quote.insuranceUsd }]
                    : []),
                  ...(quote.reeferSurchargeUsd > 0
                    ? [
                        {
                          label: t.lineReefer,
                          amount: quote.reeferSurchargeUsd,
                        },
                      ]
                    : []),
                ].map((line) => (
                  <div
                    key={line.label}
                    className="flex items-center justify-between gap-3"
                  >
                    <span className="text-xs text-[var(--text-muted)] sm:text-sm">
                      {line.label}
                    </span>
                    <span className="font-mono-tech shrink-0 text-xs font-semibold text-[var(--text)] sm:text-sm">
                      {formatMoney(line.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total Box */}
              <div className="mt-5 rounded-xl border border-[var(--accent-cyan)]/35 bg-[var(--bg-elevated)] p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {t.totalEstimate}
                  </span>
                  <span
                    data-testid="quote-total-price"
                    className="font-mono-tech text-2xl font-extrabold text-[var(--accent-cyan)]"
                  >
                    {formatMoney(quote.totalUsd, currency)}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-[var(--text-muted)]">
                  <span>FX 1 USD = {FX_USD_TO_VND.toLocaleString('en-US')} ₫</span>
                  <span className="font-mono-tech font-medium">
                    {currency === 'USD'
                      ? formatVnd(quote.totalVnd)
                      : formatMoney(quote.totalUsd, 'USD')}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs">
                  <span className="text-[var(--text-muted)]">
                    {t.depositDue}
                  </span>
                  <span className="font-mono-tech font-bold text-[var(--accent-amber)]">
                    {formatVnd(quote.depositVnd)}
                  </span>
                </div>
              </div>

              {/* Transit & Carbon Telemetry */}
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {t.transitTime}
                  </div>
                  <div className="font-mono-tech mt-0.5 text-base font-bold text-[var(--text)]">
                    {quote.transitDaysMin}–{quote.transitDaysMax} {t.daysUnit}
                  </div>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
                  <div className="text-[11px] text-[var(--text-muted)]">
                    {t.carbonFootprint}
                  </div>
                  <div className="font-mono-tech mt-0.5 text-base font-bold text-[var(--accent-emerald)]">
                    {quote.estimatedCo2Kg.toLocaleString('en-US')} kg
                  </div>
                </div>
              </div>

              {/* Instant Booking Button */}
              <button
                type="button"
                onClick={handleOpenBooking}
                data-testid="open-booking-modal"
                className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--accent-cyan)] px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
              >
                <span>{t.bookShipmentBtn}</span>
                <ArrowRightIcon className="h-4 w-4" />
              </button>

              <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-[var(--text-muted)]">
                <ShieldCheckIcon className="h-3.5 w-3.5 text-[var(--accent-emerald)]" />
                <span>
                  MBBank VietQR ({VIETQR_CONFIG.accountNumber}) · Waybill + A4 Invoice &amp; Packing List
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lazy-Loaded Booking & MBBank VietQR Modal */}
      {modalOpen && (
        <Suspense fallback={null}>
          <VietQrModal
            t={t}
            currency={currency}
            activeCorridor={activeCorridor}
            quoteInput={quoteInput}
            quote={quote}
            customerForm={customerForm}
            setCustomerForm={setCustomerForm}
            bookedWaybill={bookedWaybill}
            onConfirmBooking={handleConfirmBooking}
            onClose={() => setModalOpen(false)}
            onTrackWaybill={onTrackWaybill}
            onPreviewBl={onPreviewBl}
          />
        </Suspense>
      )}
    </section>
  );
}
