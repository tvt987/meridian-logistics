import { useEffect, useMemo, useState } from 'react';
import { BillOfLadingPrint } from './components/BillOfLadingPrint';
import { ContainerStuffingOptimizer } from './components/ContainerStuffingOptimizer';
import { ControlTowerHero } from './components/ControlTowerHero';
import { CustomsDutyCalculator } from './components/CustomsDutyCalculator';
import { ExceptionControlTower } from './components/ExceptionControlTower';
import { Footer } from './components/Footer';
import { FreightQuoteEngine } from './components/FreightQuoteEngine';
import { Navbar } from './components/Navbar';
import { PortIntelligenceSection } from './components/PortIntelligenceSection';
import { WaybillTrackerSection } from './components/WaybillTrackerSection';
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
  ExceptionAlert,
  FreightQuoteInput,
  Lang,
  PrintDocTab,
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

  // v2.0 Container Load & Carton Stuffing Optimizer State
  const [containerType, setContainerType] = useState<ContainerTypeId>(
    STUFFING_PRESETS[0].containerType,
  );
  const [packingSkus, setPackingSkus] = useState<CargoSkuItem[]>(() =>
    STUFFING_PRESETS[0].skus.map((s) => ({ ...s })),
  );

  // v2.0 Vietnam HS Code & FTA Customs Duty State
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
    const avgCbmPerPkg = payload.totalVolumeCbm / Math.max(1, payload.totalCartons);
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
          selectedCorridorId={selectedCorridorId}
          openAlertsCount={alertCounts.totalActive}
          criticalAlertsCount={alertCounts.critical}
          onSelectCorridor={setSelectedCorridorId}
          onLoadCorridorToQuote={handleLoadCorridorToQuote}
        />

        <ContainerStuffingOptimizer
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

        <ExceptionControlTower
          t={t}
          lang={lang}
          alerts={alerts}
          onUpdateStatus={handleUpdateAlertStatus}
          onSimulateAlert={handleSimulateAlert}
          onInspectWaybill={handleTrackWaybill}
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
          docTab={docTab}
          setDocTab={setDocTab}
          packingSkus={packingSkus}
          packingContainer={CONTAINER_SPECS[containerType]}
          customsResult={liveCustomsResult}
          onCloseModal={() => setBlModalWaybill(null)}
        />
      )}
    </div>
  );
}

export default App;
