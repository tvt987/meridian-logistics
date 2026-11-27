import { useEffect, useState } from 'react';
import type { I18nDict } from '../data/i18n';
import type { Currency, Lang, Theme } from '../types/logistics';
import { CloseIcon, MenuIcon, MeridianLogo, MoonIcon, SunIcon } from './Icons';

interface NavbarProps {
  t: I18nDict;
  lang: Lang;
  setLang: (lang: Lang) => void;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  openAlertsCount: number;
}

export function Navbar({
  t,
  lang,
  setLang,
  currency,
  setCurrency,
  theme,
  setTheme,
  openAlertsCount,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [utcTime, setUtcTime] = useState(() =>
    new Date().toISOString().slice(11, 19),
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setUtcTime(new Date().toISOString().slice(11, 19));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const navLinks = [
    { href: '#control-map', label: t.navMap },
    { href: '#container-optimizer', label: t.navContainer },
    { href: '#customs-duty', label: t.navCustoms },
    { href: '#quote-engine', label: t.navQuote },
    { href: '#waybill-tracker', label: t.navTracker },
    { href: '#control-alerts', label: t.navAlerts, badge: openAlertsCount },
  ];

  return (
    <header className="no-print sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <a
          href="#control-map"
          className="flex shrink-0 items-center gap-2.5 focus:outline-none"
        >
          <MeridianLogo className="h-9 w-9 shrink-0" />
          <div className="leading-none">
            <div className="whitespace-nowrap text-base font-extrabold tracking-tight text-[var(--text)]">
              {t.brand}
            </div>
            <div className="mt-0.5 whitespace-nowrap text-[9px] font-semibold tracking-[0.06em] text-[var(--accent-cyan)] sm:text-[10px] sm:tracking-[0.12em]">
              {t.brandSub}
            </div>
          </div>
        </a>

        {/* Desktop Nav */}
        <nav
          aria-label="Primary"
          className="hidden items-center gap-0.5 lg:flex"
        >
          {navLinks.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text)] xl:text-[13px]"
            >
              <span>{item.label}</span>
              {'badge' in item && item.badge !== undefined && item.badge > 0 && (
                <span className="font-mono-tech inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--accent-rose)] px-1 text-[10px] font-bold text-white">
                  {item.badge}
                </span>
              )}
            </a>
          ))}
        </nav>

        {/* Right Controls */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Live UTC Clock */}
          <div className="font-mono-tech hidden items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs text-[var(--text-muted)] 2xl:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-emerald)]" />
            <span>UTC {utcTime}</span>
          </div>

          {/* Currency Switcher */}
          <div
            role="group"
            aria-label="Currency selector"
            className="hidden items-center rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] p-0.5 sm:flex"
          >
            {(['USD', 'VND'] as Currency[]).map((cur) => (
              <button
                key={cur}
                type="button"
                onClick={() => setCurrency(cur)}
                data-testid={`currency-${cur.toLowerCase()}`}
                className={`cursor-pointer rounded px-2 py-1 text-[11px] font-semibold transition-colors ${
                  currency === cur
                    ? 'bg-[var(--accent-cyan)] text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {cur === 'VND' ? 'VNĐ' : 'USD'}
              </button>
            ))}
          </div>

          {/* Language Switcher */}
          <div
            role="group"
            aria-label="Language selector"
            className="flex items-center rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] p-0.5"
          >
            {(['vi', 'en'] as Lang[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => setLang(code)}
                data-testid={`lang-${code}`}
                className={`font-mono-tech cursor-pointer rounded px-2 py-1 text-[11px] font-semibold uppercase transition-colors ${
                  lang === code
                    ? 'bg-[var(--accent-amber)] text-[#080c12]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {code}
              </button>
            ))}
          </div>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle color theme"
            data-testid="theme-toggle"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)]"
          >
            {theme === 'dark' ? (
              <SunIcon className="h-4 w-4" />
            ) : (
              <MoonIcon className="h-4 w-4" />
            )}
          </button>

          {/* Primary CTA */}
          <a
            href="#quote-engine"
            className="hidden rounded-md bg-[var(--accent-cyan)] px-3.5 py-1.5 text-xs font-semibold tracking-wide text-white transition-opacity hover:opacity-90 md:inline-flex"
          >
            {t.instantQuoteCta}
          </a>

          {/* Mobile Drawer Trigger */}
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] text-[var(--text)] lg:hidden"
          >
            {mobileOpen ? (
              <CloseIcon className="h-4 w-4" />
            ) : (
              <MenuIcon className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="border-t border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3 lg:hidden">
          <div className="flex flex-col gap-1">
            {navLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2 text-sm font-medium text-[var(--text)] hover:bg-[var(--bg-subtle)]"
              >
                {item.label}
              </a>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-[var(--border)] pt-3 sm:hidden">
            <span className="font-mono-tech text-xs text-[var(--text-muted)]">
              CURRENCY
            </span>
            <div className="flex items-center gap-1">
              {(['USD', 'VND'] as Currency[]).map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => setCurrency(cur)}
                  className={`font-mono-tech rounded px-2.5 py-1 text-xs font-semibold ${
                    currency === cur
                      ? 'bg-[var(--accent-cyan)] text-white'
                      : 'border border-[var(--border)] text-[var(--text-muted)]'
                  }`}
                >
                  {cur === 'VND' ? 'VNĐ' : 'USD'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
