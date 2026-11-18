import React, { useState } from 'react';
import { Calendar, Download, Monitor, Moon, Sun, Upload, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Pet, PetFilterPrefs, ThemeMode, TimeFilterPreset } from '../../types/models';
import { getTodayIsoDate } from '../../utils/formatters';
import { StyledDateInput } from '../common/StyledDateInput';
import { CATEGORY_COLOR_PALETTE, CategoryIcon } from '../icons/PetIllustrations';

export function CategoryFilterModal({
  pet,
  isOpen,
  onClose,
}: {
  pet: Pet | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { categories, events, savePet } = useApp();

  if (!isOpen || !pet) return null;

  const petEvents = events.filter((e) => e.petId === pet.id && !e.deletedAt);
  const countByCat = new Map<string, number>();
  for (const ev of petEvents) {
    countByCat.set(ev.categoryId, (countByCat.get(ev.categoryId) ?? 0) + 1);
  }

  const activeCategoryIds = pet.filterPrefs.enabledCategoryIds ?? [];
  const enabledSet = new Set(activeCategoryIds);

  const updateFilter = async (patch: Partial<PetFilterPrefs>) => {
    await savePet({
      ...pet,
      filterPrefs: {
        ...pet.filterPrefs,
        ...patch,
      },
    });
  };

  const toggleCategory = (catId: string) => {
    const next = new Set(enabledSet);
    if (next.has(catId)) {
      next.delete(catId);
    } else {
      next.add(catId);
    }
    const nextArr = Array.from(next);
    void updateFilter({
      enabledCategoryIds: nextArr.length === 0 ? null : nextArr,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Kategorier för ${pet.name}`}
      className="fixed inset-0 z-50 bg-[var(--bg-scrim)] backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="surface-card w-full sm:max-w-lg max-h-[88dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl p-5 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Kategorier — {pet.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-full hover:bg-[var(--bg-surface-hover)] flex items-center justify-center text-[var(--text-primary)]"
            aria-label="Stäng kategorier"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[var(--text-muted)]">
              Tryck på en kategori för att filtrera tidslinjen
            </p>
            {activeCategoryIds.length > 0 && (
              <button
                type="button"
                onClick={() => void updateFilter({ enabledCategoryIds: null })}
                className="btn-pill px-3.5 py-1.5 text-xs font-medium bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] shrink-0"
              >
                Rensa kategorier
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const active = enabledSet.has(cat.id);
              const count = countByCat.get(cat.id) ?? 0;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  aria-pressed={active}
                  className="btn-pill px-3.5 py-2 text-xs font-medium inline-flex items-center gap-2 border transition-colors"
                  style={{
                    backgroundColor: active ? `${cat.color}36` : 'var(--bg-input)',
                    borderColor: active ? cat.color : 'var(--border-hairline)',
                    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  <CategoryIcon icon={cat.icon} size={16} style={{ color: cat.color }} />
                  <span className="whitespace-nowrap">
                    {cat.name} ({count})
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-pill px-6 py-2.5 text-sm font-semibold bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)]"
          >
            Klar
          </button>
        </div>
      </div>
    </div>
  );
}

export function TimePeriodModal({
  pet,
  isOpen,
  onClose,
}: {
  pet: Pet | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { savePet } = useApp();
  const [dateTrigger, setDateTrigger] = useState(0);

  if (!isOpen || !pet) return null;

  const updateFilter = async (patch: Partial<PetFilterPrefs>) => {
    await savePet({
      ...pet,
      filterPrefs: {
        ...pet.filterPrefs,
        ...patch,
      },
    });
  };

  const handleSelectPreset = async (preset: TimeFilterPreset) => {
    if (preset === 'single_date') {
      const nextDate = pet.filterPrefs.customSingleDate || getTodayIsoDate();
      await updateFilter({
        timePreset: 'single_date',
        customSingleDate: nextDate,
      });
      setDateTrigger((c) => c + 1);
      return;
    }

    await updateFilter({ timePreset: preset });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Tidsperiod för ${pet.name}`}
      className="fixed inset-0 z-50 bg-[var(--bg-scrim)] backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="surface-card w-full sm:max-w-lg max-h-[88dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl p-5 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] inline-flex items-center gap-2">
            <Calendar size={18} className="text-[var(--accent-primary)]" />
            <span>Tidsperiod — {pet.name}</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-full hover:bg-[var(--bg-surface-hover)] flex items-center justify-center text-[var(--text-primary)]"
            aria-label="Stäng tidsperiod"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: 'all_time', label: 'Alltid' },
                { key: 'last_year', label: 'Senaste året' },
                { key: 'single_date', label: 'Datum' },
                { key: 'custom', label: 'Period' },
              ] as { key: TimeFilterPreset; label: string }[]
            ).map((opt) => {
              const selected = pet.filterPrefs.timePreset === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => void handleSelectPreset(opt.key)}
                  className={`btn-pill px-4 py-2 text-xs font-semibold border whitespace-nowrap ${
                    selected
                      ? 'bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)] border-transparent'
                      : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border-hairline)]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {pet.filterPrefs.timePreset === 'single_date' && (
            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-medium text-[var(--text-secondary)] block">
                Välj datum
              </span>
              <StyledDateInput
                value={pet.filterPrefs.customSingleDate ?? ''}
                onChange={(val) => void updateFilter({ customSingleDate: val })}
                ariaLabel="Välj datum"
                autoOpenTrigger={dateTrigger}
              />
            </div>
          )}

          {pet.filterPrefs.timePreset === 'custom' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1 text-xs text-[var(--text-secondary)]">
                <span>Från datum</span>
                <StyledDateInput
                  value={pet.filterPrefs.customStartDate ?? ''}
                  onChange={(val) => void updateFilter({ customStartDate: val })}
                  ariaLabel="Från datum"
                  allowClear
                />
              </div>
              <div className="space-y-1 text-xs text-[var(--text-secondary)]">
                <span>Till datum</span>
                <StyledDateInput
                  value={pet.filterPrefs.customEndDate ?? ''}
                  onChange={(val) => void updateFilter({ customEndDate: val })}
                  ariaLabel="Till datum"
                  allowClear
                />
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-pill px-6 py-2.5 text-sm font-semibold bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)]"
          >
            Klar
          </button>
        </div>
      </div>
    </div>
  );
}

export function ExportImportModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { exportBackupZip, importBackupZip } = useApp();
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setBusy(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await exportBackupZip();
      setSuccessMsg('ZIP-fil skapad och nedladdad.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Exporten misslyckades.');
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      await importBackupZip(file);
      setSuccessMsg('Säkerhetskopia återställd inklusive bilder och arkiverade djur.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Kunde inte importera ZIP-filen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Export och import"
      className="fixed inset-0 z-50 bg-[var(--bg-scrim)] backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="surface-card w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Export / Import</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-full hover:bg-[var(--bg-surface-hover)] flex items-center justify-center"
            aria-label="Stäng"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Exporterar hela databasen (inklusive arkiverade djur, profiler, händelser, bilder och dokument) till en ZIP-fil med läsbara mappar och Markdown/JSON-filer.
          </p>

          <button
            type="button"
            disabled={busy}
            onClick={() => void handleExport()}
            className="btn-pill w-full px-5 py-3 text-sm font-semibold bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)] inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Download size={18} />
            <span>{busy ? 'Arbetar…' : 'Exportera allt som ZIP'}</span>
          </button>
        </div>

        <div className="border-t border-[var(--border-hairline)] pt-4 space-y-3">
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            Återställ från en tidigare exporterad ZIP-fil. Befintlig lokal data ersätts av innehållet i säkerhetskopian.
          </p>
          <label className="btn-pill w-full px-5 py-3 text-sm font-semibold border border-[var(--border-strong)] bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] inline-flex items-center justify-center gap-2 cursor-pointer">
            <Upload size={18} />
            <span>Importera ZIP-backup</span>
            <input
              type="file"
              accept=".zip,application/zip"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                void handleImport(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
        </div>

        {errorMsg && (
          <p className="text-sm text-[var(--status-danger)]" role="alert">
            {errorMsg}
          </p>
        )}
        {successMsg && (
          <p className="text-sm text-[var(--status-success)]" role="status">
            {successMsg}
          </p>
        )}
      </div>
    </div>
  );
}

export function SettingsModal({
  isOpen,
  onClose,
  onOpenExport,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenExport?: () => void;
}) {
  const { settings, updateSettings, categories, saveCategory } = useApp();

  if (!isOpen) return null;

  const themeOptions: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
    { value: 'dark', label: 'Mörkt', icon: <Moon size={16} /> },
    { value: 'light', label: 'Ljust', icon: <Sun size={16} /> },
    { value: 'system', label: 'System', icon: <Monitor size={16} /> },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Inställningar"
      className="fixed inset-0 z-50 bg-[var(--bg-scrim)] backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="surface-card w-full sm:max-w-md max-h-[88dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl p-5 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Inställningar</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-full hover:bg-[var(--bg-surface-hover)] flex items-center justify-center"
            aria-label="Stäng inställningar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-2.5">
          <span className="text-sm font-semibold text-[var(--text-secondary)] block">Tema</span>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((opt) => {
              const active = settings.theme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => void updateSettings({ theme: opt.value })}
                  aria-pressed={active}
                  className={`btn-pill px-3 py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5 border ${
                    active
                      ? 'bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)] border-transparent'
                      : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border-hairline)]'
                  }`}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 pt-1 border-t border-[var(--border-hairline)]">
          <span className="text-sm font-semibold text-[var(--text-secondary)] block pt-2">
            Tillgänglighet
          </span>

          <label className="flex items-center justify-between gap-4 min-h-[44px] cursor-pointer">
            <span className="text-sm text-[var(--text-primary)]">Extra stora bokstäver</span>
            <input
              type="checkbox"
              checked={settings.largeText}
              onChange={(e) => void updateSettings({ largeText: e.target.checked })}
              className="w-5 h-5 accent-[var(--accent-primary)] cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between gap-4 min-h-[44px] cursor-pointer">
            <span className="text-sm text-[var(--text-primary)]">Förstärkta färgkontraster</span>
            <input
              type="checkbox"
              checked={settings.highContrast}
              onChange={(e) => void updateSettings({ highContrast: e.target.checked })}
              className="w-5 h-5 accent-[var(--accent-primary)] cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between gap-4 min-h-[44px] cursor-pointer">
            <span className="text-sm text-[var(--text-primary)]">Dölj arkiverade djur</span>
            <input
              type="checkbox"
              checked={settings.hideArchived}
              onChange={(e) => void updateSettings({ hideArchived: e.target.checked })}
              className="w-5 h-5 accent-[var(--accent-primary)] cursor-pointer"
            />
          </label>
        </div>

        <div className="space-y-3 pt-1 border-t border-[var(--border-hairline)]">
          <span className="text-sm font-semibold text-[var(--text-secondary)] block pt-2">
            Kategorifärger
          </span>
          <div className="space-y-2.5">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between gap-2 py-1">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border"
                    style={{
                      backgroundColor: `${cat.color}36`,
                      borderColor: `${cat.color}66`,
                      color: cat.color,
                    }}
                  >
                    <CategoryIcon icon={cat.icon} size={15} />
                  </span>
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {cat.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                  {CATEGORY_COLOR_PALETTE.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => void saveCategory({ ...cat, color: hex })}
                      aria-label={`Välj färg ${hex} för ${cat.name}`}
                      aria-pressed={cat.color === hex}
                      className={`w-[22px] h-[22px] rounded-full border-2 transition-transform ${
                        cat.color === hex
                          ? 'border-[var(--text-primary)] scale-110'
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {onOpenExport && (
          <div className="space-y-2.5 pt-2 border-t border-[var(--border-hairline)]">
            <span className="text-sm font-semibold text-[var(--text-secondary)] block pt-1">
              Säkerhetskopia
            </span>
            <button
              type="button"
              onClick={onOpenExport}
              className="btn-pill w-full px-4 py-2.5 text-sm font-semibold bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] border border-[var(--border-hairline)] inline-flex items-center justify-center gap-2"
            >
              <Download size={16} />
              <span>Export / Import (ZIP)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
