import { describe, expect, it } from 'vitest';
import {
  buildGlobalMapState,
  getGlobalPortSpec,
  GLOBAL_MAP_PORT_SPECS,
} from '../maritimeMapEngine';

describe('maritimeMapEngine — Global Sea-Lane & Disruption Synchronizer', () => {
  it('exposes all 8 required global trade hub ports with valid coordinates', () => {
    const codes = GLOBAL_MAP_PORT_SPECS.map((p) => p.code);
    expect(codes).toEqual([
      'VNSGN',
      'VNHPH',
      'SGSIN',
      'AEDXB',
      'EGSUZ',
      'ZACPT',
      'NLRTM',
      'USLAX',
    ]);
    for (const port of GLOBAL_MAP_PORT_SPECS) {
      expect(port.x).toBeGreaterThan(20);
      expect(port.x).toBeLessThan(940);
      expect(port.y).toBeGreaterThan(40);
      expect(port.y).toBeLessThan(390);
      expect(port.annualThroughputMTeu).toBeGreaterThan(0);
      expect(port.dailyThroughputTeu).toBeGreaterThan(0);
    }
  });

  it('returns nominal baseline state when zero disruptions are active', () => {
    const state = buildGlobalMapState([]);
    expect(state.activeDisruptions).toHaveLength(0);
    expect(state.capeRerouteActive).toBe(false);
    expect(state.totalDailyTeuAtRisk).toBe(0);

    const suezOcean = state.lanes.find((l) => l.id === 'ocean-direct-eu');
    const capeRoute = state.lanes.find((l) => l.id === 'cape-reroute-eu');
    expect(suezOcean?.status).toBe('active');
    expect(suezOcean?.effectiveTransitDays).toBe(28);
    expect(capeRoute?.status).toBe('standby');

    for (const zone of state.zones) {
      expect(zone.active).toBe(false);
    }
  });

  it('blocks Suez direct lane and activates Cape Reroute +12d & Sea-Air DXB on Red Sea Closure', () => {
    const state = buildGlobalMapState(['red-sea-suez']);
    expect(state.capeRerouteActive).toBe(true);
    expect(state.zones.find((z) => z.id === 'red-sea-suez')?.active).toBe(true);

    const suezOcean = state.lanes.find((l) => l.id === 'ocean-direct-eu');
    const capeRoute = state.lanes.find((l) => l.id === 'cape-reroute-eu');
    const seaAirDxb = state.lanes.find((l) => l.id === 'sea-air-dxb');

    expect(suezOcean?.status).toBe('blocked');
    expect(capeRoute?.status).toBe('rerouted');
    expect(capeRoute?.effectiveTransitDays).toBe(40);
    expect(seaAirDxb?.status).toBe('active');
    expect(seaAirDxb?.effectiveTransitDays).toBe(15);

    const suezPort = state.ports.find((p) => p.code === 'EGSUZ');
    const capePort = state.ports.find((p) => p.code === 'ZACPT');
    expect(suezPort?.status).toBe('critical');
    expect(suezPort?.effectiveCongestionPct).toBeGreaterThanOrEqual(95);
    expect(capePort?.disruptionDeltaHours).toBeGreaterThan(0);
  });

  it('spikes Cat Lai berth congestion and dwell time by +96h (+4d) when Cat Lai Congestion is toggled', () => {
    const baseline = buildGlobalMapState([]);
    const shocked = buildGlobalMapState(['cat-lai-congestion']);

    const baseCatLai = baseline.ports.find((p) => p.code === 'VNSGN')!;
    const shockedCatLai = shocked.ports.find((p) => p.code === 'VNSGN')!;

    expect(shockedCatLai.effectiveDwellHours).toBe(
      baseCatLai.effectiveDwellHours + 96,
    );
    expect(shockedCatLai.effectiveCongestionPct).toBeGreaterThanOrEqual(92);
    expect(shockedCatLai.status).toBe('critical');
    expect(shockedCatLai.disruptionImpactEn).toContain('+4d');
  });

  it('spikes Los Angeles anchorage dwell by +216h (+9d) and activates Sea-Air via SIN on USWC Strike', () => {
    const state = buildGlobalMapState(['uswc-port-strike']);
    const lax = state.ports.find((p) => p.code === 'USLAX')!;
    const seaAirSin = state.lanes.find((l) => l.id === 'sea-air-sin')!;
    const oceanUs = state.lanes.find((l) => l.id === 'ocean-direct-us')!;

    expect(lax.effectiveDwellHours).toBe(lax.baseDwellHours + 216);
    expect(lax.status).toBe('critical');
    expect(oceanUs.status).toBe('congested');
    expect(oceanUs.effectiveTransitDays).toBe(29);
    expect(seaAirSin.status).toBe('active');
    expect(seaAirSin.effectiveTransitDays).toBe(12);
  });

  it('compounds multi-shock delays and daily TEU at risk accurately across all 3 disruptions', () => {
    const single = buildGlobalMapState(['red-sea-suez']);
    const triple = buildGlobalMapState([
      'red-sea-suez',
      'cat-lai-congestion',
      'uswc-port-strike',
    ]);

    expect(triple.activeDisruptions).toHaveLength(3);
    expect(triple.totalDailyTeuAtRisk).toBeGreaterThan(
      single.totalDailyTeuAtRisk,
    );
    expect(triple.congestedPortCount).toBeGreaterThanOrEqual(4);
    expect(triple.advisoryEn).toContain('DUAL CHOKEPOINT');

    const capeRoute = triple.lanes.find((l) => l.id === 'cape-reroute-eu')!;
    expect(capeRoute.effectiveTransitDays).toBe(44); // 40d Cape + 4d Cat Lai
  });

  it('deduplicates repeated disruption IDs and caps congestion at 99%', () => {
    const state = buildGlobalMapState([
      'red-sea-suez',
      'red-sea-suez',
      'uswc-port-strike',
      'cat-lai-congestion',
    ]);
    expect(state.activeDisruptions).toHaveLength(3);
    for (const port of state.ports) {
      expect(port.effectiveCongestionPct).toBeLessThanOrEqual(99);
    }
  });

  it('resolves port specs case-insensitively and falls back safely to VNSGN', () => {
    expect(getGlobalPortSpec('nlrtm').code).toBe('NLRTM');
    expect(getGlobalPortSpec('egsuz').shortLabel).toBe('Suez Canal');
    expect(getGlobalPortSpec('UNKNOWN').code).toBe('VNSGN');
  });

  it('includes valid SVG path geometry for every sea-lane and secondary air leg', () => {
    const state = buildGlobalMapState(['red-sea-suez', 'uswc-port-strike']);
    expect(state.lanes.length).toBe(6);
    for (const lane of state.lanes) {
      expect(lane.svgPath.startsWith('M ')).toBe(true);
      if (lane.kind === 'sea-air-hybrid') {
        expect(lane.secondaryAirPath?.startsWith('M ')).toBe(true);
      }
    }
  });

  it('provides distinct bilingual English and Vietnamese advisories across shock states', () => {
    const calm = buildGlobalMapState([]);
    const redSea = buildGlobalMapState(['red-sea-suez']);
    const catLai = buildGlobalMapState(['cat-lai-congestion']);
    const uswc = buildGlobalMapState(['uswc-port-strike']);

    expect(calm.advisoryEn).toContain('0 active shocks');
    expect(calm.advisoryVi).toContain('0 sự cố');
    expect(redSea.advisoryEn).toContain('Cape of Good Hope');
    expect(redSea.advisoryVi).toContain('Mũi Hảo Vọng');
    expect(catLai.advisoryEn).toContain('CAT LAI');
    expect(uswc.advisoryEn).toContain('USWC STRIKE');
  });

  it('tracks vessel bunching spillover at Rotterdam when Red Sea diversion is active', () => {
    const calm = buildGlobalMapState([]);
    const redSea = buildGlobalMapState(['red-sea-suez']);

    const calmRtm = calm.ports.find((p) => p.code === 'NLRTM')!;
    const redSeaRtm = redSea.ports.find((p) => p.code === 'NLRTM')!;
    expect(redSeaRtm.effectiveDwellHours).toBeGreaterThan(calmRtm.effectiveDwellHours);
    expect(redSeaRtm.effectiveCongestionPct).toBeGreaterThan(calmRtm.effectiveCongestionPct);
  });
});
