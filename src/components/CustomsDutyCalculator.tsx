import { useMemo } from 'react';
import type { I18nDict } from '../data/i18n';
import {
  calculateVietnamCustomsDuty,
  FTA_REGIME_META,
  VIETNAM_HS_PRESETS,
} from '../engines/customsDutyEngine';
import { formatMoney, formatVnd } from '../engines/freight';
import type {
  Currency,
  CustomsDutyInput,
  FtaRegime,
  Lang,
} from '../types/logistics';
import { RefreshIcon, ScaleIcon, ShieldCheckIcon } from './Icons';

interface CustomsDutyCalculatorProps {
  t: I18nDict;
  lang: Lang;
  currency: Currency;
  dutyInput: CustomsDutyInput;
  setDutyInput: React.Dispatch<React.SetStateAction<CustomsDutyInput>>;
  currentQuoteFreightUsd: number;
  currentQuoteInsuranceUsd: number;
  currentQuoteDeclaredUsd: number;
}

const REGIMES: FtaRegime[] = ['MFN', 'EVFTA', 'CPTPP', 'ACFTA'];

export function CustomsDutyCalculator({
  t,
  lang,
  currency,
  dutyInput,
  setDutyInput,
  currentQuoteFreightUsd,
  currentQuoteInsuranceUsd,
  currentQuoteDeclaredUsd,
}: CustomsDutyCalculatorProps) {
  const result = useMemo(
    () => calculateVietnamCustomsDuty(dutyInput),
    [dutyInput],
  );

  const handleSelectPreset = (presetId: string) => {
    const preset = VIETNAM_HS_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setDutyInput((prev) => ({
      ...prev,
      presetId: preset.id,
      customHsCode: preset.hsCode,
      fobValueUsd: preset.defaultFobUsd,
      freightUsd: preset.defaultFreightUsd,
      insuranceUsd: preset.defaultInsuranceUsd,
      unitQuantity: preset.defaultUnits,
      vatRatePct: preset.defaultVatRatePct,
      sctRatePct: preset.defaultSctRatePct,
    }));
  };

  const handleSyncFromQuote = () => {
    setDutyInput((prev) => ({
      ...prev,
      fobValueUsd: Math.max(100, Math.round(currentQuoteDeclaredUsd)),
      freightUsd: Math.max(0, Math.round(currentQuoteFreightUsd)),
      insuranceUsd: Math.max(
        0,
        Math.round(
          currentQuoteInsuranceUsd > 0
            ? currentQuoteInsuranceUsd
            : currentQuoteDeclaredUsd * 0.0045,
        ),
      ),
    }));
  };

  const updateNum = (field: keyof CustomsDutyInput, raw: string) => {
    const val = Number(raw);
    setDutyInput((prev) => ({
      ...prev,
      [field]: Number.isFinite(val) ? Math.max(0, val) : 0,
    }));
  };

  const totalForBar = Math.max(1, result.totalLandedCostUsd);
  const barSegments = [
    {
      label: 'FOB',
      pct: (result.fobValueUsd / totalForBar) * 100,
      color: 'bg-[var(--accent-cyan)]',
    },
    {
      label: 'Freight + Ins',
      pct: ((result.freightUsd + result.insuranceUsd) / totalForBar) * 100,
      color: 'bg-[#38bdf8]',
    },
    {
      label: 'Duty + SCT',
      pct: ((result.importDutyUsd + result.sctUsd) / totalForBar) * 100,
      color: 'bg-[var(--accent-amber)]',
    },
    {
      label: 'VAT',
      pct: (result.vatUsd / totalForBar) * 100,
      color: 'bg-[var(--accent-rose)]',
    },
    {
      label: 'Local',
      pct: (result.localClearanceFeesUsd / totalForBar) * 100,
      color: 'bg-[var(--accent-emerald)]',
    },
  ];

  return (
    <section
      id="customs-duty"
      className="no-print border-b border-[var(--border)] py-12 lg:py-16"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="text-xs font-bold tracking-[0.12em] text-[var(--accent-amber)]">
              {t.customsEyebrow}
            </div>
            <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-[var(--text)] sm:text-3xl">
              {t.customsTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
              {t.customsSubtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSyncFromQuote}
            data-testid="customs-sync-freight"
            className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-panel)] px-4 py-2.5 text-xs font-semibold text-[var(--text)] transition-colors hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]"
          >
            <RefreshIcon className="h-3.5 w-3.5" />
            <span>{t.customsSyncFreight}</span>
          </button>
        </div>

        {/* 6 Vietnam HS Tariff Preset Cards */}
        <div className="mb-6">
          <div className="font-mono-tech mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {t.customsPresetsLabel}
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {VIETNAM_HS_PRESETS.map((preset) => {
              const selected = preset.id === dutyInput.presetId;
              const bestFta = Math.min(
                preset.evftaRatePct,
                preset.cptppRatePct,
                preset.acftaRatePct,
              );
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset.id)}
                  data-testid={`hs-preset-${preset.id}`}
                  className={`cursor-pointer rounded-xl border p-3 text-left transition-all ${
                    selected
                      ? 'border-[var(--accent-amber)] bg-[var(--accent-amber-soft)] shadow-md'
                      : 'border-[var(--border)] bg-[var(--bg-panel)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono-tech text-[11px] font-bold text-[var(--accent-cyan)]">
                      {preset.hsCode}
                    </span>
                    <span className="font-mono-tech rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--accent-emerald)]">
                      FTA {bestFta}%
                    </span>
                  </div>
                  <div className="mt-1.5 text-xs font-bold leading-snug text-[var(--text)]">
                    {lang === 'vi' ? preset.categoryVi : preset.categoryEn}
                  </div>
                  <div className="font-mono-tech mt-1 text-[10px] text-[var(--text-muted)]">
                    MFN {preset.mfnRatePct}% · VAT {preset.defaultVatRatePct}%
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 12-Col Workspace */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left 5 Cols: Valuation & Tax Inputs */}
          <div className="panel-card rounded-xl p-5 lg:col-span-5">
            <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-3">
              <div>
                <div className="font-mono-tech text-xs font-bold text-[var(--accent-cyan)]">
                  HS {result.hsCode}
                </div>
                <div className="mt-0.5 text-xs leading-snug text-[var(--text-muted)]">
                  {lang === 'vi'
                    ? result.preset.descriptionVi
                    : result.preset.descriptionEn}
                </div>
              </div>
              <ScaleIcon className="h-5 w-5 shrink-0 text-[var(--accent-amber)]" />
            </div>

            {/* FTA Regime Selector */}
            <div className="mt-4">
              <div className="font-mono-tech text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {t.customsRegimeLabel}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {REGIMES.map((reg) => {
                  const active = dutyInput.regime === reg;
                  const meta = FTA_REGIME_META[reg];
                  const row = result.comparisons.find((c) => c.regime === reg);
                  return (
                    <button
                      key={reg}
                      type="button"
                      onClick={() =>
                        setDutyInput((prev) => ({ ...prev, regime: reg }))
                      }
                      data-testid={`fta-regime-${reg}`}
                      className={`cursor-pointer rounded-lg border px-3 py-2 text-left transition-all ${
                        active
                          ? 'border-[var(--accent-emerald)] bg-[var(--accent-emerald-soft)]'
                          : 'border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono-tech text-xs font-extrabold text-[var(--text)]">
                          {reg}
                        </span>
                        <span
                          className={`font-mono-tech text-xs font-bold ${
                            (row?.dutyRatePct ?? 0) === 0
                              ? 'text-[var(--accent-emerald)]'
                              : 'text-[var(--accent-amber)]'
                          }`}
                        >
                          {row?.dutyRatePct ?? 0}%
                        </span>
                      </div>
                      <div className="mt-0.5 truncate text-[10px] text-[var(--text-muted)]">
                        {meta.certificateLabel}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-[11px] text-[var(--text-muted)]">
                <ShieldCheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-emerald)]" />
                <span>
                  {lang === 'vi' ? result.preset.coNoteVi : result.preset.coNoteEn}
                </span>
              </p>
            </div>

            {/* Numeric Valuation Fields */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)]">
                  {t.customsFobLabel}
                </label>
                <input
                  type="number"
                  min={100}
                  value={dutyInput.fobValueUsd}
                  data-testid="customs-fob-input"
                  onChange={(e) => updateNum('fobValueUsd', e.target.value)}
                  className="font-mono-tech mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-semibold text-[var(--text)] focus:border-[var(--accent-cyan)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)]">
                  {t.customsUnitsLabel}
                </label>
                <input
                  type="number"
                  min={1}
                  value={dutyInput.unitQuantity}
                  data-testid="customs-units-input"
                  onChange={(e) => updateNum('unitQuantity', e.target.value)}
                  className="font-mono-tech mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-semibold text-[var(--text)] focus:border-[var(--accent-cyan)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)]">
                  {t.customsFreightLabel}
                </label>
                <input
                  type="number"
                  min={0}
                  value={dutyInput.freightUsd}
                  onChange={(e) => updateNum('freightUsd', e.target.value)}
                  className="font-mono-tech mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-semibold text-[var(--text)] focus:border-[var(--accent-cyan)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)]">
                  {t.customsInsuranceLabel}
                </label>
                <input
                  type="number"
                  min={0}
                  value={dutyInput.insuranceUsd}
                  onChange={(e) => updateNum('insuranceUsd', e.target.value)}
                  className="font-mono-tech mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-semibold text-[var(--text)] focus:border-[var(--accent-cyan)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)]">
                  {t.customsSctLabel}
                </label>
                <input
                  type="number"
                  min={0}
                  max={150}
                  value={dutyInput.sctRatePct}
                  data-testid="customs-sct-input"
                  onChange={(e) => updateNum('sctRatePct', e.target.value)}
                  className="font-mono-tech mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-semibold text-[var(--text)] focus:border-[var(--accent-cyan)] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[var(--text-muted)]">
                  {t.customsLocalFeesLabel}
                </label>
                <input
                  type="number"
                  min={0}
                  value={dutyInput.localClearanceFeesUsd}
                  onChange={(e) =>
                    updateNum('localClearanceFeesUsd', e.target.value)
                  }
                  className="font-mono-tech mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-semibold text-[var(--text)] focus:border-[var(--accent-cyan)] focus:outline-none"
                />
              </div>
            </div>

            {/* Vietnam Import VAT 8% vs 10% Toggle */}
            <div className="mt-4">
              <div className="font-mono-tech text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {t.customsVatLabel}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {([8, 10] as const).map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() =>
                      setDutyInput((prev) => ({ ...prev, vatRatePct: rate }))
                    }
                    data-testid={`customs-vat-${rate}`}
                    className={`font-mono-tech cursor-pointer rounded-lg border py-2 text-xs font-bold transition-colors ${
                      dutyInput.vatRatePct === rate
                        ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan-soft)] text-[var(--accent-cyan)]'
                        : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                    }`}
                  >
                    VAT {rate}% {rate === 8 ? '(VN Relief)' : '(Standard)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right 7 Cols: Executive Landed-Cost Breakdown & 4-Regime Comparison Matrix */}
          <div className="space-y-4 lg:col-span-7">
            {/* Hero Landed-Cost KPI Strip */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="panel-card rounded-xl border-[var(--accent-cyan)]/40 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {t.customsLandedPerUnit}
                </div>
                <div
                  data-testid="customs-landed-unit"
                  className="font-mono-tech mt-1 text-2xl font-extrabold text-[var(--accent-cyan)]"
                >
                  {formatMoney(result.landedCostPerUnitUsd, currency)}
                </div>
                <div className="font-mono-tech mt-0.5 text-[11px] text-[var(--text-muted)]">
                  {currency === 'USD'
                    ? formatVnd(result.landedCostPerUnitVnd)
                    : formatMoney(result.landedCostPerUnitUsd, 'USD')}{' '}
                  / unit
                </div>
              </div>

              <div className="panel-card rounded-xl p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {t.customsLandedTotal}
                </div>
                <div
                  data-testid="customs-landed-total"
                  className="font-mono-tech mt-1 text-2xl font-extrabold text-[var(--text)]"
                >
                  {formatMoney(result.totalLandedCostUsd, currency)}
                </div>
                <div className="font-mono-tech mt-0.5 text-[11px] text-[var(--text-muted)]">
                  Tax Burden: {result.effectiveTaxBurdenPct}% of CIF
                </div>
              </div>

              <div className="panel-card rounded-xl border-[var(--accent-emerald)]/35 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {t.customsFtaSavings}
                </div>
                <div
                  data-testid="customs-fta-savings"
                  className="font-mono-tech mt-1 text-2xl font-extrabold text-[var(--accent-emerald)]"
                >
                  {result.savingsVsMfnUsd > 0
                    ? `-${formatMoney(result.savingsVsMfnUsd, currency)}`
                    : formatMoney(0, currency)}
                </div>
                <div className="font-mono-tech mt-0.5 text-[11px] text-[var(--text-muted)]">
                  {result.regime} ({result.appliedDutyRatePct}% vs MFN{' '}
                  {result.preset.mfnRatePct}%)
                </div>
              </div>
            </div>

            {/* Cascading Tax Breakdown & Stacked Waterfall */}
            <div className="panel-card rounded-xl p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono-tech text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                  {t.customsCifValuation} &amp; Vietnam Tax Cascade ({result.regime})
                </span>
                <span className="font-mono-tech text-xs font-semibold text-[var(--accent-cyan)]">
                  CIF {formatMoney(result.cifValueUsd, currency)}
                </span>
              </div>

              {/* Stacked Composition Bar */}
              <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                {barSegments.map((seg) =>
                  seg.pct > 0.2 ? (
                    <div
                      key={seg.label}
                      className={`${seg.color} h-full transition-all`}
                      style={{ width: `${seg.pct}%` }}
                      title={`${seg.label}: ${seg.pct.toFixed(1)}%`}
                    />
                  ) : null,
                )}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2 text-xs sm:grid-cols-2">
                <div className="flex items-center justify-between border-b border-[var(--border)] py-1.5">
                  <span className="text-[var(--text-muted)]">
                    {t.customsCifValuation} (FOB + Freight + Ins)
                  </span>
                  <span className="font-mono-tech font-bold text-[var(--text)]">
                    {formatMoney(result.cifValueUsd, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-[var(--border)] py-1.5">
                  <span className="text-[var(--text-muted)]">
                    {t.customsImportDuty} ({result.appliedDutyRatePct}%)
                  </span>
                  <span className="font-mono-tech font-bold text-[var(--accent-amber)]">
                    {formatMoney(result.importDutyUsd, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-[var(--border)] py-1.5">
                  <span className="text-[var(--text-muted)]">
                    {t.customsSctLine} ({result.sctRatePct}%)
                  </span>
                  <span className="font-mono-tech font-bold text-[var(--text)]">
                    {formatMoney(result.sctUsd, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-[var(--border)] py-1.5">
                  <span className="text-[var(--text-muted)]">
                    {t.customsVatLine} ({result.vatRatePct}%)
                  </span>
                  <span className="font-mono-tech font-bold text-[var(--accent-rose)]">
                    {formatMoney(result.vatUsd, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[var(--text-muted)]">
                    {t.customsTotalTaxes}
                  </span>
                  <span className="font-mono-tech font-extrabold text-[var(--accent-amber)]">
                    {formatMoney(result.totalTaxesUsd, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="text-[var(--text-muted)]">
                    {t.customsLocalFeesLabel}
                  </span>
                  <span className="font-mono-tech font-bold text-[var(--accent-emerald)]">
                    {formatMoney(result.localClearanceFeesUsd, currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* 4-Regime Preferential Comparison Table */}
            <div className="panel-card overflow-hidden rounded-xl">
              <div className="border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
                <h3 className="font-mono-tech text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                  {t.customsMatrixTitle}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--bg-elevated)]/60 text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
                      <th className="font-mono-tech px-4 py-2.5">FTA / C/O</th>
                      <th className="font-mono-tech px-3 py-2.5">Duty %</th>
                      <th className="font-mono-tech px-3 py-2.5">Total Taxes</th>
                      <th className="font-mono-tech px-3 py-2.5">Landed / Unit</th>
                      <th className="font-mono-tech px-4 py-2.5 text-right">
                        Savings vs MFN
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.comparisons.map((row) => {
                      const isSelected = row.regime === result.regime;
                      const isBest =
                        row.regime === result.bestRegime &&
                        row.savingsVsMfnUsd > 0;
                      return (
                        <tr
                          key={row.regime}
                          onClick={() =>
                            setDutyInput((prev) => ({
                              ...prev,
                              regime: row.regime,
                            }))
                          }
                          className={`cursor-pointer border-b border-[var(--border)] transition-colors last:border-b-0 ${
                            isSelected
                              ? 'bg-[var(--accent-cyan-soft)]'
                              : 'hover:bg-[var(--bg-elevated)]'
                          }`}
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono-tech font-bold text-[var(--text)]">
                                {row.regime}
                              </span>
                              {isBest && (
                                <span className="font-mono-tech rounded bg-[var(--accent-emerald-soft)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--accent-emerald)]">
                                  {t.customsOptimalBadge}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)]">
                              {row.certificateLabel}
                            </div>
                          </td>
                          <td className="font-mono-tech px-3 py-2.5 font-bold text-[var(--text)]">
                            {row.dutyRatePct}%
                          </td>
                          <td className="font-mono-tech px-3 py-2.5 text-[var(--text-muted)]">
                            {formatMoney(row.totalTaxesUsd, currency)}
                          </td>
                          <td className="font-mono-tech px-3 py-2.5 font-bold text-[var(--accent-cyan)]">
                            {formatMoney(row.landedCostPerUnitUsd, currency)}
                          </td>
                          <td className="font-mono-tech px-4 py-2.5 text-right font-bold text-[var(--accent-emerald)]">
                            {row.savingsVsMfnUsd > 0
                              ? `-${formatMoney(row.savingsVsMfnUsd, currency)}`
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
