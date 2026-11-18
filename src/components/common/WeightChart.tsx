import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { DiaryEvent } from '../../types/models';
import { formatDisplayDate, formatNumber, formatShortDate } from '../../utils/formatters';

interface WeightPoint {
  event: DiaryEvent;
  kgValue: number;
  displayLabel: string;
}

type YAxisScaleMode = 'auto' | 'zero' | 'custom';

export function DiagramSection({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAccordionOpen, setIsAccordionOpen] = useState(true);

  return (
    <section className="surface-card overflow-hidden" aria-label="Diagram">
      {/* Accordion-rubrik */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-[var(--border-hairline)]">
        <button
          type="button"
          onClick={() => setIsAccordionOpen((o) => !o)}
          aria-expanded={isAccordionOpen}
          className="flex-1 min-h-[44px] flex items-center justify-between gap-3 text-left"
        >
          <span className="text-base font-semibold text-[var(--text-primary)]">Diagram</span>
          <span className="text-[var(--text-muted)] shrink-0">
            {isAccordionOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </span>
        </button>
      </div>

      {isAccordionOpen && (
        <div className="divide-y divide-[var(--border-hairline)]">{children}</div>
      )}
    </section>
  );
}

export function WeightChart({
  events,
  title,
  showTrendline,
  onTitleChange,
  onToggleTrendline,
}: {
  events: DiaryEvent[];
  title: string;
  showTrendline: boolean;
  onTitleChange: (nextTitle: string) => void;
  onToggleTrendline: (show: boolean) => void;
}) {
  const [isEditingDiagram, setIsEditingDiagram] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const [scaleMode, setScaleMode] = useState<YAxisScaleMode>('auto');
  const [customMinInput, setCustomMinInput] = useState('0');
  const [customMaxInput, setCustomMaxInput] = useState('6');

  const points: WeightPoint[] = useMemo(() => {
    const parsed: WeightPoint[] = [];
    for (const ev of events) {
      const rawVal = Number(ev.fieldValues.weightValue);
      if (!Number.isFinite(rawVal) || rawVal <= 0) continue;
      const unit = ev.fieldValues.weightUnit === 'g' ? 'g' : 'kg';
      const kgValue = unit === 'g' ? rawVal / 1000 : rawVal;
      parsed.push({
        event: ev,
        kgValue,
        displayLabel: `${formatNumber(rawVal)} ${unit}`,
      });
    }
    return parsed.sort((a, b) => a.event.date.localeCompare(b.event.date));
  }, [events]);

  const commitTitle = () => {
    const trimmed = draftTitle.trim() || 'Viktkurva';
    setDraftTitle(trimmed);
    if (trimmed !== title) {
      onTitleChange(trimmed);
    }
  };

  const toggleDiagramEdit = () => {
    if (isEditingDiagram) {
      commitTitle();
      setIsEditingDiagram(false);
    } else {
      setDraftTitle(title);
      setIsEditingDiagram(true);
    }
  };

  const width = 600;
  const height = 310;
  const padLeft = 48;
  const padRight = 20;
  const padTop = 24;
  const padBottom = 38;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const weights = points.map((p) => p.kgValue);
  const rawMin = weights.length ? Math.min(...weights) : 0;
  const rawMax = weights.length ? Math.max(...weights) : 5;
  const span = Math.max(0.2, rawMax - rawMin);

  let minY = Math.max(0, rawMin - span * 0.18);
  let maxY = rawMax + span * 0.18;

  if (scaleMode === 'zero') {
    minY = 0;
    maxY = Math.max(0.5, rawMax * 1.12);
  } else if (scaleMode === 'custom') {
    const cMin = Number(customMinInput);
    const cMax = Number(customMaxInput);
    if (Number.isFinite(cMin) && Number.isFinite(cMax) && cMax > cMin) {
      minY = cMin;
      maxY = cMax;
    }
  }

  const coords = points.map((p, idx) => {
    const x =
      points.length === 1
        ? padLeft + plotW / 2
        : padLeft + (idx / (points.length - 1)) * plotW;
    const clampedKg = Math.max(minY, Math.min(maxY, p.kgValue));
    const y = padTop + ((maxY - clampedKg) / (maxY - minY || 1)) * plotH;
    return { ...p, x, y };
  });

  const linePath = coords
    .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    coords.length > 1
      ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(padTop + plotH).toFixed(1)} Z`
      : '';

  const yTicks = [0, 0.5, 1].map((t) => {
    const val = maxY - t * (maxY - minY);
    const y = padTop + t * plotH;
    return { val, y };
  });

  const xLabelIndices =
    coords.length <= 3
      ? coords.map((_, i) => i)
      : [0, Math.floor((coords.length - 1) / 2), coords.length - 1];

  const latestPoint = points[points.length - 1] ?? null;
  const hoveredCoord = hoveredId ? coords.find((c) => c.event.id === hoveredId) ?? null : null;

  let trendlineCoords: { x1: number; y1: number; x2: number; y2: number } | null = null;
  if (showTrendline && coords.length >= 2) {
    const n = coords.length;
    const sumX = coords.reduce((acc, c) => acc + c.x, 0);
    const sumY = coords.reduce((acc, c) => acc + c.y, 0);
    const meanX = sumX / n;
    const meanY = sumY / n;
    let num = 0;
    let den = 0;
    for (const c of coords) {
      const dx = c.x - meanX;
      num += dx * (c.y - meanY);
      den += dx * dx;
    }
    const slope = den > 0 ? num / den : 0;
    const intercept = meanY - slope * meanX;
    const xStart = coords[0].x;
    const xEnd = coords[coords.length - 1].x;
    const clampY = (yVal: number) => Math.max(padTop, Math.min(padTop + plotH, yVal));
    trendlineCoords = {
      x1: xStart,
      y1: clampY(slope * xStart + intercept),
      x2: xEnd,
      y2: clampY(slope * xEnd + intercept),
    };
  }

  return (
    <div className="p-4 space-y-3">
      {points.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          Inga viktposter i det valda filtret ännu. Lägg till en viktpost för att se viktdiagrammet.
        </p>
      ) : (
        <>
          {/* Diagramrubrik + senaste vikt & datum + penna */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 min-w-0">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                {title}
              </h3>
              {latestPoint && (
                <span className="text-xs font-medium text-[var(--text-muted)] tabular-nums whitespace-nowrap">
                  {latestPoint.displayLabel} · {formatDisplayDate(latestPoint.event.date)}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={toggleDiagramEdit}
              aria-expanded={isEditingDiagram}
              aria-label={isEditingDiagram ? 'Spara diagraminställningar' : 'Redigera diagram'}
              title={isEditingDiagram ? 'Klar' : 'Redigera diagram'}
              className={`min-w-[40px] min-h-[40px] w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                isEditingDiagram
                  ? 'bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)]'
                  : 'hover:bg-[var(--bg-surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {isEditingDiagram ? <Check size={16} /> : <Pencil size={15} />}
            </button>
          </div>

          {isEditingDiagram && (
            <div className="p-3.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-hairline)] space-y-3">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  Diagramrubrik
                </span>
                <input
                  type="text"
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onBlur={commitTitle}
                  className="field-input w-full px-3 py-1.5 text-sm font-semibold"
                />
              </label>

              <div className="space-y-2">
                <span className="text-xs font-medium text-[var(--text-secondary)] block">
                  Skala på y-axeln
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {(
                    [
                      { key: 'auto', label: 'Auto' },
                      { key: 'zero', label: 'Från 0 kg' },
                      { key: 'custom', label: 'Egen skala' },
                    ] as { key: YAxisScaleMode; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setScaleMode(opt.key)}
                      className={`btn-pill min-h-[38px] px-3.5 py-1.5 text-xs font-semibold border ${
                        scaleMode === opt.key
                          ? 'bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)] border-transparent'
                          : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-hairline)]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {scaleMode === 'custom' && (
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <label className="space-y-1 text-xs text-[var(--text-secondary)]">
                      <span>Min (kg)</span>
                      <input
                        type="number"
                        step="0.1"
                        value={customMinInput}
                        onChange={(e) => setCustomMinInput(e.target.value)}
                        className="field-input w-full px-3 py-1.5 text-xs"
                      />
                    </label>
                    <label className="space-y-1 text-xs text-[var(--text-secondary)]">
                      <span>Max (kg)</span>
                      <input
                        type="number"
                        step="0.1"
                        value={customMaxInput}
                        onChange={(e) => setCustomMaxInput(e.target.value)}
                        className="field-input w-full px-3 py-1.5 text-xs"
                      />
                    </label>
                  </div>
                )}
              </div>

              <label className="flex items-center justify-between gap-3 min-h-[40px] cursor-pointer pt-1">
                <span className="text-xs font-medium text-[var(--text-secondary)]">
                  Visa trendlinje
                </span>
                <input
                  type="checkbox"
                  checked={showTrendline}
                  onChange={(e) => onToggleTrendline(e.target.checked)}
                  className="w-5 h-5 accent-[var(--accent-primary)] cursor-pointer"
                />
              </label>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={toggleDiagramEdit}
                  className="btn-pill px-4 py-1.5 text-xs font-semibold bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)]"
                >
                  Klar
                </button>
              </div>
            </div>
          )}

          <div className="relative w-full">
            {hoveredCoord && (
              <div
                role="status"
                className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full px-2.5 py-1 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-strong)] shadow-md text-[11px] font-semibold text-[var(--text-primary)] whitespace-nowrap tabular-nums"
                style={{
                  left: `${(hoveredCoord.x / width) * 100}%`,
                  top: `calc(${(hoveredCoord.y / height) * 100}% - 10px)`,
                }}
              >
                {hoveredCoord.displayLabel} · {formatDisplayDate(hoveredCoord.event.date)}
              </div>
            )}
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto select-none"
              role="img"
              aria-label={`${title}, linjediagram med ${points.length} viktposter`}
            >
              <defs>
                <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.28" />
                  <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {yTicks.map((tick, idx) => (
                <g key={idx}>
                  <line
                    x1={padLeft}
                    y1={tick.y}
                    x2={width - padRight}
                    y2={tick.y}
                    stroke="var(--border-hairline)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padLeft - 8}
                    y={tick.y + 4}
                    textAnchor="end"
                    fill="var(--text-muted)"
                    fontSize="11.5"
                    fontFamily="var(--font-mono)"
                  >
                    {formatNumber(tick.val, 2)}
                  </text>
                </g>
              ))}

              {xLabelIndices.map((idx) => {
                const c = coords[idx];
                if (!c) return null;
                return (
                  <text
                    key={c.event.id}
                    x={c.x}
                    y={height - 10}
                    textAnchor={
                      idx === 0 ? 'start' : idx === coords.length - 1 ? 'end' : 'middle'
                    }
                    fill="var(--text-muted)"
                    fontSize="11.5"
                  >
                    {formatShortDate(c.event.date)}
                  </text>
                );
              })}

              {areaPath && <path d={areaPath} fill="url(#weightAreaGrad)" />}

              {coords.length > 1 && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="var(--accent-primary)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {trendlineCoords && (
                <line
                  x1={trendlineCoords.x1.toFixed(1)}
                  y1={trendlineCoords.y1.toFixed(1)}
                  x2={trendlineCoords.x2.toFixed(1)}
                  y2={trendlineCoords.y2.toFixed(1)}
                  stroke="var(--status-success)"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  opacity="0.9"
                />
              )}

              {coords.map((c) => {
                const isHovered = hoveredId === c.event.id;
                return (
                  <g
                    key={c.event.id}
                    onMouseEnter={() => setHoveredId(c.event.id)}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <circle cx={c.x} cy={c.y} r="14" fill="transparent" />
                    <circle
                      cx={c.x}
                      cy={c.y}
                      r={isHovered ? 6 : 4.2}
                      fill="var(--bg-surface)"
                      stroke="var(--accent-primary)"
                      strokeWidth={isHovered ? 3 : 2.4}
                    />
                  </g>
                );
              })}
            </svg>
          </div>
        </>
      )}
    </div>
  );
}
