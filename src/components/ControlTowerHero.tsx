import { useEffect, useMemo, useState } from 'react';
import { SHIPPING_CORRIDORS } from '../data/corridors';
import type { I18nDict } from '../data/i18n';
import { formatCountdown } from '../engines/freight';
import { buildGlobalMapState } from '../engines/maritimeMapEngine';
import type {
  DisruptionScenarioId,
  GlobalPortNode,
  GlobalSeaLane,
  Lang,
  PortStatusLevel,
  ShippingCorridor,
} from '../types/logistics';
import { GlobalCorridorMap, type MapLaneFilter } from './GlobalCorridorMap';
import {
  ActivityIcon,
  AlertTriangleIcon,
  AnchorIcon,
  ArrowRightIcon,
  CompassIcon,
  DropletIcon,
  PlaneIcon,
  ShieldCheckIcon,
  ShipIcon,
  ThermometerIcon,
} from './Icons';

interface ControlTowerHeroProps {
  t: I18nDict;
  lang: Lang;
  selectedCorridorId: string;
  activeDisruptions: DisruptionScenarioId[];
  openAlertsCount: number;
  criticalAlertsCount: number;
  onSelectCorridor: (corridorId: string) => void;
  onToggleDisruption: (id: DisruptionScenarioId) => void;
  onLoadCorridorToQuote: (corridor: ShippingCorridor) => void;
}

function statusPillClass(status: PortStatusLevel): string {
  switch (status) {
    case 'critical':
      return 'border-[var(--accent-rose)]/40 bg-[var(--accent-rose-soft)] text-[var(--accent-rose)]';
    case 'elevated':
      return 'border-[var(--accent-amber)]/40 bg-[var(--accent-amber-soft)] text-[var(--accent-amber)]';
    case 'moderate':
      return 'border-[var(--accent-cyan)]/35 bg-[var(--accent-cyan-soft)] text-[var(--accent-cyan)]';
    case 'optimal':
      return 'border-[var(--accent-emerald)]/35 bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)]';
  }
}

function statusBarClass(status: PortStatusLevel): string {
  switch (status) {
    case 'critical':
      return 'bg-[var(--accent-rose)]';
    case 'elevated':
      return 'bg-[var(--accent-amber)]';
    case 'moderate':
      return 'bg-[var(--accent-cyan)]';
    case 'optimal':
      return 'bg-[var(--accent-emerald)]';
  }
}

const DISRUPTION_CHIPS: {
  id: DisruptionScenarioId;
  labelEn: string;
  labelVi: string;
}[] = [
  { id: 'red-sea-suez', labelEn: 'Red Sea Closure', labelVi: 'Biển Đỏ +12d' },
  {
    id: 'cat-lai-congestion',
    labelEn: 'Cat Lai Congestion',
    labelVi: 'Cát Lái +4d',
  },
  { id: 'uswc-port-strike', labelEn: 'USWC Strike', labelVi: 'USWC +9d' },
];

export function ControlTowerHero({
  t,
  lang,
  selectedCorridorId,
  activeDisruptions,
  openAlertsCount,
  criticalAlertsCount,
  onSelectCorridor,
  onToggleDisruption,
  onLoadCorridorToQuote,
}: ControlTowerHeroProps) {
  const [laneFilter, setLaneFilter] = useState<MapLaneFilter>('all');
  const [paused, setPaused] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [inspectorTab, setInspectorTab] = useState<'corridor' | 'port'>('port');
  const [selectedPortCode, setSelectedPortCode] = useState<string>('VNSGN');

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [paused]);

  const mapState = useMemo(
    () => buildGlobalMapState(activeDisruptions),
    [activeDisruptions],
  );

  const activeCorridor = useMemo(() => {
    return (
      SHIPPING_CORRIDORS.find((c) => c.id === selectedCorridorId) ??
      SHIPPING_CORRIDORS[0]
    );
  }, [selectedCorridorId]);

  const inspectedPort: GlobalPortNode = useMemo(() => {
    return (
      mapState.ports.find((p) => p.code === selectedPortCode) ??
      mapState.ports[0]
    );
  }, [mapState.ports, selectedPortCode]);

  const liveTempC = useMemo(() => {
    const jitter = ((elapsedSec % 5) - 2) * 0.05;
    return Number((activeCorridor.telemetry.tempC + jitter).toFixed(1));
  }, [activeCorridor.telemetry.tempC, elapsedSec]);

  const sparklinePoints = useMemo(() => {
    const hist = activeCorridor.telemetry.tempHistory;
    const min = Math.min(...hist) - 0.3;
    const max = Math.max(...hist) + 0.3;
    const span = Math.max(0.5, max - min);
    return hist
      .map((val, idx) => {
        const x = (idx / Math.max(1, hist.length - 1)) * 92 + 4;
        const y = 24 - ((val - min) / span) * 18;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [activeCorridor.telemetry.tempHistory]);

  const handleSelectPort = (port: GlobalPortNode) => {
    setSelectedPortCode(port.code);
    setInspectorTab('port');
    onSelectCorridor(port.linkedCorridorId);
  };

  const handleSelectLane = (lane: GlobalSeaLane) => {
    onSelectCorridor(lane.corridorId);
    setInspectorTab('corridor');
  };

  return (
    <section
      id="control-map"
      className="no-print maritime-grid-bg relative border-b border-[var(--border)] pt-4 pb-8 lg:pt-5 lg:pb-10"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Clean Flexport/Maersk Executive Masthead + KPI Strip */}
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-1 text-[10px] font-bold tracking-[0.09em] text-[var(--accent-cyan)] shadow-xs sm:text-[11px]">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent-emerald)]" />
              <span>{t.heroEyebrow}</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)] sm:text-3xl lg:text-[34px] lg:leading-[1.12]">
              {t.heroTitle}
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-[var(--text-muted)] sm:text-sm">
              {t.heroSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:col-span-5">
            {[
              {
                label: t.kpiVessels,
                value: '18',
                pill: mapState.capeRerouteActive ? 'CAPE +12d' : null,
                pillAmber: true,
                tone: 'text-[var(--accent-cyan)]',
                href: '#reroute-lab',
              },
              {
                label: t.kpiTeu,
                value: '4,280',
                pill: null as string | null,
                pillAmber: false,
                tone: 'text-[var(--text)]',
                href: '#container-optimizer',
              },
              {
                label: t.kpiCustoms,
                value: '3.4h',
                pill: null as string | null,
                pillAmber: false,
                tone: 'text-[var(--accent-emerald)]',
                href: '#customs-duty',
              },
              {
                label: t.kpiAlerts,
                value: String(openAlertsCount),
                pill:
                  criticalAlertsCount > 0
                    ? `${criticalAlertsCount} CRIT`
                    : null,
                pillAmber: false,
                tone:
                  criticalAlertsCount > 0
                    ? 'text-[var(--accent-rose)]'
                    : 'text-[var(--accent-emerald)]',
                href: '#control-alerts',
              },
            ].map((kpi) => (
              <a
                key={kpi.label}
                href={kpi.href}
                className="panel-card rounded-xl px-3.5 py-2.5 transition-all hover:border-[var(--accent-cyan)]"
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`font-mono-tech text-lg font-extrabold ${kpi.tone}`}
                  >
                    {kpi.value}
                  </span>
                  {kpi.pill && (
                    <span
                      className={`font-mono-tech shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold ${
                        kpi.pillAmber
                          ? 'border-[var(--accent-amber)]/40 bg-[var(--accent-amber-soft)] text-[var(--accent-amber)]'
                          : 'border-[var(--accent-rose)]/35 bg-[var(--accent-rose-soft)] text-[var(--accent-rose)]'
                      }`}
                    >
                      {kpi.pill}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[11px] font-medium leading-tight text-[var(--text-muted)]">
                  {kpi.label}
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Main Split Maritime Control Tower Stage */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Interactive Global Sea-Lane & Air-Corridor World Map (8 cols) */}
          <div className="panel-card flex flex-col overflow-hidden rounded-xl lg:col-span-8">
            {/* Map Control & Synchronized Disruption Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2.5">
              {/* Lane Mode Filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'all', label: t.mapFilterAll },
                    { id: 'sea', label: t.mapFilterSea },
                    { id: 'hybrid', label: t.mapFilterHybrid },
                    { id: 'air', label: t.mapFilterAir },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setLaneFilter(tab.id)}
                    data-testid={`map-filter-${tab.id}`}
                    className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                      laneFilter === tab.id
                        ? 'bg-[var(--bg-navy)] text-white'
                        : 'border border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Pause/Resume Feed */}
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                data-testid="map-pause-btn"
                className="font-mono-tech cursor-pointer rounded-md border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)]"
              >
                {paused ? t.mapResume : t.mapPause}
              </button>
            </div>

            {/* Synchronized Live Disruption Shock Toggles Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--bg)]/70 px-3.5 py-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono-tech inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  <AlertTriangleIcon className="h-3.5 w-3.5 text-[var(--accent-amber)]" />
                  {t.mapDisruptionsInline}
                </span>
                {DISRUPTION_CHIPS.map((chip) => {
                  const active = activeDisruptions.includes(chip.id);
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => onToggleDisruption(chip.id)}
                      aria-pressed={active}
                      data-testid={`hero-disruption-${chip.id}`}
                      className={`font-mono-tech inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition-all ${
                        active
                          ? 'border-[var(--accent-rose)] bg-[var(--accent-rose-soft)] text-[var(--accent-rose)]'
                          : 'border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:border-[var(--accent-amber)] hover:text-[var(--text)]'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          active
                            ? 'bg-[var(--accent-rose)]'
                            : 'bg-[var(--text-dim)]'
                        }`}
                      />
                      <span>{lang === 'vi' ? chip.labelVi : chip.labelEn}</span>
                    </button>
                  );
                })}
              </div>

              <span className="font-mono-tech text-[10px] font-semibold text-[var(--text-dim)]">
                {mapState.congestedPortCount}/8 HUBS STRESSED
              </span>
            </div>

            {/* Interactive SVG World Map */}
            <GlobalCorridorMap
              t={t}
              lang={lang}
              mapState={mapState}
              laneFilter={laneFilter}
              selectedCorridorId={selectedCorridorId}
              selectedPortCode={selectedPortCode}
              paused={paused}
              onSelectPort={handleSelectPort}
              onSelectLane={handleSelectLane}
              onToggleDisruption={onToggleDisruption}
            />

            {/* Bottom 4-Corridor Selector Bar */}
            <div className="grid grid-cols-2 gap-2 border-t border-[var(--border)] bg-[var(--bg-elevated)] p-2.5 sm:grid-cols-4">
              {SHIPPING_CORRIDORS.map((corridor) => {
                const isSelected = corridor.id === activeCorridor.id;
                const isAir = corridor.modeGroup === 'air';
                return (
                  <button
                    key={corridor.id}
                    type="button"
                    onClick={() => {
                      onSelectCorridor(corridor.id);
                      setInspectorTab('corridor');
                    }}
                    data-testid={`corridor-btn-${corridor.id}`}
                    className={`cursor-pointer rounded-lg border px-2.5 py-2 text-left transition-all ${
                      isSelected
                        ? isAir
                          ? 'border-[var(--accent-amber)] bg-[var(--accent-amber-soft)]'
                          : 'border-[var(--accent-cyan)] bg-[var(--accent-cyan-soft)]'
                        : 'border-[var(--border)] bg-[var(--bg)]/60 hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono-tech text-[11px] font-bold text-[var(--text)]">
                        {corridor.code}
                      </span>
                      {isAir ? (
                        <PlaneIcon className="h-3.5 w-3.5 shrink-0 text-[var(--accent-amber)]" />
                      ) : (
                        <ShipIcon className="h-3.5 w-3.5 shrink-0 text-[var(--accent-cyan)]" />
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
                      {lang === 'vi'
                        ? `${corridor.originNameVi} -> ${corridor.destNameVi}`
                        : `${corridor.originNameEn} -> ${corridor.destNameEn}`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Live Inspector Rail: Port Telemetry Inspector <-> Vessel & Corridor Telemetry (4 cols) */}
          <div className="panel-card flex flex-col justify-between rounded-xl p-4 lg:col-span-4">
            <div>
              {/* Dual Inspector Mode Switcher */}
              <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-1">
                <button
                  type="button"
                  onClick={() => setInspectorTab('port')}
                  data-testid="inspector-tab-port"
                  className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-bold transition-colors ${
                    inspectorTab === 'port'
                      ? 'bg-[var(--bg-navy)] text-white'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <AnchorIcon className="h-3.5 w-3.5" />
                  <span>{t.mapTabPort}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInspectorTab('corridor')}
                  data-testid="inspector-tab-corridor"
                  className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-bold transition-colors ${
                    inspectorTab === 'corridor'
                      ? 'bg-[var(--bg-navy)] text-white'
                      : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  <CompassIcon className="h-3.5 w-3.5" />
                  <span>{t.mapTabCorridor}</span>
                </button>
              </div>

              {inspectorTab === 'port' ? (
                <div data-testid="port-inspector-panel">
                  {/* Port Hub Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          data-testid="inspected-port-code"
                          className="font-mono-tech rounded bg-[var(--accent-cyan-soft)] px-2 py-0.5 text-[11px] font-extrabold text-[var(--accent-cyan)]"
                        >
                          {inspectedPort.code}
                        </span>
                        <span className="font-mono-tech text-[10px] font-semibold uppercase text-[var(--text-dim)]">
                          {inspectedPort.type}
                        </span>
                      </div>
                      <h2
                        data-testid="inspected-port-name"
                        className="mt-1.5 truncate text-base font-extrabold text-[var(--text)]"
                      >
                        {lang === 'vi'
                          ? inspectedPort.nameVi
                          : inspectedPort.nameEn}
                      </h2>
                      <div className="text-xs text-[var(--text-muted)]">
                        {lang === 'vi'
                          ? `${inspectedPort.countryVi} · ${inspectedPort.regionVi}`
                          : `${inspectedPort.countryEn} · ${inspectedPort.regionEn}`}
                      </div>
                    </div>
                    <span
                      data-testid="inspected-port-status"
                      className={`font-mono-tech shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${statusPillClass(
                        inspectedPort.status,
                      )}`}
                    >
                      {inspectedPort.status}
                    </span>
                  </div>

                  {/* Key Port Telemetry Metrics: Dwell Time, Congestion %, Annual & Daily TEU */}
                  <div className="mt-3 grid grid-cols-2 gap-2.5">
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2.5">
                      <div className="text-[11px] font-medium text-[var(--text-muted)]">
                        {t.mapPortDwell}
                      </div>
                      <div
                        data-testid="inspected-port-dwell"
                        className="font-mono-tech mt-1 text-xl font-extrabold text-[var(--text)]"
                      >
                        {inspectedPort.effectiveDwellHours}h
                      </div>
                      <div className="font-mono-tech text-[10px] text-[var(--text-dim)]">
                        {inspectedPort.disruptionDeltaHours > 0
                          ? `Base ${inspectedPort.baseDwellHours}h (+${inspectedPort.disruptionDeltaHours}h)`
                          : t.mapPortBaseline}
                      </div>
                    </div>

                    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2.5">
                      <div className="text-[11px] font-medium text-[var(--text-muted)]">
                        {t.mapPortCongestion}
                      </div>
                      <div
                        data-testid="inspected-port-congestion"
                        className="font-mono-tech mt-1 text-xl font-extrabold text-[var(--accent-cyan)]"
                      >
                        {inspectedPort.effectiveCongestionPct}%
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                        <div
                          className={`h-full rounded-full transition-all ${statusBarClass(
                            inspectedPort.status,
                          )}`}
                          style={{
                            width: `${inspectedPort.effectiveCongestionPct}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2.5">
                      <div className="text-[11px] font-medium text-[var(--text-muted)]">
                        {t.mapPortAnnualTeu}
                      </div>
                      <div
                        data-testid="inspected-port-teu"
                        className="font-mono-tech mt-1 text-base font-extrabold text-[var(--text)]"
                      >
                        {inspectedPort.annualThroughputMTeu.toFixed(1)}M TEU
                      </div>
                      <div className="font-mono-tech text-[10px] text-[var(--text-dim)]">
                        {inspectedPort.dailyThroughputTeu.toLocaleString(
                          'en-US',
                        )}{' '}
                        TEU/day
                      </div>
                    </div>

                    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2.5">
                      <div className="text-[11px] font-medium text-[var(--text-muted)]">
                        {t.customsChannel}
                      </div>
                      <div
                        className={`font-mono-tech mt-1 text-base font-extrabold ${
                          inspectedPort.customsChannel === 'GREEN'
                            ? 'text-[var(--accent-emerald)]'
                            : inspectedPort.customsChannel === 'AMBER'
                              ? 'text-[var(--accent-amber)]'
                              : 'text-[var(--accent-cyan)]'
                        }`}
                      >
                        {inspectedPort.customsChannel}
                      </div>
                      <div className="font-mono-tech text-[10px] text-[var(--text-dim)]">
                        AIS / EDI Live
                      </div>
                    </div>
                  </div>

                  {/* Disruption Impact Box if Port is Affected */}
                  {inspectedPort.disruptionImpactEn && (
                    <div
                      data-testid="inspected-port-impact"
                      className="mt-3 rounded-lg border border-[var(--accent-rose)]/35 bg-[var(--accent-rose-soft)] p-2.5 text-xs leading-relaxed text-[var(--text)]"
                    >
                      <div className="font-mono-tech mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase text-[var(--accent-rose)]">
                        <AlertTriangleIcon className="h-3.5 w-3.5" />
                        <span>{t.mapPortShockDelta}</span>
                      </div>
                      <div>
                        {lang === 'vi'
                          ? inspectedPort.disruptionImpactVi
                          : inspectedPort.disruptionImpactEn}
                      </div>
                    </div>
                  )}

                  {/* Quick 8-Hub Port Switcher Pills */}
                  <div className="mt-3">
                    <div className="mb-1.5 flex flex-wrap gap-1">
                      {mapState.ports.map((p) => (
                        <button
                          key={p.code}
                          type="button"
                          onClick={() => handleSelectPort(p)}
                          data-testid={`port-pill-${p.code}`}
                          className={`font-mono-tech cursor-pointer rounded border px-2 py-0.5 text-[10px] font-bold transition-colors ${
                            p.code === inspectedPort.code
                              ? 'border-[var(--accent-cyan)] bg-[var(--accent-cyan)] text-white'
                              : 'border-[var(--border)] bg-[var(--bg)] text-[var(--text-muted)] hover:border-[var(--accent-cyan)] hover:text-[var(--text)]'
                          }`}
                        >
                          {p.code}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div data-testid="corridor-inspector-panel">
                  {/* Vessel / Corridor Header */}
                  <div className="flex items-start justify-between gap-2 border-b border-[var(--border)] pb-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono-tech inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            activeCorridor.modeGroup === 'air'
                              ? 'bg-[var(--accent-amber-soft)] text-[var(--accent-amber)]'
                              : 'bg-[var(--accent-cyan-soft)] text-[var(--accent-cyan)]'
                          }`}
                        >
                          {activeCorridor.modeGroup === 'air' ? (
                            <PlaneIcon className="h-3 w-3" />
                          ) : (
                            <ShipIcon className="h-3 w-3" />
                          )}
                          {activeCorridor.modeGroup === 'air'
                            ? 'AIR FREIGHTER'
                            : 'OCEAN LINER'}
                        </span>
                        <span className="font-mono-tech text-xs font-semibold text-[var(--text-muted)]">
                          {activeCorridor.code}
                        </span>
                      </div>
                      <h2 className="mt-1 truncate text-base font-extrabold text-[var(--text)]">
                        {activeCorridor.vesselName}
                      </h2>
                      <div className="font-mono-tech text-[11px] text-[var(--text-muted)]">
                        {activeCorridor.callsign}
                      </div>
                    </div>
                    <span className="font-mono-tech shrink-0 rounded border border-[var(--accent-emerald)]/30 bg-[var(--accent-emerald-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-emerald)]">
                      LIVE
                    </span>
                  </div>

                  {/* ETA Countdown & Route Progress */}
                  <div className="mt-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2.5">
                    <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                      <span>{t.etaCountdown}</span>
                      <span className="font-mono-tech font-semibold text-[var(--text)]">
                        {activeCorridor.distanceKm.toLocaleString('en-US')} km
                      </span>
                    </div>
                    <div
                      className="font-mono-tech mt-0.5 text-lg font-extrabold tracking-tight text-[var(--accent-cyan)]"
                      data-testid="live-eta-countdown"
                    >
                      {formatCountdown(
                        activeCorridor.etaRemainingSeconds - elapsedSec,
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px]">
                      <span className="text-[var(--text-muted)]">
                        {t.routeCompletion}
                      </span>
                      <span className="font-mono-tech font-semibold text-[var(--text)]">
                        {activeCorridor.progressPct}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                      <div
                        className={`h-full rounded-full transition-all ${
                          activeCorridor.modeGroup === 'air'
                            ? 'bg-[var(--accent-amber)]'
                            : 'bg-[var(--accent-cyan)]'
                        }`}
                        style={{ width: `${activeCorridor.progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Container Telemetry 2x2 Grid */}
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2">
                      <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                        <ThermometerIcon className="h-3.5 w-3.5 text-[var(--accent-cyan)]" />
                        {t.tempTelemetry}
                      </div>
                      <div className="mt-0.5 flex items-end justify-between gap-1">
                        <span className="font-mono-tech text-sm font-bold text-[var(--text)]">
                          {liveTempC > 0 ? `+${liveTempC}` : liveTempC}°C
                        </span>
                        <svg
                          viewBox="0 0 100 28"
                          className="h-5 w-14 shrink-0"
                          aria-hidden="true"
                        >
                          <polyline
                            fill="none"
                            stroke="#0284C7"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={sparklinePoints}
                          />
                        </svg>
                      </div>
                    </div>

                    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2">
                      <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                        <DropletIcon className="h-3.5 w-3.5 text-[var(--accent-cyan)]" />
                        {t.humidityTelemetry}
                      </div>
                      <div className="font-mono-tech mt-0.5 text-sm font-bold text-[var(--text)]">
                        {activeCorridor.telemetry.humidityPct}% RH
                      </div>
                    </div>

                    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2">
                      <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                        <ActivityIcon className="h-3.5 w-3.5 text-[var(--accent-emerald)]" />
                        {t.shockTelemetry}
                      </div>
                      <div className="font-mono-tech mt-0.5 text-xs font-bold text-[var(--accent-emerald)]">
                        {activeCorridor.telemetry.shockG}G · NOMINAL
                      </div>
                    </div>

                    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2">
                      <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                        <ShieldCheckIcon className="h-3.5 w-3.5 text-[var(--accent-emerald)]" />
                        {t.sealTelemetry}
                      </div>
                      <div className="font-mono-tech mt-0.5 truncate text-[11px] font-semibold text-[var(--text)]">
                        {activeCorridor.telemetry.sealId.split('·')[0].trim()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Load into Quote Engine Button */}
            <button
              type="button"
              onClick={() => onLoadCorridorToQuote(activeCorridor)}
              data-testid="load-corridor-quote"
              className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--accent-cyan)] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              <span>{t.loadIntoQuote}</span>
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
