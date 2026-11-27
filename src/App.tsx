import { useEffect, useMemo, useState } from 'react';
import { BillOfLadingPrint } from './components/BillOfLadingPrint';
import { ControlTowerHero } from './components/ControlTowerHero';
import { Footer } from './components/Footer';
import { FreightQuoteEngine } from './components/FreightQuoteEngine';
import { Navbar } from './components/Navbar';
import { PortIntelligenceSection } from './components/PortIntelligenceSection';
import { WaybillTrackerSection } from './components/WaybillTrackerSection';
import { SHIPPING_CORRIDORS } from './data/corridors';
import { I18N } from './data/i18n';
import { calculateFreightQuote } from './engines/freight';
import {
  createBookedWaybill,
  loadStoredWaybills,
  saveWaybills,
} from './engines/waybillEngine';
import type {
  BookingCustomerForm,
  Currency,
  FreightQuoteInput,
  Lang,
  ShippingCorridor,
  Theme,
  WaybillRecord,
} from './types/logistics';

export function App() {
  const [lang, setLang] = useState<Lang>('en');
  const [theme, setTheme] = useState<Theme>('dark');
  const [currency, setCurrency] = useState<Currency>('USD');

  const [selectedCorridorId, setSelectedCorridorId] = useState<string>(
    SHIPPING_CORRIDORS[0].id,
  );

  const [quoteInput, setQuoteInput] = useState<FreightQuoteInput>({
    corridorId: SHIPPING_CORRIDORS[0].id,
    mode: 'air-express',
    lengthCm: 120,
    widthCm: 80,
    heightCm: 95,
    grossWeightKg: 95,
    packages: 6,
    declaredValueUsd: 85000,
    incoterm: 'CIF',
    customsClearance: true,
    cargoInsurance: true,
    reeferMonitoring: false,
  });

  const [waybills, setWaybills] = useState<WaybillRecord[]>(() =>
    loadStoredWaybills(),
  );
  const [activeWaybillId, setActiveWaybillId] = useState<string>(
    () => loadStoredWaybills()[0]?.id ?? 'MRD-88412',
  );
  const [blModalWaybill, setBlModalWaybill] = useState<WaybillRecord | null>(
    null,
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = I18N[lang];

  const activePrintWaybill = useMemo(() => {
    return (
      waybills.find((w) => w.id === activeWaybillId) ?? waybills[0]
    );
  }, [waybills, activeWaybillId]);

  const handleLoadCorridorToQuote = (corridor: ShippingCorridor) => {
    setQuoteInput((prev) => ({
      ...prev,
      corridorId: corridor.id,
      mode: corridor.defaultQuoteMode,
      reeferMonitoring: corridor.telemetry.tempC <= 8,
    }));
    const el = document.getElementById('quote-engine');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCreateBooking = (
    input: FreightQuoteInput,
    form: BookingCustomerForm,
  ): WaybillRecord => {
    const quote = calculateFreightQuote(input);
    const existingIds = new Set(waybills.map((w) => w.id));
    const created = createBookedWaybill(input, quote, form, existingIds);
    const updated = [created, ...waybills];
    setWaybills(updated);
    saveWaybills(updated);
    setActiveWaybillId(created.id);
    return created;
  };

  const handleTrackWaybill = (id: string) => {
    setActiveWaybillId(id);
    const el = document.getElementById('waybill-tracker');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleFocusCorridorFromPorts = (corridorId: string) => {
    setSelectedCorridorId(corridorId);
    const el = document.getElementById('control-map');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <Navbar
        t={t}
        lang={lang}
        setLang={setLang}
        currency={currency}
        setCurrency={setCurrency}
        theme={theme}
        setTheme={setTheme}
      />

      <main>
        <ControlTowerHero
          t={t}
          lang={lang}
          selectedCorridorId={selectedCorridorId}
          onSelectCorridor={setSelectedCorridorId}
          onLoadCorridorToQuote={handleLoadCorridorToQuote}
        />

        <FreightQuoteEngine
          t={t}
          lang={lang}
          currency={currency}
          quoteInput={quoteInput}
          setQuoteInput={setQuoteInput}
          onCreateBooking={handleCreateBooking}
          onTrackWaybill={handleTrackWaybill}
          onPreviewBl={(wb) => setBlModalWaybill(wb)}
        />

        <WaybillTrackerSection
          t={t}
          lang={lang}
          currency={currency}
          waybills={waybills}
          activeWaybillId={activeWaybillId}
          onSelectWaybill={setActiveWaybillId}
          onPreviewBl={(wb) => setBlModalWaybill(wb)}
        />

        <PortIntelligenceSection
          t={t}
          lang={lang}
          onFocusCorridor={handleFocusCorridorFromPorts}
        />
      </main>

      <Footer t={t} />

      {activePrintWaybill && (
        <BillOfLadingPrint
          t={t}
          lang={lang}
          currency={currency}
          printWaybill={activePrintWaybill}
          modalWaybill={blModalWaybill}
          onCloseModal={() => setBlModalWaybill(null)}
        />
      )}
    </div>
  );
}

export default App;
