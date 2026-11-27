import { useMemo } from 'react';
import { WORLD_CONTINENT_PATHS } from '../data/corridors';
import type { I18nDict } from '../data/i18n';
import type {
  DisruptionScenarioId,
  GlobalMapState,
  GlobalPortNode,
  GlobalSeaLane,
  Lang,
  PortStatusLevel,
} from '../types/logistics';

export type MapLaneFilter = 'all' | 'sea' | 'hybrid' | 'air';

interface GlobalCorridorMapProps {
  t: I18nDict;
  lang: Lang;
  mapState: GlobalMapState;
  laneFilter: MapLaneFilter;
  selectedCorridorId: string;
  selectedPortCode: string | null;
  paused: boolean;
  onSelectPort: (port: GlobalPortNode) => void;
  onSelectLane: (lane: GlobalSeaLane) => void;
  onToggleDisruption: (id: DisruptionScenarioId) => void;
}

const PORT_LABEL_OFFSETS: Record<
  string,
  { dx: number; dy: number; anchor: 'start' | 'end' }
> = {
  VNHPH: { dx: 10, dy: -6, anchor: 'start' },
  VNSGN: { dx: 10, dy: 4, anchor: 'start' },
  SGSIN: { dx: -10, dy: 14, anchor: 'end' },
  AEDXB: { dx: 10, dy: -4, anchor: 'start' },
  EGSUZ: { dx: -12, dy: 4, anchor: 'end' },
  ZACPT: { dx: 10, dy: 4, anchor: 'start' },
  NLRTM: { dx: 10, dy: -6, anchor: 'start' },
  USLAX: { dx: 10, dy: 4, anchor: 'start' },
};

function portStatusColor(status: PortStatusLevel): string {
  switch (status) {
    case 'critical':
      return '#DC2626';
    case 'elevated':
      return '#D97706';
    case 'moderate':
      return '#0284C7';
    case 'optimal':
      return '#059669';
  }
}

function laneStrokeColor(lane: GlobalSeaLane): string {
  if (lane.status === 'blocked') return '#DC2626';
  if (lane.kind === 'cape-reroute') return '#D97706';
  if (lane.kind === 'direct-air') return '#D97706';
  if (lane.kind === 'sea-air-hybrid') return '#059669';
  if (lane.status === 'congested') return '#D97706';
  return '#0284C7';
}

export function GlobalCorridorMap({
  t,
  lang,
  mapState,
  laneFilter,
  selectedCorridorId,
  selectedPortCode,
  paused,
  onSelectPort,
  onSelectLane,
  onToggleDisruption,
}: GlobalCorridorMapProps) {
  const visibleLanes = useMemo(() => {
    return mapState.lanes.filter((lane) => {
      if (laneFilter === 'all') return true;
      if (laneFilter === 'sea') {
        return lane.kind === 'ocean-direct' || lane.kind === 'cape-reroute';
      }
      if (laneFilter === 'hybrid') {
        return lane.kind === 'sea-air-hybrid';
      }
      return lane.kind === 'direct-air';
    });
  }, [mapState.lanes, laneFilter]);

  return (
    <div className="flex flex-1 flex-col">
      {/* Crisp Hydrographic SVG World Chart */}
      <div className="relative flex w-full flex-1 items-center bg-[var(--bg-map)]">
        <svg
          viewBox="0 10 960 398"
          className="block h-auto w-full select-none"
          role="img"
          data-testid="global-sea-lane-svg"
          aria-label="Global Maritime Sea-Lane and Air Corridor Control Map"
        >
          <defs>
            <radialGradient id="vnGatewayHalo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#0284C7" stopOpacity="0.24" />
              <stop offset="100%" stopColor="#0284C7" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="disruptionCritGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#DC2626" stopOpacity="0.46" />
              <stop offset="65%" stopColor="#DC2626" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#DC2626" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="disruptionHighGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#D97706" stopOpacity="0.46" />
              <stop offset="65%" stopColor="#D97706" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#D97706" stopOpacity="0" />
            </radialGradient>
            <filter id="laneSignalGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.1" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Nautical Latitude / Longitude Graticule */}
          <g stroke="var(--grid-line)" strokeWidth="1">
            {[70, 150, 230, 310, 390].map((y) => (
              <line key={`lat-${y}`} x1="0" y1={y} x2="960" y2={y} />
            ))}
            {[80, 200, 320, 440, 560, 680, 800, 920].map((x) => (
              <line key={`lon-${x}`} x1={x} y1="0" x2={x} y2="430" />
            ))}
          </g>

          {/* Coordinate Ticks */}
          <g
            fill="var(--text-dim)"
            fontSize="8.5"
            fontFamily="JetBrains Mono, monospace"
            opacity="0.78"
          >
            <text x="10" y="66">60°N</text>
            <text x="10" y="146">30°N</text>
            <text x="10" y="226">0° EQ</text>
            <text x="10" y="306">30°S</text>
            <text x="84" y="398">0° GMT</text>
            <text x="348" y="398">105°E VN</text>
            <text x="556" y="398">180° IDL</text>
            <text x="714" y="398">120°W US</text>
          </g>

          {/* Cartographic Continents */}
          <g>
            {WORLD_CONTINENT_PATHS.map((continent) => (
              <path
                key={continent.id}
                d={continent.d}
                fill="var(--land-fill)"
                stroke="var(--land-stroke)"
                strokeWidth="1.05"
                strokeLinejoin="round"
              />
            ))}
          </g>

          {/* Vietnam Export Gateway Subtle Beacon */}
          <circle cx="364" cy="210" r="44" fill="url(#vnGatewayHalo)" />

          {/* Synchronized Glowing Disruption Zones */}
          {mapState.zones
            .filter((z) => z.active)
            .map((zone) => {
              const isCrit = zone.severity === 'critical';
              const stroke = isCrit ? '#DC2626' : '#D97706';
              const grad = isCrit
                ? 'url(#disruptionCritGlow)'
                : 'url(#disruptionHighGlow)';
              const tagW = zone.impactBadge.length * 5.8 + 14;
              const tagX = zone.cx > 640 ? zone.cx - tagW - 14 : zone.cx - tagW / 2;
              const tagY = zone.cy + zone.radius + 4;

              return (
                <g
                  key={zone.id}
                  onClick={() => onToggleDisruption(zone.id)}
                  className="cursor-pointer"
                  data-testid={`map-disruption-zone-${zone.id}`}
                >
                  <circle
                    cx={zone.cx}
                    cy={zone.cy}
                    r={zone.radius * 1.45}
                    fill={grad}
                    className={paused ? undefined : 'animate-disruption-pulse'}
                  />
                  <circle
                    cx={zone.cx}
                    cy={zone.cy}
                    r={zone.radius}
                    fill="none"
                    stroke={stroke}
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    strokeOpacity="0.85"
                  />
                  <rect
                    x={tagX}
                    y={tagY}
                    width={tagW}
                    height="15"
                    rx="3.5"
                    fill={stroke}
                  />
                  <text
                    x={tagX + tagW / 2}
                    y={tagY + 10.5}
                    textAnchor="middle"
                    fill="#FFFFFF"
                    fontSize="8"
                    fontWeight="700"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {zone.impactBadge}
                  </text>
                </g>
              );
            })}

          {/* Animated Sea-Lanes, Cape Diversion, Sea-Air Hybrid & Direct Air */}
          {visibleLanes.map((lane) => {
            const color = laneStrokeColor(lane);
            const isSelected = lane.corridorId === selectedCorridorId;
            const isStandby = lane.status === 'standby';
            const isBlocked = lane.status === 'blocked';
            const isRerouted = lane.status === 'rerouted';
            const primaryPathId = `v4-lane-${lane.id}`;
            const airLegPathId = `v4-lane-air-${lane.id}`;

            const strokeWidth = isRerouted
              ? 3.1
              : isSelected && !isStandby && !isBlocked
                ? 2.7
                : isStandby
                  ? 1.25
                  : 1.9;
            const baseOpacity = isBlocked
              ? 0.45
              : isStandby
                ? 0.25
                : isRerouted || isSelected
                  ? 0.92
                  : 0.62;

            return (
              <g
                key={lane.id}
                onClick={() => onSelectLane(lane)}
                className="cursor-pointer"
                data-testid={`map-lane-${lane.id}`}
                data-status={lane.status}
              >
                {/* Wide hit corridor */}
                <path
                  d={lane.svgPath}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="16"
                />

                {/* Base track */}
                <path
                  id={primaryPathId}
                  d={lane.svgPath}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  strokeOpacity={isBlocked ? 0.42 : baseOpacity * 0.42}
                  strokeDasharray={
                    isBlocked
                      ? '3 5'
                      : lane.kind === 'direct-air'
                        ? '5 5'
                        : isStandby
                          ? '4 6'
                          : undefined
                  }
                />

                {/* Flowing animated directional vector */}
                {!isBlocked && !isStandby && (
                  <path
                    d={lane.svgPath}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeOpacity={baseOpacity}
                    strokeDasharray="10 14"
                    strokeLinecap="round"
                    filter={isRerouted || isSelected ? 'url(#laneSignalGlow)' : undefined}
                    className={`animate-route-flow ${
                      paused ? 'animate-route-flow-paused' : ''
                    }`}
                  />
                )}

                {/* Secondary Air Leg for Sea-Air Hybrid (DXB / SIN) */}
                {lane.secondaryAirPath && (
                  <>
                    <path
                      id={airLegPathId}
                      d={lane.secondaryAirPath}
                      fill="none"
                      stroke="#D97706"
                      strokeWidth={isStandby ? 1.2 : 2.3}
                      strokeOpacity={isStandby ? 0.25 : 0.88}
                      strokeDasharray="5 5"
                      strokeLinecap="round"
                      className={
                        isStandby
                          ? undefined
                          : `animate-route-flow ${
                              paused ? 'animate-route-flow-paused' : ''
                            }`
                      }
                    />
                    {!paused && !isStandby && (
                      <circle r="3.4" fill="#D97706" stroke="#FFFFFF" strokeWidth="1">
                        <animateMotion dur="5.2s" repeatCount="indefinite">
                          <mpath href={`#${airLegPathId}`} />
                        </animateMotion>
                      </circle>
                    )}
                  </>
                )}

                {/* Live Moving Vessel / Aircraft Marker */}
                {!paused && !isBlocked && !isStandby && (
                  <g>
                    {lane.markerType === 'plane' ? (
                      <polygon
                        points="5,0 -3.5,-3 -1.5,0 -3.5,3"
                        fill="#D97706"
                        stroke="#FFFFFF"
                        strokeWidth="0.7"
                      >
                        <animateMotion
                          dur="5.5s"
                          repeatCount="indefinite"
                          rotate="auto"
                        >
                          <mpath href={`#${primaryPathId}`} />
                        </animateMotion>
                      </polygon>
                    ) : (
                      <circle
                        r={isRerouted ? 4.2 : 3.4}
                        fill={color}
                        stroke="#FFFFFF"
                        strokeWidth="1.2"
                      >
                        <animateMotion
                          dur={isRerouted ? '11s' : '8.5s'}
                          repeatCount="indefinite"
                        >
                          <mpath href={`#${primaryPathId}`} />
                        </animateMotion>
                      </circle>
                    )}
                  </g>
                )}

                {/* Cape Reroute +12d Route Callout Pill when Red Sea Closed */}
                {lane.id === 'cape-reroute-eu' && isRerouted && (
                  <g transform="translate(22, 286)">
                    <rect
                      x="0"
                      y="0"
                      width="110"
                      height="18"
                      rx="4"
                      fill="#0F2942"
                      stroke="#D97706"
                      strokeWidth="1.2"
                    />
                    <text
                      x="55"
                      y="12"
                      textAnchor="middle"
                      fill="#FFFFFF"
                      fontSize="8.5"
                      fontWeight="700"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      CAPE REROUTE +12d
                    </text>
                  </g>
                )}

                {/* Blocked Suez Marker */}
                {lane.id === 'ocean-direct-eu' && isBlocked && (
                  <g transform="translate(88, 120)">
                    <rect
                      x="0"
                      y="0"
                      width="76"
                      height="15"
                      rx="3"
                      fill="#FFFFFF"
                      fillOpacity="0.96"
                      stroke="#DC2626"
                      strokeWidth="1"
                    />
                    <text
                      x="38"
                      y="10.5"
                      textAnchor="middle"
                      fill="#DC2626"
                      fontSize="7.8"
                      fontWeight="700"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      SUEZ HALTED
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Interactive Global Trade Hub Port Nodes (8 Core Hubs) */}
          {mapState.ports.map((port) => {
            const isSelected = selectedPortCode === port.code;
            const ringColor = portStatusColor(port.status);
            const offset = PORT_LABEL_OFFSETS[port.code] ?? {
              dx: 9,
              dy: 4,
              anchor: 'start' as const,
            };
            const labelText = port.shortLabel;
            const pillW = labelText.length * 5.6 + 12;
            const pillX =
              offset.anchor === 'end'
                ? port.x + offset.dx - pillW
                : port.x + offset.dx - 4;
            const pillY = port.y + offset.dy - 10;

            const boxMinX = Math.min(port.x - 10, pillX);
            const boxMaxX = Math.max(port.x + 10, pillX + pillW);
            const boxMinY = Math.min(port.y - 10, pillY);
            const boxMaxY = Math.max(port.y + 10, pillY + 15);

            return (
              <g
                key={port.code}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPort(port);
                }}
                className="cursor-pointer"
                data-testid={`map-port-${port.code}`}
                data-status={port.status}
              >
                {/* Solid transparent hitbox covering both port dot and label pill */}
                <rect
                  x={boxMinX}
                  y={boxMinY}
                  width={boxMaxX - boxMinX}
                  height={boxMaxY - boxMinY}
                  fill="rgba(0,0,0,0)"
                  pointerEvents="all"
                />

                {/* Pulsing Beacon on Selected or Critical Port */}
                {(isSelected || port.status === 'critical') && !paused && (
                  <circle
                    cx={port.x}
                    cy={port.y}
                    r="10"
                    fill="none"
                    stroke={ringColor}
                    strokeWidth="1.6"
                    pointerEvents="none"
                    className="animate-radar-ping"
                  />
                )}

                {/* Port Node Marker */}
                <circle
                  cx={port.x}
                  cy={port.y}
                  r={isSelected ? 6.2 : 4.5}
                  fill={isSelected ? ringColor : 'var(--bg-elevated)'}
                  stroke={ringColor}
                  strokeWidth={isSelected ? 2.4 : 2}
                />
                <circle
                  cx={port.x}
                  cy={port.y}
                  r={isSelected ? 2.2 : 1.7}
                  fill={isSelected ? '#FFFFFF' : ringColor}
                />

                {/* Crisp Cartographic Hub Label Pill */}
                <rect
                  x={pillX}
                  y={pillY}
                  width={pillW}
                  height="15"
                  rx="3.5"
                  fill={isSelected ? '#0F2942' : 'var(--bg-elevated)'}
                  fillOpacity={isSelected ? 0.96 : 0.9}
                  stroke={isSelected ? '#0284C7' : ringColor}
                  strokeWidth={isSelected ? 1.2 : 0.75}
                />
                <text
                  x={
                    offset.anchor === 'end'
                      ? port.x + offset.dx - 6
                      : port.x + offset.dx + 2
                  }
                  y={port.y + offset.dy + 0.5}
                  textAnchor={offset.anchor}
                  fill={isSelected ? '#FFFFFF' : 'var(--text)'}
                  fontSize="8.5"
                  fontWeight={isSelected ? '700' : '600'}
                  fontFamily="JetBrains Mono, monospace"
                >
                  {labelText}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Cartographic Legend + Live Disruption Advisory Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] bg-[var(--bg-elevated)] px-3.5 py-2 text-[11px]">
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
          <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text-muted)]">
            <span className="h-0.5 w-4 rounded-full bg-[#0284C7]" />
            {t.mapLegendOcean}
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text-muted)]">
            <span className="h-0.5 w-4 rounded-full bg-[#D97706]" />
            {t.mapLegendCape}
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text-muted)]">
            <span className="h-0.5 w-4 rounded-full bg-[#059669]" />
            {t.mapLegendHybrid}
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium text-[var(--text-muted)]">
            <span className="h-2 w-2 rounded-full bg-[#DC2626]" />
            {t.mapLegendZone}
          </span>
        </div>

        <span className="font-mono-tech text-[10px] text-[var(--text-dim)]">
          {t.mapClickPortHint}
        </span>
      </div>

      {/* Live Advisory Banner */}
      <div
        data-testid="map-live-advisory"
        className={`border-t border-[var(--border)] px-3.5 py-2 text-xs font-medium ${
          mapState.activeDisruptions.length > 0
            ? 'bg-[var(--accent-amber-soft)] text-[var(--text)]'
            : 'bg-[var(--bg-subtle)]/60 text-[var(--text-muted)]'
        }`}
      >
        <span className="font-mono-tech mr-2 inline-block rounded bg-[var(--bg-navy)] px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">
          {mapState.activeDisruptions.length > 0 ? 'ALERT' : 'NOMINAL'}
        </span>
        <span>{lang === 'vi' ? mapState.advisoryVi : mapState.advisoryEn}</span>
      </div>
    </div>
  );
}
