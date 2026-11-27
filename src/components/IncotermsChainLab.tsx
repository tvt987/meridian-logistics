import { useMemo, useState } from 'react';
import type { I18nDict } from '../data/i18n';
import { formatMoney, formatVnd } from '../engines/freight';
import {
  calculateIncotermsAllocation,
  INCOTERM_SCENARIO_PRESETS,
  INCOTERMS_2020_ORDER,
} from '../engines/incotermsMatrixEngine';
import type {
  Currency,
  Incoterm2020Code,
  IncotermsAllocationInput,
  Lang,
} from '../types/logistics';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  RefreshIcon,
  ScaleIcon,
  ShieldCheckIcon,
  ShipIcon,
} from './Icons';

export interface IncotermsChainLabProps {
  t: I18nDict;
  lang: Lang;
  currency: Currency;
  currentQuoteFreightUsd: number;
  currentQuoteDeclaredUsd: number;
}

export function IncotermsChainLab({
  t,
  lang,
  currency,
  currentQuoteFreightUsd,
  currentQuoteDeclaredUsd,
}: IncotermsChainLabProps) {
  const [input, setInput] = useState<IncotermsAllocationInput>({
    incoterm: 'CIF',
    ...INCOTERM_SCENARIO_PRESETS[0].input,
  });

  const result = useMemo(() => calculateIncotermsAllocation(input), [input]);

  const selectTerm = (term: Incoterm2020Code) => {
    setInput((prev) => ({ ...prev, incoterm: term }));
  };

  const applyPreset = (presetId: string) => {
    const preset = INCOTERM_SCENARIO_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setInput((prev) => ({
      ...prev,
      ...preset.input,
    }));
  };

  const handleSyncFromQuote = () => {
    setInput((prev) => ({
      ...prev,
      cargoValueUsd: Math.max(1000, Math.round(currentQuoteDeclaredUsd)),
      mainFreightUsd: Math.max(200, Math.round(currentQuoteFreightUsd)),
    }));
  };

  const updateNum = (field: keyof IncotermsAllocationInput, raw: string) => {
    const n = Number(raw);
    setInput((prev) => ({
      ...prev,
      [field]: Number.isFinite(n) ? Math.max(0, n) : 0,
    }));
  };

  // Horizontal SVG geometry constants for 8-stage handover bar
  const svgW = 960;
  const padX = 16;
  const gap = 8;
  const stageCount = 8;
  const colW = (svgW - padX * 2 - gap * (stageCount - 1)) / stageCount;
  const colX = (idx0: number) => padX + idx0 * (colW + gap);
  const transferBoundaryX = (stageIndex1Based: number) => {
    if (stageIndex1Based >= 8) return svgW - padX;
    return colX(stageIndex1Based - 1) + colW + gap / 2;
  };

  const riskBoundaryX = transferBoundaryX(result.riskTransferStageIndex);
  const costBoundaryX = transferBoundaryX(result.costTransferStageIndex);

  return (
    <section
      id="incoterms-lab"
      data-testid="incoterms-chain-lab"
      className="no-print border-b border-[var(--border)] py-12 lg:py-16"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Section Header + Trade Lane Presets */}
        <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="text-xs font-bold tracking-[0.12em] text-[var(--accent-cyan)]">
              {t.incotermsEyebrow}
            </div>
            <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-[var(--text)] sm:text-3xl">
              {t.incotermsTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
              {t.incotermsSubtitle}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">
              {t.incotermsPresetsLabel}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {INCOTERM_SCENARIO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  data-testid={`incoterm-preset-${preset.id}`}
                  className="cursor-pointer rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--accent-cyan)] hover:text-[var(--text)]"
                >
                  {lang === 'vi' ? preset.labelVi : preset.labelEn}
                </button>
              ))}
              <button
                type="button"
                onClick={handleSyncFromQuote}
                data-testid="incoterms-sync-quote-btn"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--accent-cyan)]/40 bg-[var(--accent-cyan-soft)] px-2.5 py-1.5 text-xs font-semibold text-[var(--accent-cyan)] transition-opacity hover:opacity-85"
              >
                <RefreshIcon className="h-3.5 w-3.5" />
                <span>{t.incotermsSyncFromQuote}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 7-Term Interactive Incoterms 2020 Selector Strip */}
        <div className="panel-card rounded-xl p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <ScaleIcon className="h-4 w-4 text-[var(--accent-cyan)]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                {t.incotermsSelectLabel}
              </h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                data-testid="incoterms-active-badge"
                className="font-mono-tech rounded bg-[var(--bg-navy)] px-2.5 py-0.5 text-xs font-bold text-white"
              >
                {result.incoterm} · GROUP {result.groupCode}
              </span>
              {result.hasCostRiskSplit && (
                <span
                  data-testid="incoterms-split-badge"
                  className="font-mono-tech inline-flex items-center gap-1 rounded border border-[var(--accent-amber)]/45 bg-[var(--accent-amber-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-amber)]"
                >
                  <AlertTriangleIcon className="h-3 w-3" />
                  {t.incotermsSplitAlert}
                </span>
              )}
            </div>
          </div>

          <div className="mt-3.5 grid grid-cols-4 gap-2 sm:grid-cols-7">
            {INCOTERMS_2020_ORDER.map((term) => {
              const active = result.incoterm === term;
              const row = result.allTermsComparison.find(
                (r) => r.code === term,
              )!;
              return (
                <button
                  key={term}
                  type="button"
                  onClick={() => selectTerm(term)}
                  aria-pressed={active}
                  data-testid={`incoterm-btn-${term}`}
                  className={`flex cursor-pointer flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                    active
                      ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan-soft)] ring-1 ring-[var(--accent-cyan)]/40'
                      : 'border-[var(--border)] bg-[var(--bg)]/60 hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-1">
                    <span className="font-mono-tech text-sm font-extrabold text-[var(--text)]">
                      {term}
                    </span>
                    {row.seaOnly && (
                      <ShipIcon className="h-3 w-3 text-[var(--accent-cyan)]" />
                    )}
                  </div>
                  <div className="font-mono-tech mt-1 text-[10px] font-semibold text-[var(--text-muted)]">
                    S {row.sellerSharePct}% / B {row.buyerSharePct}%
                  </div>
                </button>
              );
            })}
          </div>

          {/* Horizontal 8-Stage SVG Cost & Risk Transfer Visualizer */}
          <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
            <div className="min-w-[680px]">
              <svg
                viewBox="0 0 960 226"
                className="block h-auto w-full select-none"
                role="img"
                data-testid="incoterms-chain-svg"
                aria-label={`Incoterms 2020 ${result.incoterm} 8-Stage Cost and Risk Transfer Visualizer`}
              >
                {/* Top Legend Header inside SVG */}
                <text
                  x="16"
                  y="16"
                  fill="var(--text-muted)"
                  fontSize="9.5"
                  fontWeight="700"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {t.incotermsCostChainLabel}
                </text>
                <g transform="translate(650, 6)">
                  <rect x="0" y="0" width="12" height="10" rx="2" fill="#0284C7" />
                  <text
                    x="17"
                    y="8.5"
                    fill="var(--text-muted)"
                    fontSize="9"
                    fontWeight="600"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    Seller Cost
                  </text>
                  <rect x="96" y="0" width="12" height="10" rx="2" fill="#D97706" />
                  <text
                    x="113"
                    y="8.5"
                    fill="var(--text-muted)"
                    fontSize="9"
                    fontWeight="600"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    Buyer Cost
                  </text>
                  <rect x="192" y="0" width="12" height="10" rx="2" fill="#0F2942" />
                  <text
                    x="209"
                    y="8.5"
                    fill="var(--text-muted)"
                    fontSize="9"
                    fontWeight="600"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    Seller Risk
                  </text>
                </g>

                {/* Connecting Flow Rail */}
                <line
                  x1="28"
                  y1="56"
                  x2="932"
                  y2="56"
                  stroke="var(--border-strong)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                />

                {/* 8 Handover Stage Blocks: Cost Row + Risk Row */}
                {result.stages.map((stage, idx0) => {
                  const x = colX(idx0);
                  const isSellerCost = stage.costOwner === 'seller';
                  const isSellerRisk = stage.riskOwner === 'seller';
                  const stageTitle = lang === 'vi' ? stage.shortVi : stage.shortEn;

                  return (
                    <g key={stage.id} data-testid={`incoterm-stage-${stage.id}`}>
                      {/* Stage Number + Title */}
                      <text
                        x={x + colW / 2}
                        y="36"
                        textAnchor="middle"
                        fill="var(--text-dim)"
                        fontSize="8.5"
                        fontWeight="700"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        0{stage.index}
                      </text>

                      {/* COST BOX */}
                      <rect
                        x={x}
                        y="42"
                        width={colW}
                        height="58"
                        rx="7"
                        fill={isSellerCost ? '#0284C7' : '#D97706'}
                        fillOpacity={isSellerCost ? 0.94 : 0.9}
                      />
                      <text
                        x={x + colW / 2}
                        y="60"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="9.5"
                        fontWeight="700"
                      >
                        {stageTitle}
                      </text>
                      <text
                        x={x + colW / 2}
                        y="76"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="10.5"
                        fontWeight="800"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        ${stage.costUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </text>
                      <text
                        x={x + colW / 2}
                        y="91"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fillOpacity="0.86"
                        fontSize="8"
                        fontWeight="700"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {isSellerCost ? 'SELLER PAYS' : 'BUYER PAYS'}
                      </text>

                      {/* RISK BAR BOX */}
                      <rect
                        x={x}
                        y="128"
                        width={colW}
                        height="34"
                        rx="6"
                        fill={isSellerRisk ? '#0F2942' : '#FEF3C7'}
                        stroke={isSellerRisk ? '#0284C7' : '#D97706'}
                        strokeWidth="1.2"
                      />
                      <text
                        x={x + colW / 2}
                        y="149"
                        textAnchor="middle"
                        fill={isSellerRisk ? '#FFFFFF' : '#92400E'}
                        fontSize="8.8"
                        fontWeight="700"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {isSellerRisk ? 'SELLER RISK' : 'BUYER RISK'}
                      </text>
                    </g>
                  );
                })}

                {/* Row 2 Label */}
                <text
                  x="16"
                  y="119"
                  fill="var(--text-muted)"
                  fontSize="9"
                  fontWeight="700"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {t.incotermsRiskChainLabel}
                </text>

                {/* Risk Transfer Vertical Marker */}
                <line
                  x1={riskBoundaryX}
                  y1="122"
                  x2={riskBoundaryX}
                  y2="188"
                  stroke="#DC2626"
                  strokeWidth="2"
                  strokeDasharray="3 2"
                />
                <circle cx={riskBoundaryX} cy="166" r="4.5" fill="#DC2626" />
                <g
                  transform={`translate(${Math.min(
                    812,
                    Math.max(16, riskBoundaryX - 66),
                  )}, 190)`}
                >
                  <rect
                    x="0"
                    y="0"
                    width="132"
                    height="22"
                    rx="4"
                    fill="#DC2626"
                  />
                  <text
                    x="66"
                    y="14.5"
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="8.5"
                    fontWeight="700"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    RISK TRANSFER · STG {result.riskTransferStageIndex}
                  </text>
                </g>

                {/* Split-Point Callout Bridge for CFR / CIF */}
                {result.hasCostRiskSplit && (
                  <g>
                    <line
                      x1={costBoundaryX}
                      y1="100"
                      x2={costBoundaryX}
                      y2="188"
                      stroke="#0284C7"
                      strokeWidth="2"
                      strokeDasharray="3 2"
                    />
                    <circle cx={costBoundaryX} cy="102" r="4.5" fill="#0284C7" />
                    <line
                      x1={riskBoundaryX}
                      y1="176"
                      x2={costBoundaryX}
                      y2="176"
                      stroke="#D97706"
                      strokeWidth="2.4"
                    />
                    <g
                      transform={`translate(${Math.min(
                        812,
                        Math.max(158, costBoundaryX - 62),
                      )}, 190)`}
                    >
                      <rect
                        x="0"
                        y="0"
                        width="132"
                        height="22"
                        rx="4"
                        fill="#0284C7"
                      />
                      <text
                        x="66"
                        y="14.5"
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="8.5"
                        fontWeight="700"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        COST TRANSFER · STG {result.costTransferStageIndex}
                      </text>
                    </g>
                  </g>
                )}
              </svg>
            </div>
          </div>

          {/* Seller vs Buyer Split Progress Bar */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
              <span className="text-[var(--accent-cyan)]">
                {t.incotermsSellerLabel}:{' '}
                <span
                  data-testid="incoterms-seller-share"
                  className="font-mono-tech"
                >
                  {result.sellerSharePct}%
                </span>{' '}
                (
                <span
                  data-testid="incoterms-seller-cost"
                  className="font-mono-tech"
                >
                  {formatMoney(result.sellerCostUsd, currency)}
                </span>
                )
              </span>
              <span className="text-[var(--accent-amber)]">
                {t.incotermsBuyerLabel}:{' '}
                <span
                  data-testid="incoterms-buyer-share"
                  className="font-mono-tech"
                >
                  {result.buyerSharePct}%
                </span>{' '}
                (
                <span
                  data-testid="incoterms-buyer-cost"
                  className="font-mono-tech"
                >
                  {formatMoney(result.buyerCostUsd, currency)}
                </span>
                )
              </span>
            </div>
            <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
              <div
                data-testid="incoterms-seller-bar"
                className="h-full bg-[var(--accent-cyan)] transition-all duration-300"
                style={{ width: `${result.sellerSharePct}%` }}
              />
              <div
                data-testid="incoterms-buyer-bar"
                className="h-full bg-[var(--accent-amber)] transition-all duration-300"
                style={{ width: `${result.buyerSharePct}%` }}
              />
            </div>
          </div>

          {/* Summary KPI Grid + Editable Cost Inputs */}
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-12">
            {/* Left: Key Contractual Metadata + Warnings (7 cols) */}
            <div className="space-y-3 lg:col-span-7">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
                  <div className="text-[11px] font-medium text-[var(--text-muted)]">
                    {t.incotermsRiskPoint}
                  </div>
                  <div className="mt-1 text-xs font-extrabold text-[var(--text)]">
                    Stage {result.riskTransferStageIndex}:{' '}
                    {lang === 'vi'
                      ? result.riskTransferStageLabelVi
                      : result.riskTransferStageLabelEn}
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
                  <div className="text-[11px] font-medium text-[var(--text-muted)]">
                    {t.incotermsInsuranceLabel}
                  </div>
                  <div className="mt-1 flex items-start gap-1.5 text-xs font-bold text-[var(--text)]">
                    {result.insuranceRequired ? (
                      <CheckCircleIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-emerald)]" />
                    ) : (
                      <ShieldCheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-cyan)]" />
                    )}
                    <span>
                      {lang === 'vi'
                        ? result.insuranceCoverageVi
                        : result.insuranceCoverageEn}
                    </span>
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3">
                  <div className="text-[11px] font-medium text-[var(--text-muted)]">
                    {t.incotermsScopeLabel}
                  </div>
                  <div className="mt-1 text-xs font-bold text-[var(--text)]">
                    {lang === 'vi'
                      ? result.transportScopeVi
                      : result.transportScopeEn}
                  </div>
                  <div className="font-mono-tech mt-1 text-[10px] text-[var(--text-dim)]">
                    Total Logistics:{' '}
                    {currency === 'USD'
                      ? `${formatMoney(result.totalLogisticsCostUsd, 'USD')} · ${formatVnd(result.totalLogisticsCostVnd)}`
                      : formatVnd(result.totalLogisticsCostVnd)}
                  </div>
                </div>
              </div>

              {/* Compliance Risk Warnings */}
              <div className="rounded-xl border border-[var(--accent-amber)]/35 bg-[var(--accent-amber-soft)] p-3.5">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-[var(--text)]">
                  <AlertTriangleIcon className="h-4 w-4 text-[var(--accent-amber)]" />
                  <span>
                    {result.incoterm} ({lang === 'vi' ? result.fullNameVi : result.fullNameEn}) — {t.incotermsWarningsTitle}
                  </span>
                </div>
                <ul className="mt-2 space-y-1 text-xs leading-relaxed text-[var(--text-muted)]">
                  {(lang === 'vi'
                    ? result.complianceWarningsVi
                    : result.complianceWarningsEn
                  ).map((warning) => (
                    <li key={warning} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-amber)]" />
                      <span>{warning}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Right: Shipment Cost Parameters (5 cols) */}
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)] p-3.5 lg:col-span-5">
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {[
                  {
                    id: 'incoterm-cargo-value',
                    field: 'cargoValueUsd' as const,
                    label: 'Cargo Value ($)',
                    step: 5000,
                  },
                  {
                    id: 'incoterm-main-freight',
                    field: 'mainFreightUsd' as const,
                    label: 'Main Freight ($)',
                    step: 100,
                  },
                  {
                    id: 'incoterm-duty-rate',
                    field: 'importDutyRatePct' as const,
                    label: 'Import Duty (%)',
                    step: 0.5,
                  },
                  {
                    id: 'incoterm-origin-inland',
                    field: 'originInlandUsd' as const,
                    label: 'Origin Inland ($)',
                    step: 50,
                  },
                  {
                    id: 'incoterm-origin-thc',
                    field: 'originThcUsd' as const,
                    label: 'Origin THC ($)',
                    step: 50,
                  },
                  {
                    id: 'incoterm-dest-drayage',
                    field: 'destinationDrayageUsd' as const,
                    label: 'Dest Drayage ($)',
                    step: 50,
                  },
                ].map((ctrl) => (
                  <div key={ctrl.id}>
                    <label
                      htmlFor={ctrl.id}
                      className="block truncate text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]"
                    >
                      {ctrl.label}
                    </label>
                    <input
                      id={ctrl.id}
                      type="number"
                      min={0}
                      step={ctrl.step}
                      value={input[ctrl.field]}
                      onChange={(e) => updateNum(ctrl.field, e.target.value)}
                      className="font-mono-tech mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-bold text-[var(--text)] focus:border-[var(--accent-cyan)] focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* All-7 Incoterms Comparison Table */}
          <div className="mt-5 overflow-x-auto rounded-xl border border-[var(--border)]">
            <div className="border-b border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-[var(--text)]">
              {t.incotermsCompareTitle}
            </div>
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--bg-elevated)] text-[10px] font-bold uppercase tracking-wider text-[var(--text-dim)]">
                  <th className="px-4 py-2.5">Rule</th>
                  <th className="px-3 py-2.5">Seller Cost</th>
                  <th className="px-3 py-2.5">Buyer Cost</th>
                  <th className="px-3 py-2.5">Split Ratio</th>
                  <th className="px-3 py-2.5">Risk -&gt; Cost</th>
                  <th className="px-3 py-2.5">Insurance</th>
                </tr>
              </thead>
              <tbody>
                {result.allTermsComparison.map((row) => {
                  const isCurrent = row.code === result.incoterm;
                  return (
                    <tr
                      key={row.code}
                      onClick={() => selectTerm(row.code)}
                      className={`cursor-pointer border-b border-[var(--border)] transition-colors last:border-b-0 ${
                        isCurrent
                          ? 'bg-[var(--accent-cyan-soft)] font-semibold'
                          : 'bg-[var(--bg-elevated)] hover:bg-[var(--bg)]'
                      }`}
                    >
                      <td className="px-4 py-2.5">
                        <span className="font-mono-tech font-extrabold text-[var(--text)]">
                          {row.code}
                        </span>
                        <span className="ml-2 text-[11px] text-[var(--text-muted)]">
                          {lang === 'vi' ? row.fullNameVi : row.fullNameEn}
                        </span>
                      </td>
                      <td className="font-mono-tech px-3 py-2.5 font-bold text-[var(--accent-cyan)]">
                        {formatMoney(row.sellerCostUsd, currency)}
                      </td>
                      <td className="font-mono-tech px-3 py-2.5 font-bold text-[var(--accent-amber)]">
                        {formatMoney(row.buyerCostUsd, currency)}
                      </td>
                      <td className="font-mono-tech px-3 py-2.5 text-[var(--text)]">
                        {row.sellerSharePct}% / {row.buyerSharePct}%
                      </td>
                      <td className="font-mono-tech px-3 py-2.5">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                            row.hasCostRiskSplit
                              ? 'bg-[var(--accent-amber-soft)] text-[var(--accent-amber)]'
                              : 'bg-[var(--bg-subtle)] text-[var(--text-muted)]'
                          }`}
                        >
                          Stg {row.riskTransferStageIndex}
                          {row.hasCostRiskSplit
                            ? ` / Stg ${row.costTransferStageIndex} SPLIT`
                            : ' Aligned'}
                        </span>
                      </td>
                      <td className="font-mono-tech px-3 py-2.5 text-[11px]">
                        {row.insuranceRequired ? (
                          <span className="font-bold text-[var(--accent-emerald)]">
                            MANDATORY (ICC-C)
                          </span>
                        ) : (
                          <span className="text-[var(--text-dim)]">Optional</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

export default IncotermsChainLab;
