import { useMemo, useState } from 'react';
import type { I18nDict } from '../data/i18n';
import { formatMoney } from '../engines/freight';
import { filterWaybills, triggerCsvDownload } from '../engines/waybillEngine';
import type {
  Currency,
  Lang,
  PrintDocTab,
  WaybillRecord,
} from '../types/logistics';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ContainerIcon,
  DownloadIcon,
  DropletIcon,
  FileTextIcon,
  PlaneIcon,
  PrinterIcon,
  SearchIcon,
  ShieldCheckIcon,
  ShipIcon,
  ThermometerIcon,
  TrashIcon,
} from './Icons';

interface WaybillTrackerSectionProps {
  t: I18nDict;
  lang: Lang;
  currency: Currency;
  waybills: WaybillRecord[];
  activeWaybillId: string;
  onSelectWaybill: (id: string) => void;
  onPreviewDoc: (waybill: WaybillRecord, tab: PrintDocTab) => void;
  onAdvanceStage: (waybillId: string) => void;
  onDeleteUserWaybill: (waybillId: string) => void;
}

export function WaybillTrackerSection({
  t,
  lang,
  currency,
  waybills,
  activeWaybillId,
  onSelectWaybill,
  onPreviewDoc,
  onAdvanceStage,
  onDeleteUserWaybill,
}: WaybillTrackerSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredWaybills = useMemo(
    () => filterWaybills(waybills, searchQuery),
    [waybills, searchQuery],
  );

  const activeWaybill = useMemo(() => {
    const exact = filteredWaybills.find((w) => w.id === activeWaybillId);
    if (exact) return exact;
    return filteredWaybills[0] ?? null;
  }, [filteredWaybills, activeWaybillId]);

  const handleExportAllCsv = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    triggerCsvDownload(waybills, `meridian-fleet-manifest-${stamp}.csv`);
  };

  const handleExportSingleCsv = (wb: WaybillRecord) => {
    triggerCsvDownload([wb], `meridian-waybill-${wb.id}.csv`);
  };

  return (
    <section
      id="waybill-tracker"
      className="no-print border-b border-[var(--border)] bg-[var(--bg-elevated)]/40 py-12 lg:py-16"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Header Row */}
        <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="text-xs font-bold tracking-[0.12em] text-[var(--accent-cyan)]">
              {t.trackerEyebrow}
            </div>
            <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-[var(--text)] sm:text-3xl">
              {t.trackerTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
              {t.trackerSubtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono-tech inline-flex items-center gap-1.5 rounded-lg border border-[var(--accent-emerald)]/35 bg-[var(--accent-emerald-soft)] px-3 py-2 text-[11px] font-bold text-[var(--accent-emerald)]">
              <ShieldCheckIcon className="h-3.5 w-3.5" />
              <span>
                {t.vaultSyncedBadge} · {waybills.length}
              </span>
            </span>
            <button
              type="button"
              onClick={handleExportAllCsv}
              data-testid="export-all-csv"
              className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-panel)] px-4 py-2 text-xs font-semibold text-[var(--text)] transition-colors hover:border-[var(--accent-emerald)] hover:text-[var(--accent-emerald)]"
            >
              <DownloadIcon className="h-4 w-4" />
              <span>{t.exportAllCsv}</span>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mb-5">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            data-testid="waybill-search-input"
            className="w-full rounded-xl border border-[var(--border-strong)] bg-[var(--bg-panel)] py-3 pr-4 pl-10 text-sm text-[var(--text)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-cyan)] focus:outline-none"
          />
        </div>

        {/* Split Roster (4 cols) + Active Timeline Inspector (8 cols) */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Waybill Roster */}
          <div className="space-y-2.5 lg:col-span-4">
            {filteredWaybills.length === 0 ? (
              <div className="panel-card rounded-xl p-6 text-center text-sm text-[var(--text-muted)]">
                {t.noWaybillFound}
              </div>
            ) : (
              filteredWaybills.map((wb) => {
                const selected = activeWaybill?.id === wb.id;
                const isAir =
                  wb.mode === 'air-express' || wb.mode === 'air-standard';
                const delivered = wb.currentStage >= 6;
                return (
                  <button
                    key={wb.id}
                    type="button"
                    onClick={() => onSelectWaybill(wb.id)}
                    data-testid={`waybill-card-${wb.id}`}
                    className={`w-full cursor-pointer rounded-xl border p-3.5 text-left transition-all ${
                      selected
                        ? 'border-[var(--accent-cyan)] bg-[var(--bg-panel)] shadow-lg'
                        : 'border-[var(--border)] bg-[var(--bg-panel)]/70 hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-tech text-sm font-bold text-[var(--text)]">
                          {wb.id}
                        </span>
                        {wb.isUserBooked && (
                          <span className="font-mono-tech rounded bg-[var(--accent-amber-soft)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--accent-amber)]">
                            {t.bookedBadge}
                          </span>
                        )}
                      </div>
                      <span
                        className={`font-mono-tech rounded px-2 py-0.5 text-[10px] font-bold ${
                          delivered
                            ? 'bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)]'
                            : 'bg-[var(--accent-cyan-soft)] text-[var(--accent-cyan)]'
                        }`}
                      >
                        {wb.currentStage}/6
                      </span>
                    </div>

                    <div className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold text-[var(--text)]">
                      {isAir ? (
                        <PlaneIcon className="h-3.5 w-3.5 shrink-0 text-[var(--accent-amber)]" />
                      ) : (
                        <ShipIcon className="h-3.5 w-3.5 shrink-0 text-[var(--accent-cyan)]" />
                      )}
                      <span className="font-mono-tech">
                        {wb.originCode} → {wb.destCode}
                      </span>
                      <span className="text-[var(--text-dim)]">·</span>
                      <span className="truncate font-normal text-[var(--text-muted)]">
                        {wb.incoterm}
                      </span>
                    </div>

                    <div className="mt-1 truncate text-xs text-[var(--text-muted)]">
                      {lang === 'vi' ? wb.commodityVi : wb.commodityEn}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Active Waybill Telemetry & 6-Stage Timeline */}
          <div className="lg:col-span-8">
            {activeWaybill ? (
              <div className="panel-card rounded-xl p-5 sm:p-6">
                {/* Top Metadata & Print/Export Actions */}
                <div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        data-testid="active-waybill-id"
                        className="font-mono-tech text-xl font-extrabold text-[var(--accent-cyan)]"
                      >
                        {activeWaybill.id}
                      </span>
                      <span className="font-mono-tech rounded border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2 py-0.5 text-xs font-semibold text-[var(--text)]">
                        {activeWaybill.blNumber}
                      </span>
                      <span className="font-mono-tech rounded border border-[var(--accent-emerald)]/35 bg-[var(--accent-emerald-soft)] px-2 py-0.5 text-xs font-bold text-[var(--accent-emerald)]">
                        {activeWaybill.incoterm}
                      </span>
                    </div>
                    <div className="mt-1.5 text-sm font-semibold text-[var(--text)]">
                      {lang === 'vi'
                        ? activeWaybill.commodityVi
                        : activeWaybill.commodityEn}
                    </div>
                    <div className="font-mono-tech mt-1 text-xs text-[var(--text-muted)]">
                      {activeWaybill.containerOrAwb} · {activeWaybill.vesselOrFlight}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {activeWaybill.currentStage < 6 && (
                      <button
                        type="button"
                        onClick={() => onAdvanceStage(activeWaybill.id)}
                        data-testid="advance-stage-btn"
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--accent-emerald)]/45 bg-[var(--accent-emerald-soft)] px-3 py-2 text-xs font-bold text-[var(--accent-emerald)] hover:opacity-90"
                      >
                        <span>{t.advanceStageBtn}</span>
                        <ArrowRightIcon className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleExportSingleCsv(activeWaybill)}
                      data-testid="export-single-csv"
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:border-[var(--accent-emerald)]"
                    >
                      <DownloadIcon className="h-3.5 w-3.5" />
                      <span>{t.exportSingleCsv}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onPreviewDoc(activeWaybill, 'bl')}
                      data-testid="open-bl-preview"
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--accent-cyan)] px-3 py-2 text-xs font-bold text-white hover:opacity-90"
                    >
                      <PrinterIcon className="h-3.5 w-3.5" />
                      <span>{t.previewPrintBl}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onPreviewDoc(activeWaybill, 'invoice')}
                      data-testid="open-invoice-preview"
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--accent-amber)]/45 bg-[var(--accent-amber-soft)] px-3 py-2 text-xs font-bold text-[var(--accent-amber)] hover:opacity-90"
                    >
                      <FileTextIcon className="h-3.5 w-3.5" />
                      <span>{t.previewCommercialInvoice}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onPreviewDoc(activeWaybill, 'packing')}
                      data-testid="open-packing-preview"
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-xs font-semibold text-[var(--text)] hover:border-[var(--accent-cyan)]"
                    >
                      <FileTextIcon className="h-3.5 w-3.5" />
                      <span>{t.previewPackingList}</span>
                    </button>
                    {activeWaybill.isUserBooked && (
                      <button
                        type="button"
                        onClick={() => onDeleteUserWaybill(activeWaybill.id)}
                        data-testid="delete-vault-waybill"
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--accent-rose)]/40 bg-[var(--accent-rose-soft)] px-2.5 py-2 text-xs font-bold text-[var(--accent-rose)] hover:opacity-90"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        <span>{t.deleteVaultBtn}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Key Telemetry Strip */}
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {activeWaybill.originCode} → {activeWaybill.destCode}
                    </div>
                    <div className="font-mono-tech mt-0.5 text-sm font-bold text-[var(--text)]">
                      ETA {activeWaybill.etaDate}
                    </div>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {t.totalVolumeCbm} / {t.actualGross}
                    </div>
                    <div className="font-mono-tech mt-0.5 text-sm font-bold text-[var(--text)]">
                      {activeWaybill.volumeCbm} CBM ·{' '}
                      {activeWaybill.grossWeightKg.toLocaleString('en-US')} kg
                    </div>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {t.totalEstimate}
                    </div>
                    <div className="font-mono-tech mt-0.5 text-sm font-bold text-[var(--accent-cyan)]">
                      {formatMoney(activeWaybill.totalFreightUsd, currency)}
                    </div>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {t.tempTelemetry} / RH
                    </div>
                    <div className="font-mono-tech mt-0.5 flex items-center gap-2 text-sm font-bold text-[var(--accent-emerald)]">
                      <span className="inline-flex items-center gap-1">
                        <ThermometerIcon className="h-3.5 w-3.5" />
                        {activeWaybill.reeferTempC !== null &&
                        activeWaybill.reeferTempC !== undefined
                          ? `${activeWaybill.reeferTempC > 0 ? '+' : ''}${activeWaybill.reeferTempC}°C`
                          : 'Dry Amb.'}
                      </span>
                      {activeWaybill.humidityPct && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-[var(--text-muted)]">
                          <DropletIcon className="h-3 w-3" />
                          {activeWaybill.humidityPct}%
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Parties Strip */}
                <div className="mt-3 grid grid-cols-1 gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3 text-xs sm:grid-cols-2">
                  <div>
                    <span className="font-mono-tech text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
                      SHIPPER / EXPORTER
                    </span>
                    <div className="mt-0.5 font-semibold text-[var(--text)]">
                      {activeWaybill.shipperCompany}
                    </div>
                    <div className="text-[var(--text-muted)]">
                      {activeWaybill.shipperName} ·{' '}
                      {lang === 'vi'
                        ? activeWaybill.originLabelVi
                        : activeWaybill.originLabelEn}
                    </div>
                  </div>
                  <div>
                    <span className="font-mono-tech text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
                      CONSIGNEE / IMPORTER
                    </span>
                    <div className="mt-0.5 font-semibold text-[var(--text)]">
                      {activeWaybill.consigneeCompany}
                    </div>
                    <div className="text-[var(--text-muted)]">
                      {activeWaybill.consigneeName} ·{' '}
                      {lang === 'vi'
                        ? activeWaybill.destLabelVi
                        : activeWaybill.destLabelEn}
                    </div>
                  </div>
                </div>

                {/* 6-Stage Customs & Transit Timeline */}
                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-mono-tech text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                      {t.stageProgress}
                    </h3>
                    <span className="font-mono-tech inline-flex items-center gap-1 text-[11px] text-[var(--accent-emerald)]">
                      <ShieldCheckIcon className="h-3.5 w-3.5" />
                      {activeWaybill.sealNumber}
                    </span>
                  </div>

                  <ol className="relative space-y-3 border-l border-[var(--border-strong)] pl-6">
                    {activeWaybill.stages.map((stage) => {
                      const isDone = stage.status === 'completed';
                      const isActive = stage.status === 'active';
                      return (
                        <li
                          key={stage.step}
                          className="relative rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2.5"
                        >
                          {/* Timeline Node Marker */}
                          <span
                            className={`absolute top-3 -left-[33px] flex h-5 w-5 items-center justify-center rounded-full border ${
                              isDone
                                ? 'border-[var(--accent-emerald)] bg-[var(--bg-panel)] text-[var(--accent-emerald)]'
                                : isActive
                                  ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)] text-white'
                                  : 'border-[var(--border-strong)] bg-[var(--bg-panel)] text-[var(--text-dim)]'
                            }`}
                          >
                            {isDone ? (
                              <CheckCircleIcon className="h-3.5 w-3.5" />
                            ) : isActive ? (
                              <ContainerIcon className="h-3 w-3" />
                            ) : (
                              <ClockIcon className="h-3 w-3" />
                            )}
                          </span>

                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-xs font-bold text-[var(--text)] sm:text-sm">
                              <span className="font-mono-tech mr-1.5 text-[var(--text-dim)]">
                                0{stage.step}
                              </span>
                              {lang === 'vi' ? stage.titleVi : stage.titleEn}
                            </div>
                            <span className="font-mono-tech text-[11px] text-[var(--text-muted)]">
                              {stage.timestamp}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                            <span>
                              <strong className="font-mono-tech text-[var(--accent-cyan)]">
                                {stage.locationCode}
                              </strong>{' '}
                              ·{' '}
                              {lang === 'vi'
                                ? stage.locationVi
                                : stage.locationEn}
                            </span>
                            <span className="font-mono-tech rounded bg-[var(--bg-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                              REF: {stage.reference}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              </div>
            ) : (
              <div className="panel-card rounded-xl p-8 text-center text-sm text-[var(--text-muted)]">
                {t.noWaybillFound}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
