import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { ControlTowerHero } from './components/ControlTowerHero';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { SHIPPING_CORRIDORS } from './data/corridors';
import { I18N } from './data/i18n';
import {
  CONTAINER_SPECS,
  STUFFING_PRESETS,
} from './engines/containerPackingEngine';
import {
  calculateVietnamCustomsDuty,
  VIETNAM_HS_PRESETS,
} from './engines/customsDutyEngine';
import {
  countActiveExceptions,
  createSimulatedAlert,
  loadStoredExceptions,
  saveExceptions,
  updateAlertStatus,
} from './engines/exceptionEngine';
import { calculateFreightQuote } from './engines/freight';
import {
  advanceWaybillStage,
  createBookedWaybill,
  deleteUserWaybill,
  loadStoredWaybills,
  saveWaybills,
} from './engines/waybillEngine';
import type {
  AlertStatus,
  BookingCustomerForm,
  CargoSkuItem,
  ContainerSpec,
  ContainerTypeId,
  Currency,
  CustomsDutyInput,
  DisruptionScenarioId,
  ExceptionAlert,
  FreightQuoteInput,
  Lang,
  PrintDocTab,
  ShippingCorridor,
  Theme,
  TransportMode,
  WaybillRecord,
} from './types/logistics';

const PortRerouteLab = lazy(() => import('./components/PortRerouteLab'));
const IncotermsChainLab = lazy(() => import('./components/IncotermsChainLab'));
const Container3DPacker = lazy(() => import('./components/Container3DPacker'));
const CustomsDutyCalculator = lazy(() =>
  import('./components/CustomsDutyCalculator').then((m) => ({
    default: m.CustomsDutyCalculator,
  })),
);
const FreightQuoteEngine = lazy(() =>
  import('./components/FreightQuoteEngine').then((m) => ({
    default: m.FreightQuoteEngine,
  })),
);
const WaybillTrackerSection = lazy(() =>
  import('./components/WaybillTrackerSection').then((m) => ({
    default: m.WaybillTrackerSection,
  })),
);
const ExceptionControlTower = lazy(() =>
  import('./components/ExceptionControlTower').then((m) => ({
    default: m.ExceptionControlTower,
  })),
);
const PortIntelligenceSection = lazy(() =>
  import('./components/PortIntelligenceSection').then((m) => ({
    default: m.PortIntelligenceSection,
  })),
);
const TradeDocStudio = lazy(() => import('./components/TradeDocStudio'));

function SectionLoadingSkeleton({ label }: { label: string }) {
  return (
    <section
      aria-busy="true"
      className="no-print border-b border-[var(--border)] py-12"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <div className="panel-card flex h-40 items-center justify-center rounded-xl">
          <span className="font-mono-tech text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
            {label}
          </span>
        </div>
      </div>
    </section>
  );
}

export function App() {
  const [lang, setLang] = useState<Lang>('en');
  const [theme, setTheme] = useState<Theme>('light');
  const [currency, setCurrency] = useState<Currency>('USD');

  const [selectedCorridorId, setSelectedCorridorId] = useState<string>(
    SHIPPING_CORRIDORS[0].id,
  );

  // Synchronized global disruption toggles shared by Hero GlobalCorridorMap & PortRerouteLab
  const [activeDisruptions, setActiveDisruptions] = useState<
    DisruptionScenarioId[]
  >(['red-sea-suez']);

  // Container Load & Carton Stuffing Optimizer State
  const [containerType, setContainerType] = useState<ContainerTypeId>(
    STUFFING_PRESETS[0].containerType,
  );
  const [packingSkus, setPackingSkus] = useState<CargoSkuItem[]>(() =>
    STUFFING_PRESETS[0].skus.map((s) => ({ ...s })),
  );

  // Vietnam HS Code & FTA Customs Duty State
  const [dutyInput, setDutyInput] = useState<CustomsDutyInput>(() => {
    const p = VIETNAM_HS_PRESETS[0];
    return {
      presetId: p.id,
      customHsCode: p.hsCode,
      regime: 'EVFTA',
      fobValueUsd: p.defaultFobUsd,
      freightUsd: p.defaultFreightUsd,
      insuranceUsd: p.defaultInsuranceUsd,
      unitQuantity: p.defaultUnits,
      vatRatePct: p.defaultVatRatePct,
      sctRatePct: p.defaultSctRatePct,
      localClearanceFeesUsd: 340,
    };
  });

  // Freight Quote Engine State
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

  // Persistent localStorage Shipment Vault
  const [waybills, setWaybills] = useState<WaybillRecord[]>(() =>
    loadStoredWaybills(),
  );
  const [activeWaybillId, setActiveWaybillId] = useState<string>(
    () => loadStoredWaybills()[0]?.id ?? 'MRD-88412',
  );

  // Persistent localStorage Exception Alert Control Tower
  const [alerts, setAlerts] = useState<ExceptionAlert[]>(() =>
    loadStoredExceptions(),
  );

  // A4 Trade Document Print Studio Modal State
  const [blModalWaybill, setBlModalWaybill] = useState<WaybillRecord | null>(
    null,
  );
  const [docTab, setDocTab] = useState<PrintDocTab>('bl');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = I18N[lang];

  const liveQuoteResult = useMemo(
    () => calculateFreightQuote(quoteInput),
    [quoteInput],
  );
  const liveCustomsResult = useMemo(
    () => calculateVietnamCustomsDuty(dutyInput),
    [dutyInput],
  );
  const alertCounts = useMemo(() => countActiveExceptions(alerts), [alerts]);

  const activePrintWaybill = useMemo(() => {
    return waybills.find((w) => w.id === activeWaybillId) ?? waybills[0];
  }, [waybills, activeWaybillId]);

  const handleToggleDisruption = (id: DisruptionScenarioId) => {
    setActiveDisruptions((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

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

  const handleApplyRerouteToQuote = (payload: {
    corridorId: string;
    mode: TransportMode;
    cargoWeightKg: number;
    cargoVolumeCbm: number;
    cargoValueUsd: number;
  }) => {
    const packages = Math.max(1, Math.round(payload.cargoVolumeCbm / 1.1));
    const avgPkgWeight = Math.max(
      1,
      Math.round(payload.cargoWeightKg / packages),
    );
    const avgCbmPerPkg = payload.cargoVolumeCbm / packages;
    const sideCm = Math.max(25, Math.round(Math.cbrt(avgCbmPerPkg * 1_000_000)));
    setQuoteInput((prev) => ({
      ...prev,
      corridorId: payload.corridorId,
      mode: payload.mode,
      lengthCm: sideCm,
      widthCm: sideCm,
      heightCm: sideCm,
      grossWeightKg: avgPkgWeight,
      packages,
      declaredValueUsd: payload.cargoValueUsd,
    }));
    const el = document.getElementById('quote-engine');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleSendContainerLoadToQuote = (payload: {
    container: ContainerSpec;
    totalWeightKg: number;
    totalVolumeCbm: number;
    totalCartons: number;
    containersRequired: number;
  }) => {
    const avgPkgWeight = Math.max(
      1,
      Math.round(payload.totalWeightKg / Math.max(1, payload.totalCartons)),
    );
    const avgCbmPerPkg =
      payload.totalVolumeCbm / Math.max(1, payload.totalCartons);
    const sideCm = Math.max(20, Math.round(Math.cbrt(avgCbmPerPkg * 1_000_000)));
    setQuoteInput((prev) => ({
      ...prev,
      mode: payload.container.linkedQuoteMode,
      lengthCm: sideCm,
      widthCm: sideCm,
      heightCm: sideCm,
      grossWeightKg: avgPkgWeight,
      packages: payload.totalCartons,
      reeferMonitoring: payload.container.isReefer,
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

  const handleAdvanceStage = (waybillId: string) => {
    setWaybills((prev) => {
      const updated = advanceWaybillStage(prev, waybillId);
      saveWaybills(updated);
      return updated;
    });
  };

  const handleDeleteUserWaybill = (waybillId: string) => {
    setWaybills((prev) => {
      const updated = deleteUserWaybill(prev, waybillId);
      saveWaybills(updated);
      if (activeWaybillId === waybillId) {
        setActiveWaybillId(updated[0]?.id ?? 'MRD-88412');
      }
      return updated;
    });
  };

  const handleTrackWaybill = (id: string) => {
    setActiveWaybillId(id);
    const el = document.getElementById('waybill-tracker');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleOpenPrintDoc = (waybill: WaybillRecord, tab: PrintDocTab) => {
    setDocTab(tab);
    setBlModalWaybill(waybill);
  };

  const handleUpdateAlertStatus = (alertId: string, status: AlertStatus) => {
    setAlerts((prev) => {
      const updated = updateAlertStatus(prev, alertId, status);
      saveExceptions(updated);
      return updated;
    });
  };

  const handleSimulateAlert = () => {
    setAlerts((prev) => {
      const sim = createSimulatedAlert(prev);
      const updated = [sim, ...prev];
      saveExceptions(updated);
      return updated;
    });
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
        openAlertsCount={alertCounts.totalActive}
      />

      <main>
        <ControlTowerHero
          t={t}
          lang={lang}
          theme={theme}
          selectedCorridorId={selectedCorridorId}
          activeDisruptions={activeDisruptions}
          openAlertsCount={alertCounts.totalActive}
          criticalAlertsCount={alertCounts.critical}
          onSelectCorridor={setSelectedCorridorId}
          onToggleDisruption={handleToggleDisruption}
          onLoadCorridorToQuote={handleLoadCorridorToQuote}
        />

        <Suspense
          fallback={
            <SectionLoadingSkeleton label="Loading Port Disruption Reroute Simulator..." />
          }
        >
          <PortRerouteLab
            t={t}
            lang={lang}
            currency={currency}
            activeDisruptions={activeDisruptions}
            onToggleDisruption={handleToggleDisruption}
            onSetDisruptions={setActiveDisruptions}
            onApplyRerouteToQuote={handleApplyRerouteToQuote}
          />
        </Suspense>

        <Suspense
          fallback={
            <SectionLoadingSkeleton label="Loading Incoterms 2020 Cost & Risk Transfer Visualizer..." />
          }
        >
          <IncotermsChainLab
            t={t}
            lang={lang}
            currency={currency}
            currentQuoteFreightUsd={
              liveQuoteResult.baseFreightUsd + liveQuoteResult.fuelSurchargeUsd
            }
            currentQuoteDeclaredUsd={quoteInput.declaredValueUsd}
          />
        </Suspense>

        <Suspense
          fallback={
            <SectionLoadingSkeleton label="Loading 3D Container SOLAS VGM Packer..." />
          }
        >
          <Container3DPacker
            t={t}
            lang={lang}
            containerType={containerType}
            setContainerType={setContainerType}
            skus={packingSkus}
            setSkus={setPackingSkus}
            onSendLoadToQuote={handleSendContainerLoadToQuote}
            onOpenPackingListPrint={() => {
              if (activePrintWaybill) {
                handleOpenPrintDoc(activePrintWaybill, 'packing');
              }
            }}
          />
        </Suspense>

        <Suspense
          fallback={
            <SectionLoadingSkeleton label="Loading Vietnam HS/FTA Customs Engine..." />
          }
        >
          <CustomsDutyCalculator
            t={t}
            lang={lang}
            currency={currency}
            dutyInput={dutyInput}
            setDutyInput={setDutyInput}
            currentQuoteFreightUsd={
              liveQuoteResult.baseFreightUsd + liveQuoteResult.fuelSurchargeUsd
            }
            currentQuoteInsuranceUsd={liveQuoteResult.insuranceUsd}
            currentQuoteDeclaredUsd={quoteInput.declaredValueUsd}
          />
        </Suspense>

        <Suspense
          fallback={
            <SectionLoadingSkeleton label="Loading Multimodal Freight Quote Engine..." />
          }
        >
          <FreightQuoteEngine
            t={t}
            lang={lang}
            currency={currency}
            quoteInput={quoteInput}
            setQuoteInput={setQuoteInput}
            onCreateBooking={handleCreateBooking}
            onTrackWaybill={handleTrackWaybill}
            onPreviewBl={(wb) => handleOpenPrintDoc(wb, 'bl')}
          />
        </Suspense>

        <Suspense
          fallback={
            <SectionLoadingSkeleton label="Loading Persistent Waybill Vault..." />
          }
        >
          <WaybillTrackerSection
            t={t}
            lang={lang}
            currency={currency}
            waybills={waybills}
            activeWaybillId={activeWaybillId}
            onSelectWaybill={setActiveWaybillId}
            onPreviewDoc={handleOpenPrintDoc}
            onAdvanceStage={handleAdvanceStage}
            onDeleteUserWaybill={handleDeleteUserWaybill}
          />
        </Suspense>

        <Suspense
          fallback={
            <SectionLoadingSkeleton label="Loading Exception Control Tower..." />
          }
        >
          <ExceptionControlTower
            t={t}
            lang={lang}
            alerts={alerts}
            onUpdateStatus={handleUpdateAlertStatus}
            onSimulateAlert={handleSimulateAlert}
            onInspectWaybill={handleTrackWaybill}
          />
        </Suspense>

        <Suspense
          fallback={
            <SectionLoadingSkeleton label="Loading Global Port Intelligence..." />
          }
        >
          <PortIntelligenceSection
            t={t}
            lang={lang}
            onFocusCorridor={handleFocusCorridorFromPorts}
          />
        </Suspense>
      </main>

      <Footer t={t} />

      {activePrintWaybill && blModalWaybill && (
        <Suspense fallback={null}>
          <TradeDocStudio
            t={t}
            lang={lang}
            currency={currency}
            printWaybill={activePrintWaybill}
            modalWaybill={blModalWaybill}
            docTab={docTab}
            setDocTab={setDocTab}
            packingSkus={packingSkus}
            packingContainer={CONTAINER_SPECS[containerType]}
            customsResult={liveCustomsResult}
            onCloseModal={() => setBlModalWaybill(null)}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
