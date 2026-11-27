import { useMemo, useState } from 'react';
import type { I18nDict } from '../data/i18n';
import {
  countActiveExceptions,
  filterExceptions,
} from '../engines/exceptionEngine';
import type {
  AlertSeverity,
  AlertStatus,
  ExceptionAlert,
  Lang,
} from '../types/logistics';
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BoltIcon,
  CheckCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
} from './Icons';

interface ExceptionControlTowerProps {
  t: I18nDict;
  lang: Lang;
  alerts: ExceptionAlert[];
  onUpdateStatus: (alertId: string, status: AlertStatus) => void;
  onSimulateAlert: () => void;
  onInspectWaybill: (waybillId: string) => void;
}

function severityStyles(sev: AlertSeverity): {
  badge: string;
  border: string;
  dot: string;
} {
  switch (sev) {
    case 'critical':
      return {
        badge:
          'bg-[var(--accent-rose-soft)] text-[var(--accent-rose)] border-[var(--accent-rose)]/35',
        border: 'border-l-[3px] border-l-[var(--accent-rose)]',
        dot: 'bg-[var(--accent-rose)]',
      };
    case 'warning':
      return {
        badge:
          'bg-[var(--accent-amber-soft)] text-[var(--accent-amber)] border-[var(--accent-amber)]/35',
        border: 'border-l-[3px] border-l-[var(--accent-amber)]',
        dot: 'bg-[var(--accent-amber)]',
      };
    case 'info':
      return {
        badge:
          'bg-[var(--accent-cyan-soft)] text-[var(--accent-cyan)] border-[var(--accent-cyan)]/35',
        border: 'border-l-[3px] border-l-[var(--accent-cyan)]',
        dot: 'bg-[var(--accent-cyan)]',
      };
  }
}

export function ExceptionControlTower({
  t,
  lang,
  alerts,
  onUpdateStatus,
  onSimulateAlert,
  onInspectWaybill,
}: ExceptionControlTowerProps) {
  const [severityFilter, setSeverityFilter] = useState<'all' | AlertSeverity>(
    'all',
  );
  const [showResolved, setShowResolved] = useState(false);

  const counts = useMemo(() => countActiveExceptions(alerts), [alerts]);
  const visibleAlerts = useMemo(
    () => filterExceptions(alerts, severityFilter, showResolved),
    [alerts, severityFilter, showResolved],
  );

  return (
    <section
      id="control-alerts"
      className="no-print border-b border-[var(--border)] bg-[var(--bg-elevated)]/30 py-12 lg:py-16"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="text-xs font-bold tracking-[0.12em] text-[var(--accent-rose)]">
              {t.alertsEyebrow}
            </div>
            <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-[var(--text)] sm:text-3xl">
              {t.alertsTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
              {t.alertsSubtitle}
            </p>
          </div>

          <button
            type="button"
            onClick={onSimulateAlert}
            data-testid="simulate-alert-btn"
            className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--accent-amber)]/50 bg-[var(--accent-amber-soft)] px-4 py-2.5 text-xs font-bold text-[var(--accent-amber)] transition-opacity hover:opacity-90"
          >
            <BoltIcon className="h-3.5 w-3.5" />
            <span>{t.alertsSimulateBtn}</span>
          </button>
        </div>

        {/* Summary Counters + Filter Bar */}
        <div className="mb-5 flex flex-col justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-panel)] p-3.5 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                {
                  id: 'all',
                  label: `${t.alertsFilterAll} (${counts.totalActive})`,
                },
                {
                  id: 'critical',
                  label: `${t.alertsFilterCritical} (${counts.critical})`,
                },
                {
                  id: 'warning',
                  label: `${t.alertsFilterWarning} (${counts.warning})`,
                },
                {
                  id: 'info',
                  label: `${t.alertsFilterInfo} (${counts.info})`,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSeverityFilter(tab.id)}
                data-testid={`alert-filter-${tab.id}`}
                className={`font-mono-tech cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  severityFilter === tab.id
                    ? 'bg-[var(--accent-cyan)] text-white'
                    : 'border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
              data-testid="toggle-show-resolved"
              className="h-4 w-4 accent-[var(--accent-emerald)]"
            />
            <span>
              {t.alertsShowResolved} ({counts.resolved})
            </span>
          </label>
        </div>

        {/* Alert Cards Grid */}
        {visibleAlerts.length === 0 ? (
          <div className="panel-card flex flex-col items-center justify-center rounded-xl p-8 text-center">
            <ShieldCheckIcon className="h-8 w-8 text-[var(--accent-emerald)]" />
            <p className="mt-2 text-sm font-medium text-[var(--text-muted)]">
              {t.alertsEmpty}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {visibleAlerts.map((alert) => {
              const style = severityStyles(alert.severity);
              const isResolved = alert.status === 'resolved';
              const isAck = alert.status === 'acknowledged';
              return (
                <article
                  key={alert.id}
                  data-testid={`alert-card-${alert.id}`}
                  className={`panel-card flex flex-col justify-between rounded-xl p-4 sm:p-5 ${style.border} ${
                    isResolved ? 'opacity-70' : ''
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`font-mono-tech inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${style.badge}`}
                        >
                          <AlertTriangleIcon className="h-3 w-3" />
                          {alert.severity}
                        </span>
                        <span className="font-mono-tech text-xs font-bold text-[var(--text)]">
                          {alert.id}
                        </span>
                        <span className="font-mono-tech rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--accent-cyan)]">
                          {alert.waybillId} · {alert.portCode}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isResolved ? (
                          <span className="font-mono-tech inline-flex items-center gap-1 rounded bg-[var(--accent-emerald-soft)] px-2 py-0.5 text-[10px] font-bold text-[var(--accent-emerald)]">
                            <CheckCircleIcon className="h-3 w-3" />
                            RESOLVED
                          </span>
                        ) : (
                          <span className="font-mono-tech inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)]">
                            <ClockIcon className="h-3.5 w-3.5 text-[var(--accent-amber)]" />
                            {t.alertsSlaLeft}: {alert.slaMinutesRemaining}m
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="mt-2.5 text-sm font-bold text-[var(--text)] sm:text-base">
                      {lang === 'vi' ? alert.titleVi : alert.titleEn}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                      {lang === 'vi' ? alert.detailVi : alert.detailEn}
                    </p>

                    <div className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] px-3 py-2 text-xs">
                      <span className="font-mono-tech text-[10px] font-bold uppercase tracking-wider text-[var(--accent-cyan)]">
                        PLAYBOOK:{' '}
                      </span>
                      <span className="text-[var(--text)]">
                        {lang === 'vi' ? alert.actionVi : alert.actionEn}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
                    <span className="font-mono-tech text-[10px] text-[var(--text-dim)]">
                      {isResolved && alert.resolvedAt
                        ? `CLOSED ${alert.resolvedAt}`
                        : `DETECTED ${alert.detectedAt}`}
                    </span>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onInspectWaybill(alert.waybillId)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)] hover:border-[var(--accent-cyan)] hover:text-[var(--text)]"
                      >
                        <span>{t.alertsJumpWaybill}</span>
                        <ArrowRightIcon className="h-3 w-3" />
                      </button>

                      {!isResolved && !isAck && (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(alert.id, 'acknowledged')}
                          data-testid={`ack-alert-${alert.id}`}
                          className="cursor-pointer rounded-md border border-[var(--accent-amber)]/40 bg-[var(--accent-amber-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--accent-amber)] hover:opacity-90"
                        >
                          {t.alertsAckBtn}
                        </button>
                      )}

                      {!isResolved ? (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(alert.id, 'resolved')}
                          data-testid={`resolve-alert-${alert.id}`}
                          className="cursor-pointer rounded-md bg-[var(--accent-emerald)] px-2.5 py-1 text-[11px] font-bold text-white hover:opacity-90"
                        >
                          {t.alertsResolveBtn}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onUpdateStatus(alert.id, 'open')}
                          className="cursor-pointer rounded-md border border-[var(--border-strong)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text)]"
                        >
                          {t.alertsReopenBtn}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
