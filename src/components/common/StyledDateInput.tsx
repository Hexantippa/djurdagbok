import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { formatDisplayDate, getTodayIsoDate } from '../../utils/formatters';

const WEEKDAYS_SV = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
const MONTHS_SV = [
  'Januari',
  'Februari',
  'Mars',
  'April',
  'Maj',
  'Juni',
  'Juli',
  'Augusti',
  'September',
  'Oktober',
  'November',
  'December',
];

function parseIsoParts(iso: string): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]) - 1;
  const day = Number(m[3]);
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function StyledDateInput({
  value,
  onChange,
  placeholder = 'Välj datum…',
  ariaLabel,
  allowClear = false,
  autoOpenTrigger = 0,
  className = '',
}: {
  value: string;
  onChange: (isoDate: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  allowClear?: boolean;
  autoOpenTrigger?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  const todayIso = getTodayIsoDate();
  const initialDate = useMemo(() => {
    const parsed = parseIsoParts(value) ?? parseIsoParts(todayIso)!;
    return { year: parsed.year, month: parsed.month };
  }, [value, todayIso]);

  const [viewYear, setViewYear] = useState(initialDate.year);
  const [viewMonth, setViewMonth] = useState(initialDate.month);

  useEffect(() => {
    if (open) {
      const parsed = parseIsoParts(value) ?? parseIsoParts(todayIso)!;
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [open, value, todayIso]);

  useEffect(() => {
    if (autoOpenTrigger > 0) {
      setOpen(true);
    }
  }, [autoOpenTrigger]);

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const minYear = Math.min(currentYear - 35, viewYear - 5);
    const maxYear = Math.max(currentYear + 5, viewYear + 5);
    const list: number[] = [];
    for (let y = maxYear; y >= minYear; y--) {
      list.push(y);
    }
    return list;
  }, [viewYear]);

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const startDayOfWeek = (firstOfMonth.getDay() + 6) % 7; // Måndag = 0
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells: {
      iso: string;
      day: number;
      inCurrentMonth: boolean;
    }[] = [];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
      cells.push({
        iso: toIsoDate(prevY, prevM, d),
        day: d,
        inCurrentMonth: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({
        iso: toIsoDate(viewYear, viewMonth, d),
        day: d,
        inCurrentMonth: true,
      });
    }

    const totalCells = cells.length <= 35 ? 35 : 42;
    let nextDay = 1;
    while (cells.length < totalCells) {
      const nextM = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextY = viewMonth === 11 ? viewYear + 1 : viewYear;
      cells.push({
        iso: toIsoDate(nextY, nextM, nextDay),
        day: nextDay,
        inCurrentMonth: false,
      });
      nextDay++;
    }

    return cells;
  }, [viewYear, viewMonth]);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={ariaLabel || placeholder}
        className={`field-input w-full px-3 py-2 text-sm flex items-center justify-between gap-2 text-left cursor-pointer ${className}`}
      >
        <span className={value ? 'text-[var(--text-primary)] tabular-nums' : 'text-[var(--text-muted)]'}>
          {value ? formatDisplayDate(value) : placeholder}
        </span>
        <Calendar size={16} className="text-[var(--text-muted)] shrink-0" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Välj datum i kalendern"
          className="fixed inset-0 z-[70] bg-[var(--bg-scrim)] backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="surface-card w-full sm:max-w-[360px] rounded-t-3xl sm:rounded-2xl p-4 space-y-4 border border-[var(--border-strong)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Topp: månad, år och stäng */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <button
                  type="button"
                  onClick={goPrevMonth}
                  aria-label="Föregående månad"
                  className="min-w-[38px] min-h-[38px] rounded-full hover:bg-[var(--bg-surface-hover)] flex items-center justify-center text-[var(--text-primary)] shrink-0"
                >
                  <ChevronLeft size={18} />
                </button>

                <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-center">
                  <select
                    aria-label="Månad"
                    value={viewMonth}
                    onChange={(e) => setViewMonth(Number(e.target.value))}
                    className="field-input min-h-[38px] px-2 py-1 text-xs font-semibold bg-[var(--bg-surface-elevated)] border-[var(--border-hairline)]"
                  >
                    {MONTHS_SV.map((name, idx) => (
                      <option key={name} value={idx}>
                        {name}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="År"
                    value={viewYear}
                    onChange={(e) => setViewYear(Number(e.target.value))}
                    className="field-input min-h-[38px] px-2 py-1 text-xs font-semibold tabular-nums bg-[var(--bg-surface-elevated)] border-[var(--border-hairline)]"
                  >
                    {yearOptions.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={goNextMonth}
                  aria-label="Nästa månad"
                  className="min-w-[38px] min-h-[38px] rounded-full hover:bg-[var(--bg-surface-hover)] flex items-center justify-center text-[var(--text-primary)] shrink-0"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Stäng kalender"
                className="min-w-[38px] min-h-[38px] rounded-full hover:bg-[var(--bg-surface-hover)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
              >
                <X size={18} />
              </button>
            </div>

            {/* Veckodagar */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {WEEKDAYS_SV.map((dayName) => (
                <span
                  key={dayName}
                  className="text-[11px] font-semibold text-[var(--text-muted)] py-1"
                >
                  {dayName}
                </span>
              ))}
            </div>

            {/* Dag-rutnät */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((cell) => {
                const isSelected = value === cell.iso;
                const isToday = todayIso === cell.iso;
                return (
                  <button
                    key={cell.iso}
                    type="button"
                    onClick={() => {
                      onChange(cell.iso);
                      setOpen(false);
                    }}
                    aria-label={formatDisplayDate(cell.iso)}
                    aria-pressed={isSelected}
                    className={`min-h-[40px] rounded-xl text-xs tabular-nums flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)] font-bold shadow-sm'
                        : isToday
                        ? 'border border-[var(--accent-primary)] text-[var(--accent-primary)] font-semibold hover:bg-[var(--bg-surface-hover)]'
                        : cell.inCurrentMonth
                        ? 'text-[var(--text-primary)] font-medium hover:bg-[var(--bg-surface-hover)]'
                        : 'text-[var(--text-muted)] opacity-40 hover:bg-[var(--bg-surface-hover)]'
                    }`}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {/* Sidfot: Idag / Rensa / Stäng */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--border-hairline)]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onChange(todayIso);
                    setOpen(false);
                  }}
                  className="btn-pill min-h-[36px] px-3.5 py-1.5 text-xs font-semibold bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] text-[var(--accent-primary)]"
                >
                  Idag
                </button>
                {allowClear && value && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange('');
                      setOpen(false);
                    }}
                    className="btn-pill min-h-[36px] px-3 py-1.5 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  >
                    Rensa
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn-pill min-h-[36px] px-4 py-1.5 text-xs font-medium bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)]"
              >
                Stäng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
