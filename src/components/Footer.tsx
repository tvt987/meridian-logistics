import { VIETQR_CONFIG } from '../data/corridors';
import type { I18nDict } from '../data/i18n';
import { MeridianLogo, ShieldCheckIcon } from './Icons';

interface FooterProps {
  t: I18nDict;
}

export function Footer({ t }: FooterProps) {
  return (
    <footer className="no-print bg-[var(--bg-elevated)] py-10">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 border-b border-[var(--border)] pb-8 md:grid-cols-12">
          <div className="md:col-span-5">
            <div className="flex items-center gap-2.5">
              <MeridianLogo className="h-8 w-8" />
              <div>
                <div className="text-sm font-extrabold tracking-tight text-[var(--text)]">
                  {t.brand}
                </div>
                <div className="text-[10px] font-semibold tracking-[0.12em] text-[var(--accent-cyan)]">
                  {t.brandSub}
                </div>
              </div>
            </div>
            <p className="mt-3 max-w-md text-xs leading-relaxed text-[var(--text-muted)]">
              {t.footerTagline}
            </p>
          </div>

          <div className="md:col-span-4">
            <div className="font-mono-tech text-[11px] font-semibold uppercase tracking-wider text-[var(--text)]">
              {t.footerOpsDesk}
            </div>
            <ul className="mt-2.5 space-y-1.5 text-xs text-[var(--text-muted)]">
              <li>Saigon Maritime Tower, Dist. 1, Ho Chi Minh City, Vietnam</li>
              <li className="font-mono-tech">Ops Desk: tinhkun102@gmail.com</li>
              <li className="font-mono-tech">
                Settlement: {VIETQR_CONFIG.bankName} · {VIETQR_CONFIG.accountNumber}
              </li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <div className="font-mono-tech text-[11px] font-semibold uppercase tracking-wider text-[var(--text)]">
              {t.footerCompliance}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {['ISO 28000', 'VNACCS AEO', 'IATA CEIV', 'GDP COLD-CHAIN'].map(
                (badge) => (
                  <span
                    key={badge}
                    className="font-mono-tech inline-flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--bg-panel)] px-2 py-1 text-[10px] font-semibold text-[var(--text-muted)]"
                  >
                    <ShieldCheckIcon className="h-3 w-3 text-[var(--accent-emerald)]" />
                    {badge}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-start justify-between gap-2 text-[11px] text-[var(--text-dim)] sm:flex-row sm:items-center">
          <span>{t.footerDisclaimer}</span>
          <span className="font-mono-tech">© 2026 MERIDIAN · TVT STUDIO</span>
        </div>
      </div>
    </footer>
  );
}
