import { useMemo, useState } from 'react';
import { SHIPPING_CORRIDORS } from '../data/corridors';
import type { I18nDict } from '../data/i18n';
import { formatMoney, formatVnd } from '../engines/freight';
import {
  DISRUPTION_SCENARIOS,
  REROUTE_CARGO_PROFILES,
  simulateCorridorReroute,
} from '../engines/rerouteSimulatorEngine';
import type {
  Currency,
  DisruptionScenarioId,
  Lang,
  RerouteOptionResult,
  TransportMode,
} from '../types/logistics';
import {
  ActivityIcon,
  AlertTriangleIcon,
  AnchorIcon,
  ArrowRightIcon,
  BoltIcon,
  CheckCircleIcon,
  ClockIcon,
  CompassIcon,
  PlaneIcon,
  ShieldCheckIcon,
  ShipIcon,
} from './Icons';

export interface PortRerouteLabProps {
  t: I18nDict;
  lang: Lang;
  currency: Currency;
  activeDisruptions: DisruptionScenarioId[];
  onToggleDisruption: (id: DisruptionScenarioId) => void;
  onSetDisruptions: (ids: DisruptionScenarioId[]) => void;
  onApplyRerouteToQuote: (payload: {
    corridorId: string;
    mode: TransportMode;
    cargoWeightKg: number;
    cargoVolumeCbm: number;
    cargoValueUsd: number;
  }) => void;
}

function renderModeBadgeIcon(modeId: RerouteOptionResult['modeId']) {
  if (modeId === 'direct-air') {
    return <PlaneIcon className="h-4 w-4 text-[var(--accent-amber)]" />;
  }
  if (modeId === 'sea-air-hybrid') {
    return <CompassIcon className="h-4 w-4 text-[var(--accent-cyan)]" />;
  }
  return <ShipIcon className="h-4 w-4 text-[var(--accent-emerald)]" />;
}

export function PortRerouteLab({
  t,
  lang,
  currency,
  activeDisruptions,
  onToggleDisruption,
  onSetDisruptions,
  onApplyRerouteToQuote,
}: PortRerouteLabProps) {
  const [corridorId, setCorridorId] = useState<string>('vn-eu-sea');
  const [cargoWeightKg, setCargoWeightKg] = useState<number>(4200);
  const [cargoVolumeCbm, setCargoVolumeCbm] = useState<number>(22);
  const [cargoValueUsd, setCargoValueUsd] = useState<number>(180000);
  const [slaDeadlineDays, setSlaDeadlineDays] = useState<number>(24);

  const simulation = useMemo(
    () =>
      simulateCorridorReroute({
        corridorId,
        cargoWeightKg,
        cargoVolumeCbm,
        cargoValueUsd,
        slaDeadlineDays,
        activeDisruptions,
      }),
    [
      corridorId,
      cargoWeightKg,
      cargoVolumeCbm,
      cargoValueUsd,
      slaDeadlineDays,
      activeDisruptions,
    ],
  );

  const toggleDisruption = (id: DisruptionScenarioId) => {
    onToggleDisruption(id);
  };

  const applyProfile = (profileId: string) => {
    const profile = REROUTE_CARGO_PROFILES.find((p) => p.id === profileId);
    if (!profile) return;
    setCorridorId(profile.corridorId);
    setCargoWeightKg(profile.cargoWeightKg);
    setCargoVolumeCbm(profile.cargoVolumeCbm);
    setCargoValueUsd(profile.cargoValueUsd);
    setSlaDeadlineDays(profile.slaDeadlineDays);
    if (profile.corridorId === 'vn-us-sea') {
      onSetDisruptions(['uswc-port-strike', 'cat-lai-congestion']);
    } else {
      onSetDisruptions(['red-sea-suez', 'cat-lai-congestion']);
    }
  };

  const maxLeadTime = Math.max(
    1,
    ...simulation.options.map((o) => o.totalLeadTimeDays),
  );
  const maxLandedCost = Math.max(
    1,
    ...simulation.options.map((o) => o.totalLandedCostUsd),
  );
  const maxCo2 = Math.max(
    1,
    ...simulation.options.map((o) => o.estimatedCo2Kg),
  );

  const recommendedOption =
    simulation.options.find((o) => o.recommended) ?? simulation.options[0];

  return (
    <section
      id="reroute-lab"
      data-testid="port-reroute-lab"
      className="no-print border-b border-[var(--border)] py-12 lg:py-16"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Header + Quick Stress Profiles */}
        <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="text-xs font-bold tracking-[0.12em] text-[var(--accent-cyan)]">
              {t.rerouteEyebrow}
            </div>
            <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-[var(--text)] sm:text-3xl">
              {t.rerouteTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
              {t.rerouteSubtitle}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">
              {t.reroutePresetsLabel}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {REROUTE_CARGO_PROFILES.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => applyProfile(profile.id)}
                  data-testid={`reroute-profile-${profile.id}`}
                  className="cursor-pointer rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--accent-cyan)] hover:text-[var(--text)]"
                >
                  {lang === 'vi' ? profile.labelVi : profile.labelEn}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Row 1: Interactive Global Disruption Scenario Toggles */}
        <div className="panel-card rounded-xl p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
            <div className="flex items-center gap-2">
              <BoltIcon className="h-4 w-4 text-[var(--accent-rose)]" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                {t.rerouteDisruptionsLabel}
              </h3>
              <span
                data-testid="active-disruptions-count"
                className={`font-mono-tech rounded px-2 py-0.5 text-[10px] font-bold ${
                  activeDisruptions.length > 0
                    ? 'bg-[var(--accent-rose-soft)] text-[var(--accent-rose)]'
                    : 'bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)]'
                }`}
              >
                {activeDisruptions.length > 0
                  ? `${activeDisruptions.length} ${t.rerouteActiveCount}`
                  : t.rerouteCalmSeas}
              </span>
            </div>

            {activeDisruptions.length > 0 && (
              <button
                type="button"
                onClick={() => onSetDisruptions([])}
                data-testid="clear-disruptions-btn"
                className="font-mono-tech cursor-pointer rounded-md border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--accent-cyan)] hover:text-[var(--text)]"
              >
                {t.rerouteClearDisruptions}
              </button>
            )}
          </div>

          <div className="mt-3.5 grid grid-cols-1 gap-3 md:grid-cols-3">
            {DISRUPTION_SCENARIOS.map((scenario) => {
              const active = activeDisruptions.includes(scenario.id);
              return (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => toggleDisruption(scenario.id)}
                  aria-pressed={active}
                  data-testid={`disruption-toggle-${scenario.id}`}
                  className={`flex cursor-pointer flex-col justify-between rounded-xl border p-3.5 text-left transition-all ${
                    active
                      ? scenario.severity === 'critical'
                        ? 'border-[var(--accent-rose)] bg-[var(--accent-rose-soft)] shadow-md'
                        : 'border-[var(--accent-amber)] bg-[var(--accent-amber-soft)] shadow-md'
                      : 'border-[var(--border)] bg-[var(--bg-elevated)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono-tech inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                        <AlertTriangleIcon
                          className={`h-3.5 w-3.5 ${
                            active
                              ? scenario.severity === 'critical'
                                ? 'text-[var(--accent-rose)]'
                                : 'text-[var(--accent-amber)]'
                              : 'text-[var(--text-dim)]'
                          }`}
                        />
                        {scenario.code}
                      </span>
                      <span
                        className={`font-mono-tech rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                          active
                            ? 'bg-[var(--accent-rose)] text-white'
                            : 'border border-[var(--border)] bg-[var(--bg-panel)] text-[var(--text-dim)]'
                        }`}
                      >
                        {active ? 'ACTIVE' : 'OFF'}
                      </span>
                    </div>

                    <div className="mt-2 text-sm font-bold text-[var(--text)]">
                      {lang === 'vi' ? scenario.titleVi : scenario.titleEn}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                      {lang === 'vi' ? scenario.subtitleVi : scenario.subtitleEn}
                    </p>
                  </div>

                  <div className="font-mono-tech mt-3 flex items-center justify-between border-t border-[var(--border)] pt-2 text-[10px]">
                    <span className="text-[var(--text-dim)]">
                      {lang === 'vi'
                        ? scenario.affectedRegionsVi
                        : scenario.affectedRegionsEn}
                    </span>
                    <span
                      className={`font-bold ${
                        active
                          ? 'text-[var(--accent-rose)]'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {scenario.oceanDelayBadge}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Shipment & Corridor Parameter Inputs */}
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--border)] pt-4 sm:grid-cols-3 lg:grid-cols-5">
            <div className="col-span-2 sm:col-span-1">
              <label
                htmlFor="reroute-corridor-select"
                className="block text-[11px] font-medium text-[var(--text-muted)]"
              >
                {t.rerouteCorridorLabel}
              </label>
              <select
                id="reroute-corridor-select"
                data-testid="reroute-corridor-select"
                value={corridorId}
                onChange={(e) => setCorridorId(e.target.value)}
                className="font-mono-tech mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2.5 py-2 text-xs font-semibold text-[var(--text)] focus:border-[var(--accent-cyan)] focus:outline-none"
              >
                {SHIPPING_CORRIDORS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="reroute-weight"
                className="block text-[11px] font-medium text-[var(--text-muted)]"
              >
                {t.rerouteWeightLabel}
              </label>
              <input
                id="reroute-weight"
                data-testid="reroute-weight-input"
                type="number"
                min={50}
                value={cargoWeightKg}
                onChange={(e) =>
                  setCargoWeightKg(Math.max(50, Number(e.target.value) || 50))
                }
                className="font-mono-tech mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2.5 py-2 text-xs font-semibold text-[var(--text)] focus:border-[var(--accent-cyan)] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="reroute-volume"
                className="block text-[11px] font-medium text-[var(--text-muted)]"
              >
                {t.rerouteVolumeLabel}
              </label>
              <input
                id="reroute-volume"
                data-testid="reroute-volume-input"
                type="number"
                min={1}
                value={cargoVolumeCbm}
                onChange={(e) =>
                  setCargoVolumeCbm(Math.max(1, Number(e.target.value) || 1))
                }
                className="font-mono-tech mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2.5 py-2 text-xs font-semibold text-[var(--text)] focus:border-[var(--accent-cyan)] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="reroute-value"
                className="block text-[11px] font-medium text-[var(--text-muted)]"
              >
                {t.rerouteValueLabel}
              </label>
              <input
                id="reroute-value"
                data-testid="reroute-value-input"
                type="number"
                min={1000}
                step={5000}
                value={cargoValueUsd}
                onChange={(e) =>
                  setCargoValueUsd(
                    Math.max(1000, Number(e.target.value) || 1000),
                  )
                }
                className="font-mono-tech mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2.5 py-2 text-xs font-semibold text-[var(--text)] focus:border-[var(--accent-cyan)] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="reroute-sla"
                className="block text-[11px] font-medium text-[var(--text-muted)]"
              >
                {t.rerouteSlaLabel}
              </label>
              <input
                id="reroute-sla"
                data-testid="reroute-sla-input"
                type="number"
                min={1}
                max={60}
                value={slaDeadlineDays}
                onChange={(e) =>
                  setSlaDeadlineDays(Math.max(1, Number(e.target.value) || 1))
                }
                className="font-mono-tech mt-1 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-elevated)] px-2.5 py-2 text-xs font-semibold text-[var(--text)] focus:border-[var(--accent-cyan)] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Executive Decision Summary Strip */}
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="panel-card rounded-xl p-3.5">
            <div className="text-[11px] text-[var(--text-muted)]">
              {t.rerouteOptimalBadge}
            </div>
            <div
              data-testid="reroute-recommended-mode"
              className="font-mono-tech mt-1 truncate text-base font-extrabold text-[var(--accent-cyan)]"
            >
              {lang === 'vi'
                ? recommendedOption.labelVi
                : recommendedOption.labelEn}
            </div>
            <div className="font-mono-tech mt-0.5 text-[10px] text-[var(--text-dim)]">
              {simulation.corridorCode} · {recommendedOption.totalLeadTimeDays}{' '}
              {t.daysUnit}
            </div>
          </div>

          <div className="panel-card rounded-xl p-3.5">
            <div className="text-[11px] text-[var(--text-muted)]">
              {t.rerouteLeadSaved}
            </div>
            <div
              data-testid="reroute-lead-saved"
              className="font-mono-tech mt-1 text-xl font-extrabold text-[var(--accent-emerald)]"
            >
              {simulation.leadTimeSavedVsOceanDays > 0
                ? `-${simulation.leadTimeSavedVsOceanDays} ${t.daysUnit}`
                : `0 ${t.daysUnit}`}
            </div>
            <div className="font-mono-tech mt-0.5 text-[10px] text-[var(--text-dim)]">
              SLA {slaDeadlineDays}d target
            </div>
          </div>

          <div className="panel-card rounded-xl p-3.5">
            <div className="text-[11px] text-[var(--text-muted)]">
              {t.rerouteNetDelta}
            </div>
            <div
              className={`font-mono-tech mt-1 text-xl font-extrabold ${
                simulation.netCostDeltaRecommendedVsOceanUsd <= 0
                  ? 'text-[var(--accent-emerald)]'
                  : 'text-[var(--accent-amber)]'
              }`}
            >
              {simulation.netCostDeltaRecommendedVsOceanUsd > 0 ? '+' : ''}
              {formatMoney(
                simulation.netCostDeltaRecommendedVsOceanUsd,
                currency,
              )}
            </div>
            <div className="font-mono-tech mt-0.5 text-[10px] text-[var(--text-dim)]">
              Incl. holding + SLA risk
            </div>
          </div>

          <div className="panel-card rounded-xl p-3.5">
            <div className="text-[11px] text-[var(--text-muted)]">
              {t.rerouteCo2Saved}
            </div>
            <div className="font-mono-tech mt-1 text-xl font-extrabold text-[var(--accent-emerald)]">
              -{simulation.seaAirCo2SavingsVsAirPct}% CO2e
            </div>
            <div className="font-mono-tech mt-0.5 text-[10px] text-[var(--text-dim)]">
              Via {simulation.options[1].hubCode} Hub
            </div>
          </div>
        </div>

        {/* 3-Column Multimodal Side-by-Side Comparison Grid */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {simulation.options.map((opt) => {
            const leadPct = Math.round(
              (opt.totalLeadTimeDays / maxLeadTime) * 100,
            );
            const costPct = Math.round(
              (opt.totalLandedCostUsd / maxLandedCost) * 100,
            );
            const co2Pct = Math.round((opt.estimatedCo2Kg / maxCo2) * 100);

            return (
              <div
                key={opt.modeId}
                data-testid={`reroute-card-${opt.modeId}`}
                className={`panel-card flex flex-col justify-between rounded-xl p-5 transition-all ${
                  opt.recommended
                    ? 'border-[var(--accent-cyan)] ring-1 ring-[var(--accent-cyan)]/40'
                    : ''
                }`}
              >
                <div>
                  {/* Card Top Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {renderModeBadgeIcon(opt.modeId)}
                        <h3 className="truncate text-base font-extrabold text-[var(--text)]">
                          {lang === 'vi' ? opt.labelVi : opt.labelEn}
                        </h3>
                      </div>
                      <div className="font-mono-tech mt-1 truncate text-[11px] text-[var(--text-muted)]">
                        {lang === 'vi' ? opt.routingPathVi : opt.routingPathEn}
                      </div>
                    </div>

                    {opt.recommended ? (
                      <span
                        data-testid={`recommended-badge-${opt.modeId}`}
                        className="font-mono-tech shrink-0 rounded border border-[var(--accent-cyan)]/40 bg-[var(--accent-cyan-soft)] px-2 py-0.5 text-[10px] font-bold uppercase text-[var(--accent-cyan)]"
                      >
                        {t.rerouteOptimalBadge}
                      </span>
                    ) : (
                      <span className="font-mono-tech shrink-0 rounded border border-[var(--border)] bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] font-bold text-[var(--text-muted)]">
                        {opt.resilienceScore}/100
                      </span>
                    )}
                  </div>

                  {/* Lead Time & SLA Banner */}
                  <div className="mt-3.5 flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
                    <div>
                      <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                        <ClockIcon className="h-3.5 w-3.5 text-[var(--accent-cyan)]" />
                        <span>{t.rerouteLeadTime}</span>
                      </div>
                      <div
                        data-testid={`reroute-lead-${opt.modeId}`}
                        className="font-mono-tech mt-0.5 text-2xl font-extrabold text-[var(--text)]"
                      >
                        {opt.totalLeadTimeDays} {t.daysUnit}
                      </div>
                      <div className="font-mono-tech text-[10px] text-[var(--text-dim)]">
                        Base {opt.baseLeadTimeDays}d{' '}
                        {opt.disruptionDelayDays > 0
                          ? `+ ${opt.disruptionDelayDays}d shock`
                          : '· 0d shock'}
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        data-testid={`reroute-sla-${opt.modeId}`}
                        className={`font-mono-tech inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${
                          opt.slaCompliant
                            ? 'border-[var(--accent-emerald)]/35 bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)]'
                            : 'border-[var(--accent-rose)]/40 bg-[var(--accent-rose-soft)] text-[var(--accent-rose)]'
                        }`}
                      >
                        {opt.slaCompliant ? (
                          <CheckCircleIcon className="h-3 w-3" />
                        ) : (
                          <AlertTriangleIcon className="h-3 w-3" />
                        )}
                        {opt.slaCompliant
                          ? t.rerouteSlaPass
                          : `${t.rerouteSlaBreach} +${opt.slaBreachDays}d`}
                      </span>
                      <div className="font-mono-tech mt-1 text-[10px] text-[var(--text-dim)]">
                        {t.rerouteResilience}: {opt.resilienceScore}/100
                      </div>
                    </div>
                  </div>

                  {/* Cost & Holding Penalty Breakdown */}
                  <div className="mt-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--text-muted)]">
                        {t.rerouteFreightBase}
                      </span>
                      <span className="font-mono-tech font-semibold text-[var(--text)]">
                        {formatMoney(opt.freightCostUsd, currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--text-muted)]">
                        {t.rerouteDisruptionSurcharge}
                      </span>
                      <span
                        className={`font-mono-tech font-semibold ${
                          opt.disruptionSurchargeUsd > 0
                            ? 'text-[var(--accent-amber)]'
                            : 'text-[var(--text-dim)]'
                        }`}
                      >
                        +{formatMoney(opt.disruptionSurchargeUsd, currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[var(--text-muted)]">
                        {t.rerouteHoldingPenalty}
                      </span>
                      <span
                        data-testid={`reroute-penalty-${opt.modeId}`}
                        className={`font-mono-tech font-semibold ${
                          opt.slaBreachPenaltyUsd > 0
                            ? 'text-[var(--accent-rose)]'
                            : 'text-[var(--text)]'
                        }`}
                      >
                        +{formatMoney(opt.inventoryHoldingPenaltyUsd, currency)}
                      </span>
                    </div>

                    <div className="flex items-baseline justify-between gap-2 border-t border-[var(--border)] pt-2.5">
                      <span className="font-bold text-[var(--text)]">
                        {t.rerouteTotalLanded}
                      </span>
                      <div className="text-right">
                        <div
                          data-testid={`reroute-total-${opt.modeId}`}
                          className="font-mono-tech text-base font-extrabold text-[var(--accent-cyan)]"
                        >
                          {formatMoney(opt.totalLandedCostUsd, currency)}
                        </div>
                        <div className="font-mono-tech text-[10px] text-[var(--text-dim)]">
                          {currency === 'USD'
                            ? formatVnd(opt.totalLandedCostVnd)
                            : formatMoney(opt.totalLandedCostUsd, 'USD')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Carbon & Relative Telemetry Bars */}
                  <div className="mt-4 space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 text-[var(--text-muted)]">
                        <ActivityIcon className="h-3.5 w-3.5 text-[var(--accent-emerald)]" />
                        {t.rerouteCarbon}
                      </span>
                      <span
                        data-testid={`reroute-co2-${opt.modeId}`}
                        className="font-mono-tech font-bold text-[var(--text)]"
                      >
                        {opt.estimatedCo2Kg.toLocaleString('en-US')} kg CO2e
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[10px]">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-tech w-12 shrink-0 text-[var(--text-dim)]">
                          LEAD
                        </span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                          <div
                            className="h-full rounded-full bg-[var(--accent-cyan)]"
                            style={{ width: `${Math.max(4, leadPct)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-tech w-12 shrink-0 text-[var(--text-dim)]">
                          COST
                        </span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                          <div
                            className="h-full rounded-full bg-[var(--accent-amber)]"
                            style={{ width: `${Math.max(4, costPct)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono-tech w-12 shrink-0 text-[var(--text-dim)]">
                          CO2e
                        </span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                          <div
                            className={`h-full rounded-full ${
                              opt.modeId === 'ocean-direct'
                                ? 'bg-[var(--accent-emerald)]'
                                : opt.modeId === 'sea-air-hybrid'
                                  ? 'bg-[var(--accent-amber)]'
                                  : 'bg-[var(--accent-rose)]'
                            }`}
                            style={{ width: `${Math.max(4, co2Pct)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="font-mono-tech flex items-center justify-between pt-1 text-[10px] text-[var(--text-dim)]">
                      <span className="flex items-center gap-1">
                        <AnchorIcon className="h-3 w-3" />
                        {lang === 'vi' ? opt.hubNameVi : opt.hubNameEn}
                      </span>
                      <span>{opt.carbonIntensityKgPerTon} kg/t</span>
                    </div>
                  </div>
                </div>

                {/* Action Button */}
                <button
                  type="button"
                  onClick={() =>
                    onApplyRerouteToQuote({
                      corridorId,
                      mode: opt.linkedQuoteMode,
                      cargoWeightKg,
                      cargoVolumeCbm,
                      cargoValueUsd,
                    })
                  }
                  data-testid={`reroute-apply-${opt.modeId}`}
                  className={`mt-4 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg px-3.5 py-2.5 text-xs font-bold transition-opacity hover:opacity-90 ${
                    opt.recommended
                      ? 'bg-[var(--accent-cyan)] text-white'
                      : 'border border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text)] hover:border-[var(--accent-cyan)]'
                  }`}
                >
                  <ShieldCheckIcon className="h-3.5 w-3.5" />
                  <span>{t.rerouteApplyQuote}</span>
                  <ArrowRightIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default PortRerouteLab;
