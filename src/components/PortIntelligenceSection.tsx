import { PORT_HUBS } from '../data/corridors';
import type { I18nDict } from '../data/i18n';
import type { CongestionLevel, Lang } from '../types/logistics';
import { AnchorIcon, CompassIcon, PlaneIcon } from './Icons';

interface PortIntelligenceSectionProps {
  t: I18nDict;
  lang: Lang;
  onFocusCorridor: (corridorId: string) => void;
}

function barColor(level: CongestionLevel): string {
  if (level === 'optimal') return 'bg-[var(--accent-emerald)]';
  if (level === 'moderate') return 'bg-[var(--accent-amber)]';
  return 'bg-[var(--accent-rose)]';
}

function badgeColor(level: CongestionLevel): string {
  if (level === 'optimal')
    return 'bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)]';
  if (level === 'moderate')
    return 'bg-[var(--accent-amber-soft)] text-[var(--accent-amber)]';
  return 'bg-[var(--accent-rose-soft)] text-[var(--accent-rose)]';
}

export function PortIntelligenceSection({
  t,
  lang,
  onFocusCorridor,
}: PortIntelligenceSectionProps) {
  const congestionText = (level: CongestionLevel) => {
    if (level === 'optimal') return t.congestionOptimal;
    if (level === 'moderate') return t.congestionModerate;
    return t.congestionElevated;
  };

  return (
    <section
      id="port-intel"
      className="no-print border-b border-[var(--border)] py-12 lg:py-16"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <div className="text-xs font-bold tracking-[0.12em] text-[var(--accent-cyan)]">
            {t.portsEyebrow}
          </div>
          <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-[var(--text)] sm:text-3xl">
            {t.portsTitle}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
            {t.portsSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PORT_HUBS.map((hub) => (
            <div
              key={hub.code}
              className="panel-card flex flex-col justify-between rounded-xl p-4 transition-colors hover:border-[var(--border-strong)]"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] ${
                        hub.type === 'air'
                          ? 'text-[var(--accent-amber)]'
                          : 'text-[var(--accent-cyan)]'
                      }`}
                    >
                      {hub.type === 'air' ? (
                        <PlaneIcon className="h-4 w-4" />
                      ) : (
                        <AnchorIcon className="h-4 w-4" />
                      )}
                    </span>
                    <div>
                      <div className="font-mono-tech text-sm font-bold text-[var(--text)]">
                        {hub.code}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)]">
                        {lang === 'vi' ? hub.countryVi : hub.countryEn}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`font-mono-tech rounded px-2 py-0.5 text-[10px] font-bold uppercase ${badgeColor(
                      hub.congestion,
                    )}`}
                  >
                    {congestionText(hub.congestion)}
                  </span>
                </div>

                <h3 className="mt-3 text-sm font-bold text-[var(--text)]">
                  {lang === 'vi' ? hub.nameVi : hub.nameEn}
                </h3>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {lang === 'vi' ? hub.weatherNoteVi : hub.weatherNoteEn}
                </p>

                <div className="mt-4 space-y-2">
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[var(--text-muted)]">
                        {t.berthOccupancy}
                      </span>
                      <span className="font-mono-tech font-semibold text-[var(--text)]">
                        {hub.berthOccupancyPct}%
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                      <div
                        className={`h-full rounded-full ${barColor(hub.congestion)}`}
                        style={{ width: `${hub.berthOccupancyPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)]">
                      {t.berthWait}
                    </span>
                    <span className="font-mono-tech font-semibold text-[var(--text)]">
                      {hub.dwellHours}h
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-muted)]">
                      {t.customsChannel}
                    </span>
                    <span
                      className={`font-mono-tech text-[11px] font-bold ${
                        hub.customsChannel === 'GREEN'
                          ? 'text-[var(--accent-emerald)]'
                          : 'text-[var(--accent-amber)]'
                      }`}
                    >
                      {hub.customsChannel}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onFocusCorridor(hub.linkedCorridorId)}
                className="mt-4 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] py-2 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)]"
              >
                <CompassIcon className="h-3.5 w-3.5" />
                <span>{t.focusCorridor}</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
