import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  ChevronDown,
  ChevronUp,
  Filter,
  GripVertical,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Category, DiaryEvent, Pet } from '../../types/models';
import { formatDisplayDate, formatNumber } from '../../utils/formatters';
import { StyledDateInput } from '../common/StyledDateInput';
import { DiagramSection, WeightChart } from '../common/WeightChart';
import { CategoryIcon, TimelineIcon } from '../icons/PetIllustrations';

export function TimelineOverviewView({
  pet,
  highlightEventId,
  onAddEvent,
  onEditEvent,
  onOpenCategoryFilter,
  onOpenTimeFilter,
}: {
  pet: Pet;
  highlightEventId?: string;
  onAddEvent: () => void;
  onEditEvent: (event: DiaryEvent) => void;
  onOpenCategoryFilter: () => void;
  onOpenTimeFilter: () => void;
}) {
  const {
    categories,
    events,
    settings,
    updateSettings,
    savePet,
    saveEvent,
    reorderEvents,
    softDeleteEvent,
    reloadAll,
  } = useApp();

  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());
  const [contextEvent, setContextEvent] = useState<DiaryEvent | null>(null);
  const [moveEvent, setMoveEvent] = useState<DiaryEvent | null>(null);
  const [moveDateValue, setMoveDateValue] = useState('');
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const touchStartYRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressOriginRef = useRef<{ x: number; y: number } | null>(null);
  const suppressNextClickRef = useRef(false);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const categoryMap = useMemo(() => {
    return new Map<string, Category>(categories.map((c) => [c.id, c]));
  }, [categories]);

  // Tidfiltrering + kategorifiltrering sparad per djur
  const timeFilteredEvents = useMemo(() => {
    const petEvents = events.filter(
      (e) => e.petId === pet.id && !e.deletedAt && (!e.archived || !settings.hideArchived)
    );

    const { timePreset, customSingleDate, customStartDate, customEndDate } = pet.filterPrefs;
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
      .toISOString()
      .slice(0, 10);

    return petEvents.filter((ev) => {
      if (timePreset === 'last_year') {
        return ev.date >= oneYearAgo;
      }
      if (timePreset === 'single_date') {
        return customSingleDate ? ev.date === customSingleDate : true;
      }
      if (timePreset === 'custom') {
        if (customStartDate && ev.date < customStartDate) return false;
        if (customEndDate && ev.date > customEndDate) return false;
      }
      return true;
    });
  }, [events, pet.filterPrefs, pet.id, settings.hideArchived]);

  const activeCategoryIds = pet.filterPrefs.enabledCategoryIds ?? [];

  const filteredEvents = useMemo(() => {
    return timeFilteredEvents
      .filter((ev) => {
        if (activeCategoryIds.length === 0) return true;
        return activeCategoryIds.includes(ev.categoryId);
      })
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [activeCategoryIds, timeFilteredEvents]);

  // Antal poster per kategori inom aktiv tidslinje (för badge under ikonerna)
  const countByCategoryInTimeWindow = useMemo(() => {
    const map = new Map<string, number>();
    for (const ev of timeFilteredEvents) {
      map.set(ev.categoryId, (map.get(ev.categoryId) ?? 0) + 1);
    }
    return map;
  }, [timeFilteredEvents]);

  const weightEvents = useMemo(() => {
    return filteredEvents.filter(
      (ev) =>
        ev.fieldValues.weightValue !== undefined &&
        ev.fieldValues.weightValue !== '' &&
        Number.isFinite(Number(ev.fieldValues.weightValue))
    );
  }, [filteredEvents]);

  const isFilterActive = useMemo(() => {
    const hasCatFilter = activeCategoryIds.length > 0;
    const hasTimeFilter = pet.filterPrefs.timePreset !== 'all_time';
    return hasCatFilter || hasTimeFilter;
  }, [activeCategoryIds.length, pet.filterPrefs.timePreset]);

  useEffect(() => {
    setExpandedIds(highlightEventId ? new Set([highlightEventId]) : new Set());
    setContextEvent(null);
    setMoveEvent(null);
  }, [pet.id, highlightEventId]);

  useEffect(() => {
    if (!highlightEventId) return;
    setExpandedIds((prev) => new Set(prev).add(highlightEventId));
    const el = rowRefs.current.get(highlightEventId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightEventId]);

  const allExpanded =
    filteredEvents.length > 0 && filteredEvents.every((ev) => expandedIds.has(ev.id));

  const toggleAllExpanded = () => {
    if (allExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(filteredEvents.map((e) => e.id)));
    }
  };

  const toggleSingle = (id: string) => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const triggerRefresh = async () => {
    setIsRefreshing(true);
    try {
      await reloadAll();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY <= 2) {
      touchStartYRef.current = e.touches[0].clientY;
    } else {
      touchStartYRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartYRef.current === null) return;
    const delta = e.touches[0].clientY - touchStartYRef.current;
    if (delta > 0 && window.scrollY <= 2) {
      setPullDistance(Math.min(72, delta * 0.45));
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance >= 54 && !isRefreshing) {
      void triggerRefresh();
    } else {
      setPullDistance(0);
    }
    touchStartYRef.current = null;
  };

  const startLongPress = (e: React.PointerEvent, ev: DiaryEvent) => {
    if ((e.target as HTMLElement).closest('a, input')) return;
    if (longPressTimerRef.current) window.clearTimeout(longPressTimerRef.current);
    longPressOriginRef.current = { x: e.clientX, y: e.clientY };
    longPressTimerRef.current = window.setTimeout(() => {
      suppressNextClickRef.current = true;
      setContextEvent(ev);
    }, 480);
  };

  const moveLongPress = (e: React.PointerEvent) => {
    const origin = longPressOriginRef.current;
    if (!origin) return;
    if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > 10) {
      cancelLongPress();
    }
  };

  const cancelLongPress = () => {
    longPressOriginRef.current = null;
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const clearFilters = () => {
    void savePet({
      ...pet,
      filterPrefs: {
        enabledCategoryIds: null,
        timePreset: 'all_time',
      },
    });
  };

  const toggleSingleActiveCategory = (catId: string) => {
    const next = activeCategoryIds.filter((id) => id !== catId);
    void savePet({
      ...pet,
      filterPrefs: {
        ...pet.filterPrefs,
        enabledCategoryIds: next.length === 0 ? null : next,
      },
    });
  };

  const openMoveDialog = (ev: DiaryEvent) => {
    setMoveEvent(ev);
    setMoveDateValue(ev.date);
  };

  const handleSaveMovedDate = async () => {
    if (!moveEvent || !moveDateValue) return;
    if (moveDateValue !== moveEvent.date) {
      await saveEvent({
        ...moveEvent,
        date: moveDateValue,
        updatedAt: new Date().toISOString(),
      });
    }
    setMoveEvent(null);
  };

  const sameDateEvents = useMemo(() => {
    if (!moveEvent) return [];
    return filteredEvents.filter((ev) => ev.date === moveEvent.date);
  }, [filteredEvents, moveEvent]);

  const handleReorderSameDate = async (delta: -1 | 1) => {
    if (!moveEvent) return;
    const idx = sameDateEvents.findIndex((e) => e.id === moveEvent.id);
    const nextIdx = idx + delta;
    if (idx === -1 || nextIdx < 0 || nextIdx >= sameDateEvents.length) return;
    const copy = [...sameDateEvents];
    const [moved] = copy.splice(idx, 1);
    copy.splice(nextIdx, 0, moved);
    const updated = copy.map((ev, i) => ({
      ...ev,
      order: i,
      updatedAt: new Date().toISOString(),
    }));
    await reorderEvents(updated);
    const refreshed = updated.find((u) => u.id === moveEvent.id);
    if (refreshed) setMoveEvent(refreshed);
  };

  const activeFilterCategories = useMemo(() => {
    return activeCategoryIds
      .map((id) => categoryMap.get(id))
      .filter((c): c is Category => Boolean(c));
  }, [activeCategoryIds, categoryMap]);

  return (
    <div
      className="space-y-4"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull-to-refresh indikator */}
      {(pullDistance > 12 || isRefreshing) && (
        <div
          className="flex items-center justify-center gap-2 text-xs text-[var(--text-muted)] py-1"
          style={{
            transform: `translateY(${Math.min(12, pullDistance * 0.15)}px)`,
          }}
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          <span>
            {isRefreshing
              ? 'Uppdaterar…'
              : pullDistance >= 54
              ? 'Släpp för att uppdatera'
              : 'Dra ner för att uppdatera'}
          </span>
        </div>
      )}

      {/* Diagram filtreras och döljs utifrån vald kategori */}
      {(() => {
        const chartDefinitions: {
          id: string;
          categoryIds: string[];
          render: () => React.ReactNode;
        }[] = [
          {
            id: 'weight',
            categoryIds: ['cat-vikt'],
            render: () => (
              <WeightChart
                key="weight"
                events={weightEvents}
                title={settings.weightChartTitle || 'Viktkurva'}
                showTrendline={Boolean(settings.showWeightTrendline)}
                onTitleChange={(nextTitle) => void updateSettings({ weightChartTitle: nextTitle })}
                onToggleTrendline={(show) => void updateSettings({ showWeightTrendline: show })}
              />
            ),
          },
        ];

        const visibleCharts = chartDefinitions.filter(
          (chart) =>
            activeCategoryIds.length === 0 ||
            chart.categoryIds.some((cid) => activeCategoryIds.includes(cid))
        );

        if (visibleCharts.length === 0) return null;

        return (
          <DiagramSection>
            {visibleCharts.map((chart) => chart.render())}
          </DiagramSection>
        );
      })()}

      {/* Kategorier, Tidsperiod och Öppna alla placerade under diagram-sektionen */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenCategoryFilter}
            className={`btn-pill px-4 py-2 text-sm font-medium border inline-flex items-center gap-2 whitespace-nowrap ${
              activeCategoryIds.length > 0
                ? 'border-[var(--accent-primary)] bg-[var(--bg-surface-elevated)] text-[var(--accent-primary)]'
                : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
            }`}
          >
            <Filter size={15} />
            <span>Kategorier</span>
          </button>

          <button
            type="button"
            onClick={onOpenTimeFilter}
            className={`btn-pill px-4 py-2 text-sm font-medium border inline-flex items-center gap-2 whitespace-nowrap ${
              pet.filterPrefs.timePreset !== 'all_time'
                ? 'border-[var(--accent-primary)] bg-[var(--bg-surface-elevated)] text-[var(--accent-primary)]'
                : 'border-[var(--border-hairline)] bg-[var(--bg-surface)] text-[var(--text-primary)]'
            }`}
          >
            <Calendar size={15} />
            <span>Tidsperiod</span>
          </button>
        </div>

        {filteredEvents.length > 0 && (
          <button
            type="button"
            onClick={toggleAllExpanded}
            className="btn-pill px-4 py-2 text-xs font-semibold bg-[var(--bg-surface)] hover:bg-[var(--bg-surface-hover)] border border-[var(--border-hairline)] text-[var(--text-primary)]"
          >
            {allExpanded ? 'Stäng alla' : 'Öppna alla'}
          </button>
        )}
      </div>

      {/* Fältet för aktiva filter med label "Aktiva filter", ikonbild + antal poster under */}
      {isFilterActive && (
        <section
          aria-label="Aktiva filter"
          className="surface-elevated px-4 py-3 space-y-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[var(--text-secondary)]">
              Aktiva filter
            </span>
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-[var(--accent-primary)] hover:underline min-h-[32px] px-2"
            >
              Rensa filter
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {activeFilterCategories.map((cat) => {
              const count = countByCategoryInTimeWindow.get(cat.id) ?? 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleSingleActiveCategory(cat.id)}
                  title={`${cat.name} (${count}) — tryck för att ta bort`}
                  aria-label={`${cat.name}: ${count} poster. Tryck för att ta bort filter.`}
                  className="min-w-[48px] px-2.5 py-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-colors hover:opacity-85"
                  style={{
                    backgroundColor: `${cat.color}30`,
                    borderColor: cat.color,
                  }}
                >
                  <CategoryIcon icon={cat.icon} size={18} style={{ color: cat.color }} />
                  <span className="text-xs font-bold text-[var(--text-primary)] tabular-nums leading-none">
                    {count}
                  </span>
                </button>
              );
            })}

            {pet.filterPrefs.timePreset !== 'all_time' && (
              <button
                type="button"
                onClick={onOpenTimeFilter}
                className="min-h-[48px] px-3 py-2 rounded-xl border border-[var(--accent-primary)] bg-[var(--bg-surface)] flex flex-col items-center justify-center gap-1"
                aria-label="Ändra tidsperiod"
              >
                <Calendar size={16} className="text-[var(--accent-primary)]" />
                <span className="text-[11px] font-semibold text-[var(--text-primary)] leading-none whitespace-nowrap">
                  {pet.filterPrefs.timePreset === 'last_year'
                    ? 'Senaste året'
                    : pet.filterPrefs.timePreset === 'single_date'
                    ? pet.filterPrefs.customSingleDate
                      ? formatDisplayDate(pet.filterPrefs.customSingleDate)
                      : 'Datum'
                    : 'Period'}
                </span>
              </button>
            )}
          </div>
        </section>
      )}

      {/* Tidslinje */}
      <section aria-label="Tidslinje" className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-base font-semibold text-[var(--text-primary)] inline-flex items-center gap-2">
            <TimelineIcon size={18} className="text-[var(--accent-primary)] shrink-0" />
            <span>Tidslinje</span>
          </h2>
          <span className="text-xs text-[var(--text-muted)] tabular-nums">
            {filteredEvents.length} poster
          </span>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="surface-card p-8 text-center space-y-3">
            <p className="text-sm text-[var(--text-secondary)]">
              {isFilterActive
                ? 'Inga händelser matchar det aktuella filtret.'
                : 'Inga händelser ännu. Tryck på plusknappen i nedre högra hörnet för att lägga till.'}
            </p>
            {isFilterActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="btn-pill px-5 py-2.5 text-sm font-semibold bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] border border-[var(--border-strong)]"
              >
                Visa alla händelser
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEvents.map((ev) => {
              const cat = categoryMap.get(ev.categoryId);
              const isOpen = expandedIds.has(ev.id);
              const catColor = cat?.color ?? '#9098A3';

              const filledTextFields: { label: string; value: string; isLink?: boolean }[] = [];

              if (cat) {
                for (const f of cat.fields) {
                  if (f.type === 'image' || f.type === 'document') continue;
                  const val = ev.fieldValues[f.key];
                  if (val === undefined || val === null || val === '' || Array.isArray(val)) continue;
                  if (f.key === 'weightUnit') continue;
                  if (f.key === 'weightValue') {
                    const unit = ev.fieldValues.weightUnit === 'g' ? 'g' : 'kg';
                    filledTextFields.push({
                      label: f.label,
                      value: `${formatNumber(Number(val))} ${unit}`,
                    });
                    continue;
                  }
                  filledTextFields.push({
                    label: f.label,
                    value: f.type === 'date' ? formatDisplayDate(String(val)) : String(val),
                    isLink: f.type === 'link',
                  });
                }
                if (typeof ev.fieldValues.clinicComment === 'string' && ev.fieldValues.clinicComment.trim()) {
                  filledTextFields.push({
                    label: 'Anteckning (klinik)',
                    value: ev.fieldValues.clinicComment,
                  });
                }
                if (typeof ev.fieldValues.careComment === 'string' && ev.fieldValues.careComment.trim()) {
                  filledTextFields.push({
                    label: 'Anteckning (bedömning & vård)',
                    value: ev.fieldValues.careComment,
                  });
                }
                if (Array.isArray(ev.fieldValues.extraCare)) {
                  ev.fieldValues.extraCare.forEach((raw, idx) => {
                    if (typeof raw !== 'string') return;
                    try {
                      const parsed = JSON.parse(raw) as { label?: string; price?: string };
                      const parts = [
                        parsed.label?.trim(),
                        parsed.price?.trim() ? `${parsed.price.trim()} kr` : '',
                      ].filter(Boolean);
                      if (parts.length > 0) {
                        filledTextFields.push({
                          label: `Extra åtgärd ${idx + 1}`,
                          value: parts.join(' — '),
                        });
                      }
                    } catch {
                      if (raw.trim()) {
                        filledTextFields.push({
                          label: `Extra åtgärd ${idx + 1}`,
                          value: raw,
                        });
                      }
                    }
                  });
                }
                if (cat.id === 'cat-veterinarvard') {
                  const basePrice = Number(ev.fieldValues.price) || 0;
                  let extraTotal = 0;
                  if (Array.isArray(ev.fieldValues.extraCare)) {
                    for (const raw of ev.fieldValues.extraCare) {
                      if (typeof raw !== 'string') continue;
                      try {
                        const parsed = JSON.parse(raw) as { price?: string };
                        extraTotal += Number(String(parsed.price ?? '').replace(',', '.')) || 0;
                      } catch {
                        // ignore
                      }
                    }
                  }
                  const vetTotal = basePrice + extraTotal;
                  if (vetTotal > 0) {
                    filledTextFields.push({
                      label: 'Total summa',
                      value: `${formatNumber(vetTotal)} kr`,
                    });
                  }
                }
              } else {
                for (const [k, v] of Object.entries(ev.fieldValues)) {
                  if (typeof v === 'string' && v.trim()) {
                    filledTextFields.push({ label: k, value: v });
                  }
                }
              }

              return (
                <div
                  key={ev.id}
                  ref={(el) => {
                    if (el) rowRefs.current.set(ev.id, el);
                    else rowRefs.current.delete(ev.id);
                  }}
                  onPointerDown={(e) => startLongPress(e, ev)}
                  onPointerMove={moveLongPress}
                  onPointerUp={cancelLongPress}
                  onPointerCancel={cancelLongPress}
                  className={`surface-card overflow-hidden transition-colors select-none ${
                    highlightEventId === ev.id ? 'ring-2 ring-[var(--accent-primary)]' : ''
                  }`}
                >
                  {/* Stängt läge */}
                  <button
                    type="button"
                    onClick={() => toggleSingle(ev.id)}
                    aria-expanded={isOpen}
                    className="w-full px-3.5 py-3 flex items-center gap-3 text-left min-h-[54px] hover:bg-[var(--bg-surface-hover)] transition-colors"
                  >
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: `${catColor}36`,
                        borderColor: `${catColor}66`,
                        color: catColor,
                      }}
                    >
                      <CategoryIcon icon={cat?.icon ?? 'tag'} size={16} />
                    </span>

                    <span className="text-xs text-[var(--text-muted)] tabular-nums whitespace-nowrap shrink-0">
                      {formatDisplayDate(ev.date)}
                    </span>

                    <span className="text-sm font-medium text-[var(--text-primary)] truncate flex-1">
                      {ev.summary || cat?.name || 'Händelse'}
                    </span>

                    <span className="text-[var(--text-muted)] shrink-0">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>

                  {/* Öppnat läge: enbart Redigera-knapp uppe till höger (Arkivera/Ta bort finns under Redigera) */}
                  {isOpen && (
                    <div className="px-4 pb-4 pt-2.5 border-t border-[var(--border-hairline)] space-y-3">
                      <div className="flex items-start justify-between gap-2 text-xs text-[var(--text-muted)]">
                        <span className="pt-2">
                          {cat?.name ?? 'Kategori'}
                          {ev.archived ? ' · Arkiverad' : ''}
                        </span>
                        <button
                          type="button"
                          onClick={() => onEditEvent(ev)}
                          className="min-w-[44px] min-h-[44px] px-4 rounded-full bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)] font-semibold text-xs inline-flex items-center justify-center gap-1.5 shadow-sm shrink-0"
                          aria-label="Redigera händelse"
                        >
                          <Pencil size={16} />
                          <span>Redigera</span>
                        </button>
                      </div>

                      {filledTextFields.length > 0 && (
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                          {filledTextFields.map((item, idx) => (
                            <div key={idx} className="space-y-0.5">
                              <dt className="text-xs text-[var(--text-muted)]">{item.label}</dt>
                              <dd className="text-[var(--text-primary)] whitespace-pre-wrap break-words">
                                {item.isLink ? (
                                  <a
                                    href={item.value}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[var(--accent-primary)] underline"
                                  >
                                    {item.value}
                                  </a>
                                ) : (
                                  item.value
                                )}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* FAB-knapp i nedre högra hörnet med bara ett plus (+) ovanför bottenmenyn */}
      <button
        type="button"
        onClick={onAddEvent}
        aria-label="Lägg till händelse"
        title="Lägg till händelse"
        className="fixed right-[max(20px,calc(50%-31rem))] bottom-[calc(82px+env(safe-area-inset-bottom,0px))] z-[35] w-[68px] h-[68px] rounded-full bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)] shadow-lg flex items-center justify-center transition-transform active:scale-95 hover:scale-105"
      >
        <Plus size={30} strokeWidth={2.6} />
      </button>

      {/* Långtryckskontextmeny för tidslinje-objekt: Flytta, Redigera, Ta bort */}
      {contextEvent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Händelseåtgärder"
          className="fixed inset-0 z-50 bg-[var(--bg-scrim)] backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setContextEvent(null)}
        >
          <div
            className="surface-card w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-5 space-y-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-[var(--text-primary)] pb-1 truncate">
              {formatDisplayDate(contextEvent.date)} · {contextEvent.summary}
            </h3>
            <button
              type="button"
              onClick={() => {
                const target = contextEvent;
                setContextEvent(null);
                openMoveDialog(target);
              }}
              className="btn-pill w-full px-4 py-3 text-sm font-medium bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] inline-flex items-center gap-2.5 text-left"
            >
              <GripVertical size={16} className="text-[var(--text-muted)]" />
              <span>Flytta</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const target = contextEvent;
                setContextEvent(null);
                onEditEvent(target);
              }}
              className="btn-pill w-full px-4 py-3 text-sm font-medium bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] inline-flex items-center gap-2.5 text-left"
            >
              <Pencil size={16} className="text-[var(--text-muted)]" />
              <span>Redigera</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const target = contextEvent;
                setContextEvent(null);
                void softDeleteEvent(target.id);
              }}
              className="btn-pill w-full px-4 py-3 text-sm font-semibold text-[var(--status-danger)] bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] inline-flex items-center gap-2.5 text-left"
            >
              <Trash2 size={16} />
              <span>Ta bort</span>
            </button>
          </div>
        </div>
      )}

      {/* Dialog för att flytta tidslinje-objekt */}
      {moveEvent && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Flytta händelse"
          className="fixed inset-0 z-50 bg-[var(--bg-scrim)] backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setMoveEvent(null)}
        >
          <div
            className="surface-card w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Flytta händelse
            </h3>

            {sameDateEvents.length > 1 && (
              <div className="space-y-2">
                <span className="text-xs font-medium text-[var(--text-secondary)] block">
                  Ordning samma dag ({formatDisplayDate(moveEvent.date)})
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={sameDateEvents.findIndex((e) => e.id === moveEvent.id) <= 0}
                    onClick={() => void handleReorderSameDate(-1)}
                    className="btn-pill flex-1 px-3 py-2.5 text-xs font-semibold bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] inline-flex items-center justify-center gap-1.5 disabled:opacity-35"
                  >
                    <ArrowUp size={15} />
                    <span>Flytta upp</span>
                  </button>
                  <button
                    type="button"
                    disabled={
                      sameDateEvents.findIndex((e) => e.id === moveEvent.id) >=
                      sameDateEvents.length - 1
                    }
                    onClick={() => void handleReorderSameDate(1)}
                    className="btn-pill flex-1 px-3 py-2.5 text-xs font-semibold bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] inline-flex items-center justify-center gap-1.5 disabled:opacity-35"
                  >
                    <ArrowDown size={15} />
                    <span>Flytta ner</span>
                  </button>
                </div>
              </div>
            )}

            <div className="block space-y-1.5">
              <span className="text-xs font-medium text-[var(--text-secondary)] inline-flex items-center gap-1.5">
                <Calendar size={14} />
                <span>Flytta till datum</span>
              </span>
              <StyledDateInput
                value={moveDateValue}
                onChange={setMoveDateValue}
                ariaLabel="Flytta till datum"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setMoveEvent(null)}
                className="btn-pill px-4 py-2 text-xs font-medium bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]"
              >
                Avbryt
              </button>
              <button
                type="button"
                onClick={() => void handleSaveMovedDate()}
                className="btn-pill px-5 py-2 text-xs font-semibold bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)]"
              >
                Klar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
