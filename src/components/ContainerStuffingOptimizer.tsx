import { useMemo, useState } from 'react';
import type { I18nDict } from '../data/i18n';
import {
  CONTAINER_LIST,
  optimizeContainerLoad,
  SKU_PALETTE,
  STUFFING_PRESETS,
} from '../engines/containerPackingEngine';
import type {
  CargoSkuItem,
  ContainerSpec,
  ContainerTypeId,
  Lang,
  PlacedCartonBox,
} from '../types/logistics';
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  BoxCubeIcon,
  LayersIcon,
  PlusIcon,
  PrinterIcon,
  TrashIcon,
} from './Icons';

interface ContainerStuffingOptimizerProps {
  t: I18nDict;
  lang: Lang;
  containerType: ContainerTypeId;
  setContainerType: (type: ContainerTypeId) => void;
  skus: CargoSkuItem[];
  setSkus: React.Dispatch<React.SetStateAction<CargoSkuItem[]>>;
  onSendLoadToQuote: (payload: {
    container: ContainerSpec;
    totalWeightKg: number;
    totalVolumeCbm: number;
    totalCartons: number;
    containersRequired: number;
  }) => void;
  onOpenPackingListPrint: () => void;
}

type BayViewMode = 'iso' | 'side' | 'top';

function shadeHex(hex: string, factor: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(0, 2), 16) * factor)));
  const g = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(2, 4), 16) * factor)));
  const b = Math.min(255, Math.max(0, Math.round(parseInt(clean.slice(4, 6), 16) * factor)));
  return `rgb(${r}, ${g}, ${b})`;
}

function IsoCargoBaySvg({
  container,
  boxes,
  highlightedSkuId,
  cogPct,
  onHoverSku,
}: {
  container: ContainerSpec;
  boxes: PlacedCartonBox[];
  highlightedSkuId: string | null;
  cogPct: number;
  onHoverSku: (skuId: string | null) => void;
}) {
  const L = container.innerLengthCm;
  const W = container.innerWidthCm;
  const H = container.innerHeightCm;

  // Isometric basis vectors
  const ux = 0.89;
  const uy = 0.33;
  const vx = -0.78;
  const vy = 0.44;
  const zy = -1.0;

  const rawMinX = W * vx;
  const rawMaxX = L * ux;
  const rawMinY = H * zy;
  const rawMaxY = L * uy + W * vy;

  const rawW = rawMaxX - rawMinX;
  const rawH = rawMaxY - rawMinY;

  const vw = 760;
  const vh = 340;
  const padX = 52;
  const padY = 38;
  const scale = Math.min((vw - 2 * padX) / rawW, (vh - 2 * padY) / rawH);
  const offsetX = (vw - rawW * scale) / 2 - rawMinX * scale;
  const offsetY = (vh - rawH * scale) / 2 - rawMinY * scale;

  const p = (x: number, y: number, z: number): [number, number] => [
    offsetX + (x * ux + y * vx) * scale,
    offsetY + (x * uy + y * vy + z * zy) * scale,
  ];

  const pts = (coords: [number, number][]) =>
    coords.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' ');

  // Back-to-front deterministic sort guaranteed overlap-free for bay-column packing
  const sortedBoxes = useMemo(() => {
    return [...boxes]
      .sort((a, b) =>
        a.x !== b.x ? a.x - b.x : a.y !== b.y ? a.y - b.y : a.z - b.z,
      )
      .slice(0, 420);
  }, [boxes]);

  // 8 container corners
  const c000 = p(0, 0, 0);
  const cL00 = p(L, 0, 0);
  const cLW0 = p(L, W, 0);
  const c0W0 = p(0, W, 0);
  const c00H = p(0, 0, H);
  const cL0H = p(L, 0, H);
  const cLWH = p(L, W, H);
  const c0WH = p(0, W, H);

  const cogX = (cogPct / 100) * L;
  const cogStart = p(cogX, W, 0);
  const cogEnd = p(cogX, W + 24, 0);

  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      className="block h-auto w-full select-none"
      role="img"
      aria-label={`Isometric 3D cargo bay diagram for ${container.nameEn}`}
      data-testid="container-iso-svg"
    >
      {/* Subtle floor plane */}
      <polygon
        points={pts([c000, cL00, cLW0, c0W0])}
        fill="var(--bg-subtle)"
        fillOpacity="0.65"
        stroke="var(--border-strong)"
        strokeWidth="1.2"
      />

      {/* Floor length bay grid lines */}
      {[0.2, 0.4, 0.6, 0.8].map((frac) => {
        const g1 = p(L * frac, 0, 0);
        const g2 = p(L * frac, W, 0);
        return (
          <line
            key={frac}
            x1={g1[0]}
            y1={g1[1]}
            x2={g2[0]}
            y2={g2[1]}
            stroke="var(--grid-line)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        );
      })}

      {/* Rear walls (x=0 nose wall and y=0 far wall) */}
      <polygon
        points={pts([c000, c0W0, c0WH, c00H])}
        fill="var(--bg-elevated)"
        fillOpacity="0.55"
        stroke="var(--border-strong)"
        strokeWidth="1.2"
      />
      <polygon
        points={pts([c000, cL00, cL0H, c00H])}
        fill="var(--bg-elevated)"
        fillOpacity="0.38"
        stroke="var(--border-strong)"
        strokeWidth="1.2"
      />

      {/* Reefer Cooling Bulkhead Accent */}
      {container.isReefer && (
        <polygon
          points={pts([p(0, 12, 16), p(0, W - 12, 16), p(0, W - 12, H - 16), p(0, 12, H - 16)])}
          fill="#06b6d4"
          fillOpacity="0.16"
          stroke="#06b6d4"
          strokeWidth="1.1"
          strokeDasharray="4 2"
        />
      )}

      {/* Placed 3D Cartons */}
      <g>
        {sortedBoxes.map((box) => {
          const dimmed =
            highlightedSkuId !== null && highlightedSkuId !== box.skuId;
          const topFace = pts([
            p(box.x, box.y, box.z + box.h),
            p(box.x + box.l, box.y, box.z + box.h),
            p(box.x + box.l, box.y + box.w, box.z + box.h),
            p(box.x, box.y + box.w, box.z + box.h),
          ]);
          const sideFace = pts([
            p(box.x, box.y + box.w, box.z),
            p(box.x + box.l, box.y + box.w, box.z),
            p(box.x + box.l, box.y + box.w, box.z + box.h),
            p(box.x, box.y + box.w, box.z + box.h),
          ]);
          const endFace = pts([
            p(box.x + box.l, box.y, box.z),
            p(box.x + box.l, box.y + box.w, box.z),
            p(box.x + box.l, box.y + box.w, box.z + box.h),
            p(box.x + box.l, box.y, box.z + box.h),
          ]);

          return (
            <g
              key={box.id}
              opacity={dimmed ? 0.22 : 0.96}
              onMouseEnter={() => onHoverSku(box.skuId)}
              onMouseLeave={() => onHoverSku(null)}
              className="cursor-pointer transition-opacity"
            >
              <polygon
                points={sideFace}
                fill={shadeHex(box.color, 0.8)}
                stroke="rgba(8,12,18,0.65)"
                strokeWidth="0.7"
              />
              <polygon
                points={endFace}
                fill={shadeHex(box.color, 0.62)}
                stroke="rgba(8,12,18,0.65)"
                strokeWidth="0.7"
              />
              <polygon
                points={topFace}
                fill={shadeHex(box.color, 1.05)}
                stroke="rgba(8,12,18,0.55)"
                strokeWidth="0.7"
              />
              {!box.stackable && (
                <line
                  x1={p(box.x + 6, box.y + 6, box.z + box.h)[0]}
                  y1={p(box.x + 6, box.y + 6, box.z + box.h)[1]}
                  x2={p(box.x + box.l - 6, box.y + box.w - 6, box.z + box.h)[0]}
                  y2={p(box.x + box.l - 6, box.y + box.w - 6, box.z + box.h)[1]}
                  stroke="#ffffff"
                  strokeOpacity="0.6"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                />
              )}
            </g>
          );
        })}
      </g>

      {/* Container Front Cutaway Structural Frame */}
      <g
        fill="none"
        stroke={container.isReefer ? '#06b6d4' : '#0ea5e9'}
        strokeWidth="1.4"
        strokeOpacity="0.75"
      >
        <polyline points={pts([c0W0, cLW0, cL00])} />
        <polyline points={pts([c00H, c0WH, cLWH, cL0H, c00H])} strokeDasharray="5 4" />
        <line x1={c0W0[0]} y1={c0W0[1]} x2={c0WH[0]} y2={c0WH[1]} strokeDasharray="5 4" />
        <line x1={cLW0[0]} y1={cLW0[1]} x2={cLWH[0]} y2={cLWH[1]} />
        <line x1={cL00[0]} y1={cL00[1]} x2={cL0H[0]} y2={cL0H[1]} />
      </g>

      {/* Center of Gravity (CoG) Indicator */}
      {boxes.length > 0 && (
        <g>
          <line
            x1={cogStart[0]}
            y1={cogStart[1]}
            x2={cogEnd[0]}
            y2={cogEnd[1]}
            stroke="#f59e0b"
            strokeWidth="2"
          />
          <circle cx={cogEnd[0]} cy={cogEnd[1]} r="4" fill="#f59e0b" />
          <text
            x={cogEnd[0] - 6}
            y={cogEnd[1] + 14}
            fill="#f59e0b"
            fontSize="10"
            fontWeight="700"
            textAnchor="end"
            fontFamily="JetBrains Mono, monospace"
          >
            CoG {cogPct}%
          </text>
        </g>
      )}

      {/* Dimension Blueprint Callouts */}
      <g
        fill="var(--text-muted)"
        fontSize="10"
        fontFamily="JetBrains Mono, monospace"
        fontWeight="600"
      >
        <text x={c00H[0] - 8} y={c00H[1] - 8} textAnchor="end">
          H {H} cm
        </text>
        <text x={(c0W0[0] + cLW0[0]) / 2} y={(c0W0[1] + cLW0[1]) / 2 + 22} textAnchor="middle">
          L {L} cm ({container.code})
        </text>
        <text x={cL0H[0] + 10} y={cL0H[1] + 4} textAnchor="start" fill="var(--accent-cyan)">
          DOOR W {W} cm
        </text>
      </g>
    </svg>
  );
}

function OrthographicBaySvg({
  mode,
  container,
  boxes,
  highlightedSkuId,
  cogPct,
  onHoverSku,
}: {
  mode: 'side' | 'top';
  container: ContainerSpec;
  boxes: PlacedCartonBox[];
  highlightedSkuId: string | null;
  cogPct: number;
  onHoverSku: (skuId: string | null) => void;
}) {
  const L = container.innerLengthCm;
  const secondary = mode === 'side' ? container.innerHeightCm : container.innerWidthCm;

  const vw = 760;
  const vh = 280;
  const padL = 56;
  const padR = 28;
  const padT = 30;
  const padB = 42;

  const scale = Math.min((vw - padL - padR) / L, (vh - padT - padB) / secondary);
  const drawW = L * scale;
  const drawH = secondary * scale;
  const ox = (vw - drawW) / 2;
  const oy = (vh - drawH) / 2;

  const visibleBoxes = useMemo(() => boxes.slice(0, 420), [boxes]);

  return (
    <svg
      viewBox={`0 0 ${vw} ${vh}`}
      className="block h-auto w-full select-none"
      role="img"
      aria-label={
        mode === 'side'
          ? `Side elevation blueprint for ${container.nameEn}`
          : `Top-down floor plan for ${container.nameEn}`
      }
    >
      {/* Container Interior Shell */}
      <rect
        x={ox}
        y={oy}
        width={drawW}
        height={drawH}
        fill="var(--bg-subtle)"
        fillOpacity="0.5"
        stroke="var(--accent-cyan)"
        strokeWidth="1.6"
        rx="2"
      />

      {/* Grid Ticks */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={ox + drawW * f}
          y1={oy}
          x2={ox + drawW * f}
          y2={oy + drawH}
          stroke="var(--grid-line)"
          strokeDasharray="3 3"
        />
      ))}

      {/* Cartons */}
      {visibleBoxes.map((box) => {
        const dimmed = highlightedSkuId !== null && highlightedSkuId !== box.skuId;
        const rx = ox + box.x * scale;
        const rw = Math.max(2, box.l * scale);
        const ry =
          mode === 'side'
            ? oy + drawH - (box.z + box.h) * scale
            : oy + box.y * scale;
        const rh = Math.max(2, (mode === 'side' ? box.h : box.w) * scale);

        return (
          <rect
            key={box.id}
            x={rx + 0.5}
            y={ry + 0.5}
            width={Math.max(1, rw - 1)}
            height={Math.max(1, rh - 1)}
            fill={box.color}
            fillOpacity={dimmed ? 0.18 : 0.85}
            stroke="rgba(8,12,18,0.65)"
            strokeWidth="0.7"
            onMouseEnter={() => onHoverSku(box.skuId)}
            onMouseLeave={() => onHoverSku(null)}
            className="cursor-pointer"
          />
        );
      })}

      {/* Center of Gravity Datum */}
      {boxes.length > 0 && (
        <g>
          <line
            x1={ox + (cogPct / 100) * drawW}
            y1={oy - 10}
            x2={ox + (cogPct / 100) * drawW}
            y2={oy + drawH + 10}
            stroke="#f59e0b"
            strokeWidth="1.8"
            strokeDasharray="4 3"
          />
          <text
            x={ox + (cogPct / 100) * drawW}
            y={oy - 14}
            fill="#f59e0b"
            fontSize="10"
            fontWeight="700"
            textAnchor="middle"
            fontFamily="JetBrains Mono, monospace"
          >
            CoG {cogPct}%
          </text>
        </g>
      )}

      {/* Axis Labels */}
      <g
        fill="var(--text-muted)"
        fontSize="10"
        fontFamily="JetBrains Mono, monospace"
      >
        <text x={ox + drawW / 2} y={oy + drawH + 26} textAnchor="middle">
          LENGTH {L} cm (NOSE → REAR DOOR)
        </text>
        <text
          x={ox - 12}
          y={oy + drawH / 2}
          textAnchor="middle"
          transform={`rotate(-90, ${ox - 12}, ${oy + drawH / 2})`}
        >
          {mode === 'side' ? `HEIGHT ${secondary} cm` : `WIDTH ${secondary} cm`}
        </text>
      </g>
    </svg>
  );
}

export function ContainerStuffingOptimizer({
  t,
  lang,
  containerType,
  setContainerType,
  skus,
  setSkus,
  onSendLoadToQuote,
  onOpenPackingListPrint,
}: ContainerStuffingOptimizerProps) {
  const [viewMode, setViewMode] = useState<BayViewMode>('iso');
  const [activeBayIdx, setActiveBayIdx] = useState(0);
  const [highlightedSkuId, setHighlightedSkuId] = useState<string | null>(null);

  const result = useMemo(
    () => optimizeContainerLoad(containerType, skus),
    [containerType, skus],
  );

  const safeBayIdx = Math.min(activeBayIdx, Math.max(0, result.containers.length - 1));
  const currentBay = result.containers[safeBayIdx] ?? result.containers[0];

  const handleApplyPreset = (presetId: string) => {
    const preset = STUFFING_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setContainerType(preset.containerType);
    setSkus(preset.skus.map((s) => ({ ...s })));
    setActiveBayIdx(0);
  };

  const handleAddSku = () => {
    const nextIdx = skus.length + 1;
    const color = SKU_PALETTE[skus.length % SKU_PALETTE.length];
    setSkus((prev) => [
      ...prev,
      {
        id: `sku-${Date.now()}-${nextIdx}`,
        skuCode: `SKU-0${nextIdx}`,
        name: lang === 'vi' ? `Thùng hàng mới #${nextIdx}` : `Custom Export Carton #${nextIdx}`,
        lengthCm: 80,
        widthCm: 60,
        heightCm: 60,
        weightKg: 45,
        qty: 16,
        stackable: true,
        color,
      },
    ]);
  };

  const handleUpdateSku = <K extends keyof CargoSkuItem>(
    id: string,
    field: K,
    value: CargoSkuItem[K],
  ) => {
    setSkus((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)),
    );
  };

  const handleRemoveSku = (id: string) => {
    setSkus((prev) => (prev.length > 1 ? prev.filter((item) => item.id !== id) : prev));
  };

  const limitLabel =
    result.limitingFactor === 'payload'
      ? t.packerLimitPayload
      : result.limitingFactor === 'dimensions'
        ? t.packerLimitDimensions
        : t.packerLimitVolume;

  const balanceLabel =
    result.balanceStatus === 'nose-heavy'
      ? t.packerBalanceNose
      : result.balanceStatus === 'tail-heavy'
        ? t.packerBalanceTail
        : t.packerBalanceBalanced;

  return (
    <section
      id="container-optimizer"
      className="no-print border-b border-[var(--border)] bg-[var(--bg-elevated)]/35 py-12 lg:py-16"
    >
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        {/* Section Header + Presets */}
        <div className="mb-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="text-xs font-bold tracking-[0.12em] text-[var(--accent-cyan)]">
              {t.packerEyebrow}
            </div>
            <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight text-[var(--text)] sm:text-3xl">
              {t.packerTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
              {t.packerSubtitle}
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="font-mono-tech text-[10px] font-semibold uppercase tracking-wider text-[var(--text-dim)]">
              {t.packerPresetsLabel}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {STUFFING_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset.id)}
                  data-testid={`stuffing-preset-${preset.id}`}
                  className="cursor-pointer rounded-md border border-[var(--border)] bg-[var(--bg-panel)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-muted)] transition-colors hover:border-[var(--accent-cyan)] hover:text-[var(--text)]"
                >
                  {lang === 'vi' ? preset.labelVi : preset.labelEn}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Container Selector Row */}
        <div className="mb-5">
          <div className="font-mono-tech mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            {t.packerContainerLabel}
          </div>
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {CONTAINER_LIST.map((spec) => {
              const selected = spec.id === containerType;
              return (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => {
                    setContainerType(spec.id);
                    setActiveBayIdx(0);
                  }}
                  data-testid={`container-spec-${spec.id}`}
                  className={`cursor-pointer rounded-xl border p-3.5 text-left transition-all ${
                    selected
                      ? spec.isReefer
                        ? 'border-[#06b6d4] bg-[#06b6d4]/10 shadow-md'
                        : 'border-[var(--accent-cyan)] bg-[var(--accent-cyan-soft)] shadow-md'
                      : 'border-[var(--border)] bg-[var(--bg-panel)] hover:border-[var(--border-strong)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono-tech text-xs font-bold text-[var(--accent-cyan)]">
                      {spec.code}
                    </span>
                    <span className="font-mono-tech rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                      {spec.internalVolumeCbm} CBM
                    </span>
                  </div>
                  <div className="mt-1 text-sm font-bold text-[var(--text)]">
                    {lang === 'vi' ? spec.nameVi : spec.nameEn}
                  </div>
                  <div className="font-mono-tech mt-1 text-[11px] text-[var(--text-muted)]">
                    {spec.innerLengthCm}×{spec.innerWidthCm}×{spec.innerHeightCm} cm ·{' '}
                    {(spec.maxPayloadKg / 1000).toFixed(1)}t
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main 12-Col Optimizer Split */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left 5 Cols: Multi-SKU Carton Manifest Editor */}
          <div className="panel-card flex flex-col rounded-xl p-4 sm:p-5 lg:col-span-5">
            <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-3">
              <div className="flex items-center gap-2">
                <BoxCubeIcon className="h-4 w-4 text-[var(--accent-cyan)]" />
                <h3 className="text-sm font-bold text-[var(--text)]">
                  {t.packerSkuListTitle} ({skus.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={handleAddSku}
                data-testid="add-sku-btn"
                className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-[var(--accent-cyan)] px-2.5 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                <span>{t.packerAddSkuBtn}</span>
              </button>
            </div>

            <div className="mt-3.5 space-y-3">
              {skus.map((sku, idx) => {
                const summary = result.skuBreakdown.find((s) => s.skuId === sku.id);
                return (
                  <div
                    key={sku.id}
                    onMouseEnter={() => setHighlightedSkuId(sku.id)}
                    onMouseLeave={() => setHighlightedSkuId(null)}
                    className={`rounded-lg border p-3 transition-colors ${
                      highlightedSkuId === sku.id
                        ? 'border-[var(--accent-cyan)] bg-[var(--bg-elevated)]'
                        : 'border-[var(--border)] bg-[var(--bg-elevated)]/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span
                          className="h-3.5 w-3.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: sku.color }}
                        />
                        <input
                          type="text"
                          value={sku.name}
                          aria-label={`${t.packerSkuName} ${idx + 1}`}
                          onChange={(e) => handleUpdateSku(sku.id, 'name', e.target.value)}
                          className="w-full min-w-0 rounded border border-transparent bg-transparent px-1 py-0.5 text-xs font-bold text-[var(--text)] focus:border-[var(--accent-cyan)] focus:bg-[var(--bg-panel)] focus:outline-none"
                        />
                      </div>

                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateSku(sku.id, 'stackable', !sku.stackable)
                          }
                          data-testid={`toggle-stackable-${idx}`}
                          className={`inline-flex cursor-pointer items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                            sku.stackable
                              ? 'bg-[var(--accent-emerald-soft)] text-[var(--accent-emerald)]'
                              : 'bg-[var(--accent-amber-soft)] text-[var(--accent-amber)]'
                          }`}
                        >
                          <LayersIcon className="h-3 w-3" />
                          <span>
                            {sku.stackable ? t.packerStackable : t.packerNonStackable}
                          </span>
                        </button>
                        {skus.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSku(sku.id)}
                            aria-label={`Remove ${sku.name}`}
                            className="cursor-pointer rounded p-1 text-[var(--text-dim)] hover:text-[var(--accent-rose)]"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 grid grid-cols-5 gap-1.5">
                      {(
                        [
                          { field: 'lengthCm', label: 'L (cm)', min: 5 },
                          { field: 'widthCm', label: 'W (cm)', min: 5 },
                          { field: 'heightCm', label: 'H (cm)', min: 5 },
                          { field: 'weightKg', label: 'Kg', min: 1 },
                          { field: 'qty', label: 'Qty', min: 1 },
                        ] as const
                      ).map((col) => (
                        <div key={col.field}>
                          <label className="block text-[10px] text-[var(--text-dim)]">
                            {col.label}
                          </label>
                          <input
                            type="number"
                            min={col.min}
                            value={sku[col.field]}
                            data-testid={`sku-${idx}-${col.field}`}
                            onChange={(e) => {
                              const n = Number(e.target.value);
                              handleUpdateSku(
                                sku.id,
                                col.field,
                                Number.isFinite(n) ? Math.max(0, n) : 0,
                              );
                            }}
                            className="font-mono-tech mt-0.5 w-full rounded border border-[var(--border-strong)] bg-[var(--bg-panel)] px-1.5 py-1 text-xs font-semibold text-[var(--text)] focus:border-[var(--accent-cyan)] focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>

                    {summary && (
                      <div className="font-mono-tech mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-2 text-[10px] text-[var(--text-muted)]">
                        <span>
                          {t.packerMaxSingle}:{' '}
                          <strong className="text-[var(--text)]">
                            {summary.maxPerSingleContainer}
                          </strong>
                        </span>
                        <span>
                          {summary.totalVolumeCbm.toFixed(2)} CBM ·{' '}
                          {summary.totalWeightKg.toLocaleString('en-US')} kg
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 7 Cols: Utilization Metrics + Interactive SVG Bay Visualizer */}
          <div className="space-y-4 lg:col-span-7">
            {/* KPI Metric Strip */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="panel-card rounded-xl p-3.5">
                <div className="text-[11px] text-[var(--text-muted)]">
                  {t.packerContainersNeeded}
                </div>
                <div
                  data-testid="packer-containers-needed"
                  className="font-mono-tech mt-1 text-xl font-extrabold text-[var(--accent-cyan)]"
                >
                  {result.containersRequired} × {result.container.code}
                </div>
                <div className="font-mono-tech mt-0.5 text-[10px] uppercase text-[var(--text-dim)]">
                  {limitLabel}
                </div>
              </div>

              <div className="panel-card rounded-xl p-3.5">
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span>{t.packerVolumeUtil}</span>
                  <span className="font-mono-tech text-[10px]">
                    {result.totalCargoVolumeCbm.toFixed(1)} CBM
                  </span>
                </div>
                <div
                  data-testid="packer-volume-pct"
                  className="font-mono-tech mt-1 text-xl font-extrabold text-[var(--accent-emerald)]"
                >
                  {result.volumeUtilizationPct.toFixed(1)}%
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent-emerald)] transition-all"
                    style={{ width: `${Math.min(100, result.volumeUtilizationPct)}%` }}
                  />
                </div>
              </div>

              <div className="panel-card rounded-xl p-3.5">
                <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
                  <span>{t.packerPayloadUtil}</span>
                  <span className="font-mono-tech text-[10px]">
                    {(result.totalCargoWeightKg / 1000).toFixed(2)}t
                  </span>
                </div>
                <div
                  data-testid="packer-payload-pct"
                  className="font-mono-tech mt-1 text-xl font-extrabold text-[var(--accent-amber)]"
                >
                  {result.payloadUtilizationPct.toFixed(1)}%
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--bg-subtle)]">
                  <div
                    className="h-full rounded-full bg-[var(--accent-amber)] transition-all"
                    style={{ width: `${Math.min(100, result.payloadUtilizationPct)}%` }}
                  />
                </div>
              </div>

              <div className="panel-card rounded-xl p-3.5">
                <div className="text-[11px] text-[var(--text-muted)]">
                  {t.packerBalanceLabel}
                </div>
                <div className="font-mono-tech mt-1 text-xl font-extrabold text-[var(--text)]">
                  {result.centerOfGravityPct}%
                </div>
                <div
                  className={`font-mono-tech mt-0.5 text-[10px] font-bold uppercase ${
                    result.balanceStatus === 'balanced'
                      ? 'text-[var(--accent-emerald)]'
                      : 'text-[var(--accent-amber)]'
                  }`}
                >
                  {balanceLabel}
                </div>
              </div>
            </div>

            {/* Unfit Carton Warning */}
            {result.unfitCartons > 0 && (
              <div className="flex items-center gap-2.5 rounded-xl border border-[var(--accent-rose)]/40 bg-[var(--accent-rose-soft)] px-4 py-3 text-xs font-semibold text-[var(--accent-rose)]">
                <AlertTriangleIcon className="h-4 w-4 shrink-0" />
                <span>
                  {result.unfitCartons} {t.packerUnfitWarning}
                </span>
              </div>
            )}

            {/* SVG Cargo Bay Visualizer Card */}
            <div className="panel-card overflow-hidden rounded-xl">
              {/* Visualizer Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'iso', label: t.packerViewIso },
                      { id: 'side', label: t.packerViewSide },
                      { id: 'top', label: t.packerViewTop },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setViewMode(tab.id)}
                      data-testid={`bay-view-${tab.id}`}
                      className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                        viewMode === tab.id
                          ? 'bg-[var(--accent-cyan)] text-white'
                          : 'border border-[var(--border)] bg-[var(--bg-panel)] text-[var(--text-muted)] hover:text-[var(--text)]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Container Bay Index Switcher if > 1 container */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {result.containers.map((bay) => (
                    <button
                      key={bay.index}
                      type="button"
                      onClick={() => setActiveBayIdx(bay.index)}
                      className={`font-mono-tech cursor-pointer rounded px-2 py-1 text-[11px] font-bold ${
                        safeBayIdx === bay.index
                          ? 'bg-[var(--accent-amber)] text-[#080c12]'
                          : 'border border-[var(--border)] bg-[var(--bg-panel)] text-[var(--text-muted)]'
                      }`}
                    >
                      #{bay.index + 1} ({bay.volumeUtilizationPct}%)
                    </button>
                  ))}
                </div>
              </div>

              {/* SVG Stage */}
              <div className="maritime-grid-bg bg-[var(--bg-map)] p-3">
                {viewMode === 'iso' ? (
                  <IsoCargoBaySvg
                    container={result.container}
                    boxes={currentBay?.placedBoxes ?? []}
                    highlightedSkuId={highlightedSkuId}
                    cogPct={currentBay?.centerOfGravityPct ?? 50}
                    onHoverSku={setHighlightedSkuId}
                  />
                ) : (
                  <OrthographicBaySvg
                    mode={viewMode}
                    container={result.container}
                    boxes={currentBay?.placedBoxes ?? []}
                    highlightedSkuId={highlightedSkuId}
                    cogPct={currentBay?.centerOfGravityPct ?? 50}
                    onHoverSku={setHighlightedSkuId}
                  />
                )}
              </div>

              {/* Color-Coded Legend & Action Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] bg-[var(--bg-elevated)] px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  {result.skuBreakdown.map((item) => (
                    <button
                      key={item.skuId}
                      type="button"
                      onMouseEnter={() => setHighlightedSkuId(item.skuId)}
                      onMouseLeave={() => setHighlightedSkuId(null)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--bg-panel)] px-2 py-1 text-[11px]"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-sm"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-mono-tech font-bold text-[var(--text)]">
                        {item.skuCode}
                      </span>
                      <span className="font-mono-tech text-[var(--text-muted)]">
                        {item.loadedQty} pcs ({item.volumeSharePct}%)
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onOpenPackingListPrint}
                    data-testid="packer-print-packing-list"
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-panel)] px-3 py-1.5 text-xs font-semibold text-[var(--text)] hover:border-[var(--accent-cyan)]"
                  >
                    <PrinterIcon className="h-3.5 w-3.5" />
                    <span>{t.packerPrintPacking}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onSendLoadToQuote({
                        container: result.container,
                        totalWeightKg: result.totalCargoWeightKg,
                        totalVolumeCbm: result.totalCargoVolumeCbm,
                        totalCartons: Math.max(1, result.totalLoadedCartons),
                        containersRequired: Math.max(1, result.containersRequired),
                      })
                    }
                    data-testid="packer-send-to-quote"
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[var(--accent-cyan)] px-3.5 py-1.5 text-xs font-bold text-white hover:opacity-90"
                  >
                    <span>{t.packerSendToQuote}</span>
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
