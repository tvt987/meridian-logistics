import { useEffect, useMemo, useState } from 'react';
import {
  PORT_HUBS,
  SHIPPING_CORRIDORS,
  WORLD_CONTINENT_PATHS,
} from '../data/corridors';
import type { I18nDict } from '../data/i18n';
import { formatCountdown } from '../engines/freight';
import type { CongestionLevel, Lang, ShippingCorridor } from '../types/logistics';
import {
  ActivityIcon,
  AnchorIcon,
  ArrowRightIcon,
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
  onSelectCorridor: (corridorId: string) => void;
  onLoadCorridorToQuote: (corridor: ShippingCorridor) => void;
}

const LABEL_OFFSETS: Record<
  string,
  { dx: number; dy: number; anchor: 'start' | 'end' }
> = {
  VNHPH: { dx: 10, dy: -6, anchor: 'start' },
  VNDAD: { dx: 11, dy: 4, anchor: 'start' },
  SGN: { dx: -10, dy: -3, anchor: 'end' },
  VNSGN: { dx: 10, dy: 15, anchor: 'start' },
  NLRTM: { dx: -9, dy: -8, anchor: 'end' },
  FRA: { dx: 10, dy: 11, anchor: 'start' },
  JPTYO: { dx: 10, dy: -2, anchor: 'start' },
  USLAX: { dx: 10, dy: 4, anchor: 'start' },
};

function congestionBadgeStyle(level: CongestionLevel): string {
  switch (level) {
    case 'optimal':
      return 'bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)] border-[var(--accent-emerald)]/30';
    case 'moderate':
      return 'bg-[var(--accent-amber-soft)] text-[var(--accent-amber)] border-[var(--accent-amber)]/30';
    case 'elevated':
      return 'bg-[var(--accent-rose-soft)] text-[var(--accent-rose)] border-[var(--accent-rose)]/30';
  }
}

export function ControlTowerHero({
  t,
  lang,
  selectedCorridorId,
  onSelectCorridor,
  onLoadCorridorToQuote,
}: ControlTowerHeroProps) {
  const [modeFilter, setModeFilter] = useState<'all' | 'sea' | 'air'>('all');
  const [paused, setPaused] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    if (paused) return;
    const id = window.setInterval(() => {
      setElapsedSec((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, [paused]);

  const visibleCorridors = useMemo(() => {
    if (modeFilter === 'all') return SHIPPING_CORRIDORS;
    return SHIPPING_CORRIDORS.filter((c) => c.modeGroup === modeFilter);
  }, [modeFilter]);

  const activeCorridor = useMemo(() => {
    return (
      SHIPPING_CORRIDORS.find((c) => c.id === selectedCorridorId) ??
      SHIPPING_CORRIDORS[0]
    );
  }, [selectedCorridorId]);

  const originHub = useMemo(
    () => PORT_HUBS.find((h) => h.code === activeCorridor.originCode),
    [activeCorridor.originCode],
  );
  const destHub = useMemo(
    () => PORT_HUBS.find((h) => h.code === activeCorridor.destCode),
    [activeCorridor.destCode],
  );

  // Subtle live temperature micro-drift (+/-0.1C) for telemetry realism
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

  const congestionLabel = (level: CongestionLevel) => {
    if (level === 'optimal') return t.congestionOptimal;
    if (level === 'moderate') return t.congestionModerate;
    return t.congestionElevated;
  };

  return (
    <section
      id="control-map"
      className="no-print maritime-grid-bg relative border-b border-[var(--border)] pt-3.5 pb-7 lg:pt-4 lg:pb-8"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Compact Executive Command Header + KPI Strip */}
        <div className="mb-3.5 grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <div className="mb-1.5 inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[10px] font-semibold tracking-wider text-[var(--accent-cyan)] sm:text-[11px]">
              <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent-emerald)]" />
              <span className="leading-snug">{t.heroEyebrow}</span>
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text)] sm:text-3xl lg:text-[32px] lg:leading-[1.15]">
              {t.heroTitle}
            </h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-[var(--text-muted)] sm:text-sm">
              {t.heroSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:col-span-5">
            {[
              { label: t.kpiVessels, value: '18', tone: 'text-[var(--accent-cyan)]' },
              { label: t.kpiTeu, value: '4,280', tone: 'text-[var(--text)]' },
              { label: t.kpiCustoms, value: '3.4h', tone: 'text-[var(--accent-amber)]' },
              { label: t.kpiReefer, value: '99.8%', tone: 'text-[var(--accent-emerald)]' },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="panel-card rounded-lg px-3 py-2"
              >
                <div className={`font-mono-tech text-lg font-bold ${kpi.tone}`}>
                  {kpi.value}
                </div>
                <div className="mt-0.5 text-[11px] font-medium leading-tight text-[var(--text-muted)]">
                  {kpi.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Split Control Tower Stage */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Interactive World Corridor Map (8 cols) */}
          <div className="panel-card flex flex-col overflow-hidden rounded-xl lg:col-span-8">
            {/* Map HUD Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'all', label: t.mapFilterAll },
                    { id: 'sea', label: t.mapFilterSea },
                    { id: 'air', label: t.mapFilterAir },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setModeFilter(tab.id);
                      if (
                        tab.id !== 'all' &&
                        activeCorridor.modeGroup !== tab.id
                      ) {
                        const firstMatch = SHIPPING_CORRIDORS.find(
                          (c) => c.modeGroup === tab.id,
                        );
                        if (firstMatch) onSelectCorridor(firstMatch.id);
                      }
                    }}
                    className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                      modeFilter === tab.id
                        ? 'bg-[var(--accent-cyan)] text-white'
                        : 'border border-[var(--border)] bg-[var(--bg-panel)] text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono-tech hidden text-[11px] text-[var(--text-muted)] sm:inline">
                  AIS/ADS-B · {activeCorridor.code}
                </span>
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  className="font-mono-tech cursor-pointer rounded-md border border-[var(--border)] bg-[var(--bg-panel)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)]"
                >
                  {paused ? t.mapResume : t.mapPause}
                </button>
              </div>
            </div>

            {/* Interactive SVG Nautical Control Map */}
            <div className="relative flex w-full flex-1 items-center bg-[var(--bg-map)]">
              <svg
                viewBox="0 10 960 398"
                className="block h-auto w-full select-none"
                role="img"
                aria-label="Global Maritime and Air Cargo Corridor Control Map"
              >
                <defs>
                  <radialGradient id="vietnamGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.34" />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                  </radialGradient>
                  <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2.6" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Latitude & Longitude Graticule */}
                <g stroke="var(--grid-line)" strokeWidth="1">
                  {[70, 150, 230, 310, 390].map((y) => (
                    <line key={`lat-${y}`} x1="0" y1={y} x2="960" y2={y} />
                  ))}
                  {[80, 200, 320, 440, 560, 680, 800, 920].map((x) => (
                    <line key={`lon-${x}`} x1={x} y1="0" x2={x} y2="430" />
                  ))}
                </g>

                {/* Graticule Telemetry Coordinates */}
                <g
                  fill="var(--text-dim)"
                  fontSize="9"
                  fontFamily="JetBrains Mono, monospace"
                  opacity="0.72"
                >
                  <text x="10" y="66">60°N</text>
                  <text x="10" y="146">30°N</text>
                  <text x="10" y="226">0° EQ</text>
                  <text x="10" y="306">30°S</text>
                  <text x="84" y="398">0° GMT</text>
                  <text x="352" y="398">105°E VN</text>
                  <text x="556" y="398">180° IDL</text>
                  <text x="714" y="398">120°W US</text>
                </g>

                {/* Stylized World Landmasses */}
                <g>
                  {WORLD_CONTINENT_PATHS.map((continent) => (
                    <path
                      key={continent.id}
                      d={continent.d}
                      fill="var(--land-fill)"
                      stroke="var(--land-stroke)"
                      strokeWidth="1.1"
                      strokeLinejoin="round"
                    />
                  ))}
                </g>

                {/* Vietnam Gateway Radar Halo */}
                <circle cx="364" cy="208" r="46" fill="url(#vietnamGlow)" />

                {/* Shipping & Air Corridors */}
                {visibleCorridors.map((corridor) => {
                  const isActive = corridor.id === activeCorridor.id;
                  const strokeColor =
                    corridor.modeGroup === 'air' ? '#f59e0b' : '#0ea5e9';
                  const pathId = `corridor-path-${corridor.id}`;

                  return (
                    <g
                      key={corridor.id}
                      onClick={() => onSelectCorridor(corridor.id)}
                      className="cursor-pointer"
                      data-testid={`map-corridor-${corridor.id}`}
                    >
                      {/* Wide clickable hit area */}
                      <path
                        d={corridor.svgPath}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="20"
                      />

                      {/* Subtle base track */}
                      <path
                        id={pathId}
                        d={corridor.svgPath}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={isActive ? 2.6 : 1.4}
                        strokeOpacity={isActive ? 0.45 : 0.28}
                        strokeDasharray={
                          corridor.modeGroup === 'air' ? '5 5' : undefined
                        }
                      />

                      {/* Animated flowing telemetry vector */}
                      <path
                        d={corridor.svgPath}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={isActive ? 2.8 : 1.5}
                        strokeOpacity={isActive ? 1 : 0.45}
                        strokeDasharray="10 14"
                        strokeLinecap="round"
                        filter={isActive ? 'url(#routeGlow)' : undefined}
                        className={`animate-route-flow ${
                          paused ? 'animate-route-flow-paused' : ''
                        }`}
                      />

                      {/* Moving Cargo Pulse Photon */}
                      {!paused && (
                        <circle
                          r={isActive ? 3.5 : 2.2}
                          fill={strokeColor}
                          opacity={isActive ? 0.95 : 0.55}
                        >
                          <animateMotion
                            dur={corridor.modeGroup === 'air' ? '5s' : '9s'}
                            repeatCount="indefinite"
                          >
                            <mpath href={`#${pathId}`} />
                          </animateMotion>
                        </circle>
                      )}

                      {/* Live AIS/ADS-B Vessel Beacon */}
                      <g
                        transform={`translate(${corridor.vesselPos.x}, ${corridor.vesselPos.y})`}
                      >
                        {isActive && (
                          <circle
                            r="11"
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth="1.5"
                            className="animate-radar-ping"
                          />
                        )}
                        <circle
                          r={isActive ? 6.5 : 4.2}
                          fill="var(--bg-map)"
                          stroke={strokeColor}
                          strokeWidth={isActive ? 2.2 : 1.5}
                        />
                        <circle
                          r={isActive ? 2.8 : 1.8}
                          fill={strokeColor}
                        />
                        {isActive && (
                          <g transform="translate(10, -14)">
                            <rect
                              x="0"
                              y="0"
                              width="126"
                              height="20"
                              rx="4"
                              fill="var(--bg-elevated)"
                              fillOpacity="0.94"
                              stroke={strokeColor}
                              strokeWidth="1"
                            />
                            <text
                              x="6"
                              y="13"
                              fill="var(--text)"
                              fontSize="9"
                              fontWeight="600"
                              fontFamily="JetBrains Mono, monospace"
                            >
                              {corridor.vesselName.slice(0, 18)}
                            </text>
                          </g>
                        )}
                      </g>
                    </g>
                  );
                })}

                {/* Port & Airport Hub Nodes */}
                {PORT_HUBS.map((hub) => {
                  const isHighlighted =
                    hub.code === activeCorridor.originCode ||
                    hub.code === activeCorridor.destCode;
                  const nodeColor =
                    hub.type === 'air' ? '#f59e0b' : '#10b981';
                  const offset = LABEL_OFFSETS[hub.code] ?? {
                    dx: 8,
                    dy: 4,
                    anchor: 'start' as const,
                  };
                  const pillWidth = hub.code.length * 6.5 + 10;
                  const pillX =
                    offset.anchor === 'end'
                      ? hub.x + offset.dx - pillWidth
                      : hub.x + offset.dx - 4;

                  return (
                    <g
                      key={hub.code}
                      onClick={() => onSelectCorridor(hub.linkedCorridorId)}
                      className="cursor-pointer"
                    >
                      <circle
                        cx={hub.x}
                        cy={hub.y}
                        r={isHighlighted ? 5.2 : 3.4}
                        fill={isHighlighted ? nodeColor : 'var(--bg-elevated)'}
                        stroke={nodeColor}
                        strokeWidth={isHighlighted ? 2 : 1.4}
                      />
                      <rect
                        x={pillX}
                        y={hub.y + offset.dy - 10}
                        width={pillWidth}
                        height="14"
                        rx="3"
                        fill="var(--bg-elevated)"
                        fillOpacity={isHighlighted ? 0.95 : 0.78}
                        stroke={
                          isHighlighted ? nodeColor : 'var(--border-strong)'
                        }
                        strokeWidth={isHighlighted ? 1 : 0.6}
                      />
                      <text
                        x={
                          offset.anchor === 'end'
                            ? hub.x + offset.dx - 5
                            : hub.x + offset.dx + 1
                        }
                        y={hub.y + offset.dy}
                        textAnchor={offset.anchor}
                        fill={isHighlighted ? 'var(--text)' : 'var(--text-muted)'}
                        fontSize="9"
                        fontWeight={isHighlighted ? '700' : '500'}
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {hub.code}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Bottom 4-Corridor Selector Bar */}
            <div className="grid grid-cols-2 gap-2 border-t border-[var(--border)] bg-[var(--bg-elevated)] p-2.5 sm:grid-cols-4">
              {SHIPPING_CORRIDORS.map((corridor) => {
                const isSelected = corridor.id === activeCorridor.id;
                const isAir = corridor.modeGroup === 'air';
                return (
                  <button
                    key={corridor.id}
                    type="button"
                    onClick={() => onSelectCorridor(corridor.id)}
                    data-testid={`corridor-btn-${corridor.id}`}
                    className={`cursor-pointer rounded-lg border px-2.5 py-2 text-left transition-all ${
                      isSelected
                        ? isAir
                          ? 'border-[var(--accent-amber)] bg-[var(--accent-amber-soft)]'
                          : 'border-[var(--accent-cyan)] bg-[var(--accent-cyan-soft)]'
                        : 'border-[var(--border)] bg-[var(--bg-panel)] hover:border-[var(--border-strong)]'
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
                        ? `${corridor.originNameVi} → ${corridor.destNameVi}`
                        : `${corridor.originNameEn} → ${corridor.destNameEn}`}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Live Corridor & Container Telemetry Inspector (4 cols) */}
          <div className="panel-card flex flex-col justify-between rounded-xl p-3.5 lg:col-span-4">
            <div>
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
                  <h2 className="mt-1 truncate text-base font-bold text-[var(--text)]">
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
              <div className="mt-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-2.5">
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span>{t.etaCountdown}</span>
                  <span className="font-mono-tech font-semibold text-[var(--text)]">
                    {activeCorridor.distanceKm.toLocaleString('en-US')} km
                  </span>
                </div>
                <div
                  className="font-mono-tech mt-0.5 text-lg font-bold tracking-tight text-[var(--accent-cyan)]"
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
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-2">
                  <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <ThermometerIcon className="h-3.5 w-3.5 text-[var(--accent-cyan)]" />
                      {t.tempTelemetry}
                    </span>
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
                        stroke="#0ea5e9"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={sparklinePoints}
                      />
                    </svg>
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-2">
                  <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                    <DropletIcon className="h-3.5 w-3.5 text-[var(--accent-cyan)]" />
                    {t.humidityTelemetry}
                  </div>
                  <div className="font-mono-tech mt-0.5 text-sm font-bold text-[var(--text)]">
                    {activeCorridor.telemetry.humidityPct}% RH
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-2">
                  <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                    <ActivityIcon className="h-3.5 w-3.5 text-[var(--accent-emerald)]" />
                    {t.shockTelemetry}
                  </div>
                  <div className="font-mono-tech mt-0.5 text-xs font-bold text-[var(--accent-emerald)]">
                    {activeCorridor.telemetry.shockG}G · NOMINAL
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-2">
                  <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                    <ShieldCheckIcon className="h-3.5 w-3.5 text-[var(--accent-emerald)]" />
                    {t.sealTelemetry}
                  </div>
                  <div className="font-mono-tech mt-0.5 truncate text-[11px] font-semibold text-[var(--text)]">
                    {activeCorridor.telemetry.sealId.split('·')[0].trim()}
                  </div>
                </div>
              </div>

              {/* Port Congestion Status */}
              <div className="mt-2.5 space-y-1.5">
                {[
                  { label: t.originPortStatus, hub: originHub },
                  { label: t.destPortStatus, hub: destHub },
                ].map(
                  ({ label, hub }) =>
                    hub && (
                      <div
                        key={hub.code}
                        className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1.5"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--text-dim)]">
                            <AnchorIcon className="h-3 w-3" />
                            <span>{label}</span>
                          </div>
                          <div className="truncate text-xs font-semibold text-[var(--text)]">
                            {hub.code} · {lang === 'vi' ? hub.nameVi : hub.nameEn}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <span
                            className={`inline-block rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase ${congestionBadgeStyle(
                              hub.congestion,
                            )}`}
                          >
                            {congestionLabel(hub.congestion)}
                          </span>
                          <div className="font-mono-tech mt-0.5 text-[10px] text-[var(--text-muted)]">
                            {t.berthWait}: {hub.dwellHours}h
                          </div>
                        </div>
                      </div>
                    ),
                )}
              </div>
            </div>

            {/* Load into Quote Engine Button */}
            <button
              type="button"
              onClick={() => onLoadCorridorToQuote(activeCorridor)}
              data-testid="load-corridor-quote"
              className="mt-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[var(--accent-cyan)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
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
