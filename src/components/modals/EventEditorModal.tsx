import React, { useEffect, useState } from 'react';
import { Archive, Plus, Trash2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  Category,
  CategoryFieldDefinition,
  DiaryEvent,
  Pet,
} from '../../types/models';
import { formatNumber, generateId, getTodayIsoDate } from '../../utils/formatters';
import { PetAvatar } from '../common/PetAvatar';
import { StyledDateInput } from '../common/StyledDateInput';
import { CategoryIcon } from '../icons/PetIllustrations';

interface ExtraCareItem {
  id: string;
  label: string;
  price: string;
}

function parseExtraCare(raw: unknown): ExtraCareItem[] {
  if (!Array.isArray(raw)) return [];
  const items: ExtraCareItem[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string') continue;
    try {
      const parsed = JSON.parse(entry) as { label?: string; price?: string };
      items.push({
        id: generateId(),
        label: String(parsed.label ?? ''),
        price: String(parsed.price ?? ''),
      });
    } catch {
      if (entry.trim()) {
        items.push({ id: generateId(), label: entry, price: '' });
      }
    }
  }
  return items;
}

export function EventEditorModal({
  isOpen,
  pet,
  category,
  existingEvent,
  onClose,
  onSaved,
}: {
  isOpen: boolean;
  pet: Pet | null;
  category: Category | null;
  existingEvent: DiaryEvent | null;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const { saveEvent, archiveEvent, softDeleteEvent, userId, setIsDirty } = useApp();

  const [date, setDate] = useState(getTodayIsoDate());
  const [fieldValues, setFieldValues] = useState<Record<string, string | number | string[]>>({});
  const [extraCareItems, setExtraCareItems] = useState<ExtraCareItem[]>([]);
  const [showClinicComment, setShowClinicComment] = useState(false);
  const [showCareComment, setShowCareComment] = useState(false);
  const [showMainNotes, setShowMainNotes] = useState(false);
  const [dirtyLocal, setDirtyLocal] = useState(false);
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !category) return;
    setDate(existingEvent?.date || getTodayIsoDate());
    const defaults: Record<string, string | number | string[]> = {};
    for (const f of category.fields) {
      if (existingEvent && existingEvent.fieldValues[f.key] !== undefined) {
        defaults[f.key] = existingEvent.fieldValues[f.key];
      } else if (f.type === 'weight_unit') {
        defaults[f.key] = 'kg';
      } else if (f.type === 'image' || f.type === 'document') {
        defaults[f.key] = [];
      } else {
        defaults[f.key] = '';
      }
    }
    if (existingEvent?.fieldValues.clinicComment) {
      defaults.clinicComment = existingEvent.fieldValues.clinicComment;
      setShowClinicComment(true);
    } else {
      defaults.clinicComment = '';
      setShowClinicComment(false);
    }
    if (existingEvent?.fieldValues.careComment) {
      defaults.careComment = existingEvent.fieldValues.careComment;
      setShowCareComment(true);
    } else {
      defaults.careComment = '';
      setShowCareComment(false);
    }
    const existingMainNotes = existingEvent?.fieldValues.notes;
    setShowMainNotes(typeof existingMainNotes === 'string' && existingMainNotes.trim() !== '');

    setExtraCareItems(parseExtraCare(existingEvent?.fieldValues.extraCare));
    setFieldValues(defaults);
    setDirtyLocal(false);
    setIsDirty(false);
    setShowUnsavedWarning(false);
    setSaveError(null);
  }, [category, existingEvent, isOpen, setIsDirty]);

  if (!isOpen || !pet || !category) return null;

  const updateField = (key: string, value: string | number | string[]) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
    setDirtyLocal(true);
    setIsDirty(true);
  };

  const addExtraCareRow = () => {
    setExtraCareItems((prev) => [...prev, { id: generateId(), label: '', price: '' }]);
    setDirtyLocal(true);
    setIsDirty(true);
  };

  const updateExtraCareRow = (id: string, patch: Partial<ExtraCareItem>) => {
    setExtraCareItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
    setDirtyLocal(true);
    setIsDirty(true);
  };

  const removeExtraCareRow = (id: string) => {
    setExtraCareItems((prev) => prev.filter((item) => item.id !== id));
    setDirtyLocal(true);
    setIsDirty(true);
  };

  const deriveSummary = (): string => {
    if (fieldValues.weightValue !== undefined && fieldValues.weightValue !== '') {
      const unit = fieldValues.weightUnit === 'g' ? 'g' : 'kg';
      const num = Number(fieldValues.weightValue);
      return Number.isFinite(num) ? `${formatNumber(num)} ${unit}` : String(fieldValues.weightValue);
    }
    if (typeof fieldValues.medicationName === 'string' && fieldValues.medicationName.trim()) {
      const dose =
        typeof fieldValues.dosage === 'string' && fieldValues.dosage.trim()
          ? ` (${fieldValues.dosage.trim()})`
          : '';
      return `${fieldValues.medicationName.trim()}${dose}`;
    }
    for (const f of category.fields) {
      if (f.type === 'short_text' || f.type === 'long_text') {
        const val = fieldValues[f.key];
        if (typeof val === 'string' && val.trim()) {
          return val.trim();
        }
      }
    }
    return category.name;
  };

  const hasAnyContent = (): boolean => {
    for (const val of Object.values(fieldValues)) {
      if (Array.isArray(val) && val.length > 0) return true;
      if (typeof val === 'number' && Number.isFinite(val)) return true;
      if (typeof val === 'string' && val.trim() !== '' && val !== 'kg' && val !== 'g') return true;
    }
    if (extraCareItems.some((it) => it.label.trim() !== '' || it.price.trim() !== '')) {
      return true;
    }
    return false;
  };

  const commitSave = async (): Promise<boolean> => {
    if (!hasAnyContent() && !existingEvent) {
      setSaveError('Fyll i minst ett fält innan händelsen sparas.');
      return false;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const now = new Date().toISOString();
      const cleanedValues: Record<string, string | number | string[]> = {};
      for (const [k, v] of Object.entries(fieldValues)) {
        if (Array.isArray(v)) {
          if (v.length > 0) cleanedValues[k] = v;
        } else if (v !== '' && v !== undefined && v !== null) {
          cleanedValues[k] = v;
        }
      }

      const validExtra = extraCareItems
        .filter((it) => it.label.trim() !== '' || it.price.trim() !== '')
        .map((it) => JSON.stringify({ label: it.label.trim(), price: it.price.trim() }));
      if (validExtra.length > 0) {
        cleanedValues.extraCare = validExtra;
      } else {
        delete cleanedValues.extraCare;
      }

      const payload: DiaryEvent = existingEvent
        ? {
            ...existingEvent,
            date,
            summary: deriveSummary(),
            fieldValues: cleanedValues,
            updatedAt: now,
          }
        : {
            id: generateId(),
            userId,
            petId: pet.id,
            categoryId: category.id,
            date,
            summary: deriveSummary(),
            fieldValues: cleanedValues,
            archived: false,
            deletedAt: null,
            createdAt: now,
            updatedAt: now,
          };

      await saveEvent(payload, !existingEvent);
      setDirtyLocal(false);
      setIsDirty(false);
      return true;
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Kunde inte spara händelsen.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleCloseWithAutosave = async () => {
    if (!dirtyLocal) {
      setIsDirty(false);
      onClose();
      return;
    }
    if (existingEvent || hasAnyContent()) {
      const ok = await commitSave();
      if (ok) {
        onClose();
        onSaved?.();
      }
    } else {
      setShowUnsavedWarning(true);
    }
  };

  const handleExplicitCancel = () => {
    if (dirtyLocal) {
      setShowUnsavedWarning(true);
    } else {
      setIsDirty(false);
      onClose();
    }
  };

  const renderSingleField = (field: CategoryFieldDefinition) => {
    const val = fieldValues[field.key];

    if (field.type === 'weight_unit') {
      const currentUnit = val === 'g' ? 'g' : 'kg';
      return (
        <div key={field.id} className="space-y-1.5">
          <span className="text-sm font-medium text-[var(--text-secondary)] block">
            {field.label}
          </span>
          <div className="grid grid-cols-2 gap-2">
            {(['kg', 'g'] as const).map((unit) => (
              <button
                key={unit}
                type="button"
                onClick={() => updateField(field.key, unit)}
                className={`btn-pill px-4 py-2 text-sm font-semibold border ${
                  currentUnit === unit
                    ? 'bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)] border-transparent'
                    : 'bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border-hairline)]'
                }`}
              >
                {unit === 'kg' ? 'Kilo (kg)' : 'Gram (g)'}
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (field.type === 'long_text') {
      return (
        <label key={field.id} className="block space-y-1">
          <span className="text-xs font-medium text-[var(--text-secondary)]">
            {field.label}
          </span>
          <textarea
            rows={2}
            value={typeof val === 'string' ? val : ''}
            onChange={(e) => updateField(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="field-input w-full px-3 py-2 text-sm resize-y"
          />
        </label>
      );
    }

    if (field.type === 'date') {
      return (
        <div key={field.id} className="block space-y-1">
          <span className="text-xs font-medium text-[var(--text-secondary)] block">
            {field.label}
          </span>
          <StyledDateInput
            value={typeof val === 'string' ? val : ''}
            onChange={(nextVal) => updateField(field.key, nextVal)}
            placeholder={field.placeholder || 'Välj datum…'}
            ariaLabel={field.label}
            allowClear
          />
        </div>
      );
    }

    const inputType =
      field.type === 'number'
        ? 'number'
        : field.type === 'link'
        ? 'url'
        : 'text';

    return (
      <label key={field.id} className="block space-y-1">
        <span className="text-xs font-medium text-[var(--text-secondary)]">{field.label}</span>
        <input
          type={inputType}
          step={
            field.type === 'number'
              ? field.key === 'weightValue'
                ? '0.01'
                : 'any'
              : undefined
          }
          min={field.type === 'number' ? '0' : undefined}
          value={val !== undefined ? String(val) : ''}
          onChange={(e) => {
            if (field.type === 'number') {
              updateField(field.key, e.target.value === '' ? '' : Number(e.target.value));
            } else {
              updateField(field.key, e.target.value);
            }
          }}
          placeholder={field.placeholder}
          className="field-input w-full px-3 py-2 text-sm"
        />
      </label>
    );
  };

  const renderDateInput = (labelText: string) => (
    <div className="block space-y-1">
      <span className="text-xs font-medium text-[var(--text-secondary)] block">{labelText}</span>
      <StyledDateInput
        value={date}
        onChange={(nextDate) => {
          setDate(nextDate);
          setDirtyLocal(true);
          setIsDirty(true);
        }}
        ariaLabel={labelText}
      />
    </div>
  );

  const isVetCategory = category.id === 'cat-veterinarvard';
  const isMedsCategory = category.id === 'cat-medicinering';

  const getFieldByKey = (key: string) => category.fields.find((f) => f.key === key);
  const nonMediaNonNotesFields = category.fields.filter(
    (f) => f.type !== 'image' && f.type !== 'document' && f.key !== 'notes'
  );
  const notesField = getFieldByKey('notes');

  const computeVetTotal = () => {
    const basePrice = Number(fieldValues.price) || 0;
    const extraSum = extraCareItems.reduce((sum, item) => {
      const parsed = Number(String(item.price || '').replace(',', '.'));
      return sum + (Number.isFinite(parsed) ? parsed : 0);
    }, 0);
    return basePrice + extraSum;
  };

  const renderMainNotesBlock = () => {
    if (showMainNotes) {
      return notesField ? (
        renderSingleField({
          ...notesField,
          label: 'Anteckning',
          placeholder: 'Lägg till anteckning…',
        })
      ) : (
        <label className="block space-y-1">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Anteckning</span>
          <textarea
            rows={2}
            value={typeof fieldValues.notes === 'string' ? fieldValues.notes : ''}
            onChange={(e) => updateField('notes', e.target.value)}
            placeholder="Lägg till anteckning…"
            className="field-input w-full px-3 py-2 text-sm resize-y"
          />
        </label>
      );
    }

    return (
      <button
        type="button"
        onClick={() => setShowMainNotes(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-primary)] hover:underline min-h-[36px] px-1"
      >
        <Plus size={14} />
        <span>Lägg till anteckning</span>
      </button>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={existingEvent ? `Redigera ${category.name}` : `Ny ${category.name}`}
      className="fixed inset-0 z-50 bg-[var(--bg-scrim)] backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={() => void handleCloseWithAutosave()}
    >
      <div
        className="surface-card w-full sm:max-w-xl max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Rubrik med större profilbild i övre vänstra hörnet */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <PetAvatar pet={pet} size="md" />
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: `${category.color}36`,
                    borderColor: `${category.color}66`,
                    color: category.color,
                  }}
                >
                  <CategoryIcon icon={category.icon} size={16} />
                </span>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] truncate">
                  {existingEvent
                    ? `Redigera ${category.name.toLowerCase()}`
                    : `Lägg till ${category.name.toLowerCase()}`}
                </h2>
              </div>
              <p className="text-xs text-[var(--text-muted)] truncate">
                {pet.name} · Autosparas när formuläret stängs
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleCloseWithAutosave()}
            className="min-w-[44px] min-h-[44px] rounded-full hover:bg-[var(--bg-surface-hover)] flex items-center justify-center shrink-0"
            aria-label="Stäng och spara"
          >
            <X size={20} />
          </button>
        </div>

        {/* Grupperad layout för Veterinärvård */}
        {isVetCategory ? (
          <div className="space-y-3.5">
            <div className="surface-elevated p-3.5 space-y-2.5">
              {renderDateInput('Datum')}
              {getFieldByKey('event') && renderSingleField(getFieldByKey('event')!)}
            </div>

            <fieldset className="surface-elevated p-3.5 space-y-2.5">
              <legend className="text-xs font-semibold text-[var(--text-muted)] px-1">
                Klinik & kontakt
              </legend>
              <div className="space-y-2">
                {getFieldByKey('clinic') && renderSingleField(getFieldByKey('clinic')!)}
                {getFieldByKey('address') && renderSingleField(getFieldByKey('address')!)}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {getFieldByKey('phone') && renderSingleField(getFieldByKey('phone')!)}
                  {getFieldByKey('veterinarian') && renderSingleField(getFieldByKey('veterinarian')!)}
                </div>

                {showClinicComment ? (
                  <label className="block space-y-1 pt-1">
                    <span className="text-xs font-medium text-[var(--text-secondary)]">
                      Anteckning
                    </span>
                    <textarea
                      rows={2}
                      value={
                        typeof fieldValues.clinicComment === 'string'
                          ? fieldValues.clinicComment
                          : ''
                      }
                      onChange={(e) => updateField('clinicComment', e.target.value)}
                      placeholder="Lägg till anteckning…"
                      className="field-input w-full px-3 py-2 text-sm resize-y"
                    />
                  </label>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowClinicComment(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-primary)] hover:underline min-h-[36px] px-1"
                  >
                    <Plus size={14} />
                    <span>Lägg till anteckning</span>
                  </button>
                )}
              </div>
            </fieldset>

            <fieldset className="surface-elevated p-3.5 space-y-2.5">
              <legend className="text-xs font-semibold text-[var(--text-muted)] px-1">
                Bedömning & vård
              </legend>
              <div className="space-y-2.5">
                {getFieldByKey('reason') && renderSingleField(getFieldByKey('reason')!)}
                {getFieldByKey('diagnosis') && renderSingleField(getFieldByKey('diagnosis')!)}
                {getFieldByKey('treatment') && renderSingleField(getFieldByKey('treatment')!)}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    {getFieldByKey('action') ? (
                      renderSingleField(getFieldByKey('action')!)
                    ) : (
                      <label className="block space-y-1">
                        <span className="text-xs font-medium text-[var(--text-secondary)]">
                          Åtgärd
                        </span>
                        <textarea
                          rows={2}
                          value={typeof fieldValues.action === 'string' ? fieldValues.action : ''}
                          onChange={(e) => updateField('action', e.target.value)}
                          className="field-input w-full px-3 py-2 text-sm resize-y"
                        />
                      </label>
                    )}
                  </div>
                  <div>
                    {getFieldByKey('price') && renderSingleField(getFieldByKey('price')!)}
                  </div>
                </div>

                {/* Extra fält för åtgärd & pris */}
                {extraCareItems.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {extraCareItems.map((item, idx) => (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-input)]/60 flex flex-wrap sm:flex-nowrap items-end gap-2"
                      >
                        <label className="flex-1 min-w-[140px] space-y-1">
                          <span className="text-xs font-medium text-[var(--text-secondary)]">
                            Extra åtgärd {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={item.label}
                            onChange={(e) =>
                              updateExtraCareRow(item.id, { label: e.target.value })
                            }
                            placeholder="T.ex. Blodprov eller röntgen"
                            className="field-input w-full px-3 py-1.5 text-sm"
                          />
                        </label>
                        <label className="w-28 space-y-1">
                          <span className="text-xs font-medium text-[var(--text-secondary)]">
                            Pris (kr)
                          </span>
                          <input
                            type="number"
                            step="any"
                            min="0"
                            value={item.price}
                            onChange={(e) =>
                              updateExtraCareRow(item.id, { price: e.target.value })
                            }
                            placeholder="0"
                            className="field-input w-full px-3 py-1.5 text-sm"
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => removeExtraCareRow(item.id)}
                          aria-label="Ta bort extra fält"
                          className="min-w-[44px] min-h-[44px] rounded-full text-[var(--status-danger)] hover:bg-[var(--bg-surface-hover)] flex items-center justify-center shrink-0"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <button
                    type="button"
                    onClick={addExtraCareRow}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-primary)] hover:underline min-h-[36px] px-1"
                  >
                    <Plus size={14} />
                    <span>Lägg till ytterligare åtgärd och pris</span>
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-[var(--bg-input)]/60 border border-[var(--border-hairline)]">
                  <span className="text-xs font-semibold text-[var(--text-secondary)]">
                    Total summa
                  </span>
                  <strong className="text-sm font-bold text-[var(--text-primary)] tabular-nums">
                    {formatNumber(computeVetTotal())} kr
                  </strong>
                </div>

                {showCareComment ? (
                  <label className="block space-y-1 pt-1">
                    <span className="text-xs font-medium text-[var(--text-secondary)]">
                      Anteckning
                    </span>
                    <textarea
                      rows={2}
                      value={
                        typeof fieldValues.careComment === 'string'
                          ? fieldValues.careComment
                          : ''
                      }
                      onChange={(e) => updateField('careComment', e.target.value)}
                      placeholder="Lägg till anteckning…"
                      className="field-input w-full px-3 py-2 text-sm resize-y"
                    />
                  </label>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowCareComment(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-primary)] hover:underline min-h-[36px] px-1"
                  >
                    <Plus size={14} />
                    <span>Lägg till anteckning</span>
                  </button>
                )}
              </div>
            </fieldset>

            <div className="surface-elevated p-3.5">{renderMainNotesBlock()}</div>
          </div>
        ) : isMedsCategory ? (
          /* Sorterad layout för Medicinering */
          <div className="space-y-3">
            {getFieldByKey('medicationName') && renderSingleField(getFieldByKey('medicationName')!)}
            {getFieldByKey('dosage') && renderSingleField(getFieldByKey('dosage')!)}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {renderDateInput('Startdatum')}
              {getFieldByKey('endDate') && renderSingleField(getFieldByKey('endDate')!)}
            </div>
            {renderMainNotesBlock()}
          </div>
        ) : (
          /* Standardlayout för övriga kategorier: Anteckning alltid längst ner */
          <div className="space-y-3">
            {renderDateInput('Datum')}
            {nonMediaNonNotesFields.map((field) => renderSingleField(field))}
            {renderMainNotesBlock()}
          </div>
        )}

        {saveError && (
          <div
            role="alert"
            className="p-3 rounded-xl border border-[var(--status-danger)] bg-[var(--bg-input)] flex items-center justify-between gap-3 text-sm"
          >
            <span className="text-[var(--status-danger)]">{saveError}</span>
            <button
              type="button"
              onClick={() =>
                void commitSave().then((ok) => {
                  if (ok) {
                    onClose();
                    onSaved?.();
                  }
                })
              }
              className="btn-pill px-3.5 py-1.5 text-xs font-semibold bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)] shrink-0"
            >
              Försök igen
            </button>
          </div>
        )}

        {showUnsavedWarning && (
          <div
            role="alertdialog"
            aria-label="Osparat formulär"
            className="p-4 rounded-xl border border-[var(--accent-primary)] bg-[var(--bg-surface-elevated)] space-y-3"
          >
            <p className="text-sm font-medium text-[var(--text-primary)]">
              Du har osparade ändringar i formuläret. Vill du lämna utan att spara?
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUnsavedWarning(false)}
                className="btn-pill px-4 py-2 text-xs font-semibold bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-strong)]"
              >
                Fortsätt redigera
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDirty(false);
                  onClose();
                }}
                className="btn-pill px-4 py-2 text-xs font-semibold bg-[var(--status-danger)] text-white"
              >
                Lämna utan att spara
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-hairline)]">
          {existingEvent ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  void archiveEvent(existingEvent.id, !existingEvent.archived).then(() => {
                    setIsDirty(false);
                    onClose();
                  });
                }}
                className="btn-pill px-3.5 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] inline-flex items-center gap-1.5"
              >
                <Archive size={15} />
                <span>{existingEvent.archived ? 'Återställ' : 'Arkivera'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  void softDeleteEvent(existingEvent.id).then(() => {
                    setIsDirty(false);
                    onClose();
                  });
                }}
                className="btn-pill px-3.5 py-2 text-xs font-semibold text-[var(--status-danger)] hover:bg-[var(--bg-surface-hover)] inline-flex items-center gap-1.5"
              >
                <Trash2 size={15} />
                <span>Ta bort</span>
              </button>
            </div>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExplicitCancel}
              className="btn-pill px-4 py-2 text-sm font-medium bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]"
            >
              Avbryt
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                void commitSave().then((ok) => {
                  if (ok) {
                    onClose();
                    onSaved?.();
                  }
                });
              }}
              className="btn-pill px-6 py-2 text-sm font-semibold bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)] disabled:opacity-50"
            >
              {saving ? 'Sparar…' : 'Spara'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
