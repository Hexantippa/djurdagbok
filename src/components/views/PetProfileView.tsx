import React, { useEffect, useRef, useState } from 'react';
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  CatProfileFields,
  CategoryIconKey,
  Pet,
  ProfileItemType,
  ProfileSection,
  ProfileSectionItem,
} from '../../types/models';
import { calculateAgeLabel, formatDisplayDate, generateId } from '../../utils/formatters';
import { PetAvatar } from '../common/PetAvatar';
import { StyledDateInput } from '../common/StyledDateInput';
import {
  CATEGORY_COLOR_PALETTE,
  CATEGORY_ICON_OPTIONS,
  CategoryIcon,
} from '../icons/PetIllustrations';

const ITEM_TYPE_LABELS: { value: ProfileItemType; label: string }[] = [
  { value: 'text', label: 'Textfält' },
  { value: 'note', label: 'Anteckning' },
  { value: 'link', label: 'Länk' },
];

export function PetProfileView({
  pet,
  isNewPet = false,
  onAddEvent,
  onFinishCreate,
}: {
  pet: Pet;
  isNewPet?: boolean;
  onAddEvent: () => void;
  onFinishCreate?: () => void;
}) {
  const { savePet, archivePet, softDeletePet, uploadMedia, isDirty, setIsDirty } = useApp();

  const [fields, setFields] = useState<CatProfileFields>(pet.profileFields);
  const [sections, setSections] = useState<ProfileSection[]>(
    [...pet.sections].sort((a, b) => a.order - b.order)
  );

  // Kollapsbara sektioner
  const [basicOpen, setBasicOpen] = useState(true);
  const [healthOpen, setHealthOpen] = useState(true);
  const [openSectionIds, setOpenSectionIds] = useState<Set<string>>(() =>
    isNewPet ? new Set(pet.sections.map((s) => s.id)) : new Set()
  );

  // Låst läge som standard för befintlig profil; allt öppet & synligt i nytt djur-läge
  const [isBasicEditing, setIsBasicEditing] = useState(isNewPet);
  const [isHealthEditing, setIsHealthEditing] = useState(isNewPet);
  const [showBasicComment, setShowBasicComment] = useState(() =>
    isNewPet || Boolean(pet.profileFields.basicComment?.trim())
  );
  const [showHealthNote, setShowHealthNote] = useState(() =>
    isNewPet ||
    Boolean(
      (
        pet.profileFields.healthNote ??
        [pet.profileFields.personalNotes, pet.profileFields.otherNotes]
          .filter(Boolean)
          .join('\n\n')
      ).trim()
    )
  );
  const [editingCustomSectionId, setEditingCustomSectionId] = useState<string | null>(null);
  const [editingCustomMetaId, setEditingCustomMetaId] = useState<string | null>(null);
  const [addMenuSectionId, setAddMenuSectionId] = useState<string | null>(null);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);

  // Presentationskortets overflow-meny, swipe-vänster & avatar-väljare
  const [cardMenuOpen, setCardMenuOpen] = useState(false);
  const [cardSwiped, setCardSwiped] = useState(false);
  const [cardSwipeOffset, setCardSwipeOffset] = useState<number | null>(null);
  const cardSwipeOffsetRef = useRef<number | null>(null);
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);

  const cardSwipeStartRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    swiping: boolean;
  } | null>(null);
  const cardMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFields(pet.profileFields);
    setSections([...pet.sections].sort((a, b) => a.order - b.order));
    setBasicOpen(true);
    setHealthOpen(true);
    setIsBasicEditing(isNewPet);
    setIsHealthEditing(isNewPet);
    setShowBasicComment(isNewPet || Boolean(pet.profileFields.basicComment?.trim()));
    setShowHealthNote(
      isNewPet ||
        Boolean(
          (
            pet.profileFields.healthNote ??
            [pet.profileFields.personalNotes, pet.profileFields.otherNotes]
              .filter(Boolean)
              .join('\n\n')
          ).trim()
        )
    );
    if (isNewPet) {
      setOpenSectionIds(new Set(pet.sections.map((s) => s.id)));
    }
    setIsDirty(false);
  }, [pet, isNewPet, setIsDirty]);

  useEffect(() => {
    if (!cardMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (cardMenuRef.current && !cardMenuRef.current.contains(e.target as Node)) {
        setCardMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [cardMenuOpen]);

  useEffect(() => {
    const handleWindowMove = (e: PointerEvent) => {
      const start = cardSwipeStartRef.current;
      if (!start || e.pointerId !== start.pointerId) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        start.swiping = true;
        const base = cardSwiped ? -144 : 0;
        const nextOffset = Math.max(-160, Math.min(0, base + dx));
        cardSwipeOffsetRef.current = nextOffset;
        setCardSwipeOffset(nextOffset);
      }
    };

    const handleWindowEnd = (e: PointerEvent) => {
      const start = cardSwipeStartRef.current;
      if (!start || e.pointerId !== start.pointerId) return;
      cardSwipeStartRef.current = null;
      const offset = cardSwipeOffsetRef.current;
      if (start.swiping && offset !== null) {
        setCardSwiped(offset < -48);
      }
      cardSwipeOffsetRef.current = null;
      setCardSwipeOffset(null);
    };

    window.addEventListener('pointermove', handleWindowMove);
    window.addEventListener('pointerup', handleWindowEnd);
    window.addEventListener('pointercancel', handleWindowEnd);
    return () => {
      window.removeEventListener('pointermove', handleWindowMove);
      window.removeEventListener('pointerup', handleWindowEnd);
      window.removeEventListener('pointercancel', handleWindowEnd);
    };
  }, [cardSwiped]);

  const commitFields = async (nextFields: CatProfileFields = fields) => {
    setIsDirty(false);
    await savePet(
      {
        ...pet,
        name: nextFields.name.trim() || pet.name,
        profileFields: nextFields,
        sections,
      },
      false
    );
  };

  const commitSections = async (nextSections: ProfileSection[]) => {
    const ordered = nextSections.map((s, idx) => ({ ...s, order: idx }));
    setSections(ordered);
    setIsDirty(false);
    await savePet(
      {
        ...pet,
        name: fields.name.trim() || pet.name,
        profileFields: fields,
        sections: ordered,
      },
      true,
      'Sektioner uppdaterade'
    );
  };

  const handleAvatarUpload = async (file: File | undefined) => {
    if (!file) return;
    setIsAvatarUploading(true);
    try {
      const asset = await uploadMedia(file, 'avatar', pet.id);
      await savePet({
        ...pet,
        avatarType: 'custom',
        avatarMediaId: asset.id,
      });
      setAvatarPickerOpen(false);
    } finally {
      setIsAvatarUploading(false);
    }
  };

  const handleCardPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button, a, input')) return;
    cardSwipeStartRef.current = {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      swiping: false,
    };
  };

  // Anpassade sektioner
  const addCustomSection = async () => {
    const newSec: ProfileSection = {
      id: generateId(),
      title: 'Ny sektion',
      icon: 'file-text',
      color: '#45B87A',
      order: sections.length,
      items: [],
    };
    const next = [...sections, newSec];
    setOpenSectionIds((prev) => new Set(prev).add(newSec.id));
    setEditingCustomSectionId(newSec.id);
    setEditingCustomMetaId(newSec.id);
    await commitSections(next);
  };

  const updateSection = (id: string, patch: Partial<ProfileSection>, saveNow = false) => {
    const next = sections.map((s) => (s.id === id ? { ...s, ...patch } : s));
    setSections(next);
    if (saveNow) {
      void commitSections(next);
    } else {
      setIsDirty(true);
    }
  };

  const deleteSection = async (id: string) => {
    const next = sections.filter((s) => s.id !== id);
    if (editingCustomSectionId === id) setEditingCustomSectionId(null);
    await commitSections(next);
  };

  const moveSection = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const copy = [...sections];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    await commitSections(copy);
  };

  const handleDropSection = async (targetId: string) => {
    if (!draggedSectionId || draggedSectionId === targetId) return;
    const fromIdx = sections.findIndex((s) => s.id === draggedSectionId);
    const toIdx = sections.findIndex((s) => s.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const copy = [...sections];
    const [moved] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, moved);
    setDraggedSectionId(null);
    await commitSections(copy);
  };

  const addSectionItem = async (sectionId: string, type: ProfileItemType) => {
    const item: ProfileSectionItem = {
      id: generateId(),
      type,
      label: ITEM_TYPE_LABELS.find((t) => t.value === type)?.label ?? 'Objekt',
      value: '',
      mediaIds: [],
    };
    const next = sections.map((s) =>
      s.id === sectionId ? { ...s, items: [...s.items, item] } : s
    );
    setEditingCustomSectionId(sectionId);
    setAddMenuSectionId(null);
    await commitSections(next);
  };

  const updateSectionItem = (
    sectionId: string,
    itemId: string,
    patch: Partial<ProfileSectionItem>,
    saveNow = false
  ) => {
    const next = sections.map((s) =>
      s.id === sectionId
        ? { ...s, items: s.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)) }
        : s
    );
    setSections(next);
    if (saveNow) {
      void commitSections(next);
    } else {
      setIsDirty(true);
    }
  };

  const removeSectionItem = async (sectionId: string, itemId: string) => {
    const next = sections.map((s) =>
      s.id === sectionId ? { ...s, items: s.items.filter((it) => it.id !== itemId) } : s
    );
    await commitSections(next);
  };

  const toggleCustomSectionOpen = (secId: string) => {
    if (openSectionIds.has(secId) && isDirty) {
      void commitSections(sections);
    }
    setOpenSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(secId)) next.delete(secId);
      else next.add(secId);
      return next;
    });
  };

  const ageLabel = calculateAgeLabel(fields.birthDate);
  const effectiveInsuranceCompany = fields.insuranceCompany || fields.insurance || '';

  const cardTranslateX = cardSwipeOffset !== null ? cardSwipeOffset : cardSwiped ? -144 : 0;

  const sexNeuteredDisplay = [fields.sex, fields.neutered].filter((v) => v && v.trim()).join(' · ');

  const effectiveHealthNote =
    fields.healthNote !== undefined
      ? fields.healthNote
      : [fields.personalNotes, fields.otherNotes].filter((v) => v && v.trim()).join('\n\n');

  const group1Filled = [
    { label: 'Namn', value: fields.name },
    {
      label: 'Födelsedatum',
      value: fields.birthDate ? formatDisplayDate(fields.birthDate) : '',
    },
    { label: 'Kön (kastrerad)', value: sexNeuteredDisplay },
    { label: 'Färg/teckning', value: fields.colorPattern },
    { label: 'Ras', value: fields.breed },
    { label: 'Chipnummer', value: fields.microchipNumber },
  ].filter((item) => item.value && item.value.trim() !== '');

  const group2Filled = [
    { label: 'Försäkringsbolag', value: effectiveInsuranceCompany },
    { label: 'Försäkringsnummer', value: fields.insuranceNumber ?? '' },
    { label: 'Websida', value: fields.website ?? '', isLink: true },
    { label: 'Veterinär', value: fields.veterinarian },
    { label: 'Anteckning', value: fields.basicComment ?? '' },
  ].filter((item) => item.value && item.value.trim() !== '');

  const healthFilled = [
    { label: 'Allergier', value: fields.allergies },
    { label: 'Skador/sjukdomar', value: fields.conditions },
    { label: 'Foder', value: fields.diet },
    { label: 'Anteckning', value: effectiveHealthNote },
  ].filter((item) => item.value && item.value.trim() !== '');

  const renderLinkHref = (raw: string) => {
    const trimmed = raw.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  };

  return (
    <div className="space-y-5">
      {/* Presentationskortet med penna på profilbilden, overflowmeny (⋮) & förbättrad vänsterswipe */}
      <div
        className={`relative rounded-2xl ${
          cardSwiped || cardSwipeOffset !== null ? 'overflow-hidden' : ''
        }`}
      >
        {/* Bakomliggande swipe-åtgärder: Arkivera och Ta bort */}
        <div
          className={`absolute inset-y-0 right-0 flex items-stretch bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-2xl overflow-hidden transition-opacity ${
            cardSwiped || cardSwipeOffset !== null
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none'
          }`}
          aria-hidden={!cardSwiped && cardSwipeOffset === null}
        >
          <button
            type="button"
            onClick={() => {
              setCardSwiped(false);
              void archivePet(pet.id, !pet.archived);
            }}
            className="w-[72px] flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-[var(--accent-primary)] hover:bg-[var(--bg-surface-hover)] px-1"
          >
            <Archive size={16} />
            <span>{pet.archived ? 'Återställ' : 'Arkivera'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setCardSwiped(false);
              void softDeletePet(pet.id);
            }}
            className="w-[72px] flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-white bg-[var(--status-danger)] px-1"
          >
            <Trash2 size={16} />
            <span>Ta bort</span>
          </button>
        </div>

        <section
          aria-label="Presentationskort"
          onPointerDown={handleCardPointerDown}
          onClick={() => {
            if (cardSwiped) setCardSwiped(false);
          }}
          style={{
            transform: `translateX(${cardTranslateX}px)`,
            transition:
              cardSwipeOffset !== null
                ? 'none'
                : 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
            touchAction: 'pan-y',
          }}
          className="surface-card relative p-5 flex items-center justify-between gap-4 select-none"
        >
          <div className="flex items-center gap-4 min-w-0">
            {/* Profilbild med liten penna (endast på befintlig profil) */}
            <div className="relative shrink-0">
              <PetAvatar pet={pet} size="lg" />
              {!isNewPet && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setAvatarPickerOpen(true);
                  }}
                  aria-label="Ändra profilbild"
                  title="Ändra profilbild"
                  className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)] border-2 border-[var(--bg-surface)] flex items-center justify-center shadow hover:scale-105 transition-transform"
                >
                  <Pencil size={13} />
                </button>
              )}
            </div>

            <div className="min-w-0 space-y-1">
              <h2 className="text-xl font-bold text-[var(--text-primary)] truncate">
                {fields.name.trim() || (isNewPet ? 'Nytt djur' : pet.name)}
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Katt{fields.breed ? ` · ${fields.breed}` : ''}
                {ageLabel ? ` · ${ageLabel}` : ''}
                {pet.archived ? ' · Arkiverad' : ''}
              </p>
            </div>
          </div>

          {/* Tre prickar (overflowmeny) för Arkivera & Ta bort */}
          <div className="relative shrink-0 self-start" ref={cardMenuRef}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setCardSwiped(false);
                setCardMenuOpen((v) => !v);
              }}
              aria-haspopup="menu"
              aria-expanded={cardMenuOpen}
              aria-label="Fler alternativ för profil"
              className="min-w-[44px] min-h-[44px] -mt-1 -mr-1 rounded-full hover:bg-[var(--bg-surface-hover)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <MoreVertical size={18} />
            </button>

            {cardMenuOpen && (
              <div
                role="menu"
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-10 w-44 surface-elevated p-1.5 rounded-2xl shadow-xl border border-[var(--border-strong)] z-20 space-y-0.5"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setCardMenuOpen(false);
                    void archivePet(pet.id, !pet.archived);
                  }}
                  className="w-full min-h-[44px] px-3 rounded-xl hover:bg-[var(--bg-surface-hover)] flex items-center gap-2.5 text-sm text-[var(--text-primary)] text-left"
                >
                  <Archive size={15} className="text-[var(--text-muted)]" />
                  <span>{pet.archived ? 'Återställ' : 'Arkivera'}</span>
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setCardMenuOpen(false);
                    void softDeletePet(pet.id);
                  }}
                  className="w-full min-h-[44px] px-3 rounded-xl hover:bg-[var(--bg-surface-hover)] flex items-center gap-2.5 text-sm text-[var(--status-danger)] text-left"
                >
                  <Trash2 size={15} />
                  <span>Ta bort</span>
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Sektion 1: Grundfakta (kollapsbar & låst som standard) */}
      <section className="surface-card overflow-hidden" aria-label="Grundfakta">
        <div className="flex items-center justify-between gap-2 px-4 py-2">
          <button
            type="button"
            onClick={() => {
              if (basicOpen && isBasicEditing) {
                void commitFields();
                setIsBasicEditing(false);
              }
              setBasicOpen((v) => !v);
            }}
            aria-expanded={basicOpen}
            className="flex-1 min-h-[44px] flex items-center gap-2 text-left"
          >
            <span className="text-base font-semibold text-[var(--text-primary)]">Grundfakta</span>
            <span className="text-[var(--text-muted)]">
              {basicOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isBasicEditing) {
                void commitFields();
                setIsBasicEditing(false);
              } else {
                setBasicOpen(true);
                setIsBasicEditing(true);
              }
            }}
            aria-label={isBasicEditing ? 'Spara och lås Grundfakta' : 'Redigera Grundfakta'}
            title={isBasicEditing ? 'Klar' : 'Redigera'}
            className={`min-w-[40px] min-h-[40px] w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              isBasicEditing
                ? 'bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)]'
                : 'hover:bg-[var(--bg-surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {isBasicEditing ? <Check size={16} /> : <Pencil size={15} />}
          </button>
        </div>

        {basicOpen && (
          <div className="px-4 pb-4 pt-1 border-t border-[var(--border-hairline)] space-y-4">
            {isBasicEditing ? (
              <>
                <div className="p-3.5 rounded-xl bg-[var(--bg-input)]/50 border border-[var(--border-hairline)] space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">Namn</span>
                      <input
                        type="text"
                        value={fields.name}
                        onChange={(e) => {
                          setFields((prev) => ({ ...prev, name: e.target.value }));
                          setIsDirty(true);
                        }}
                        onBlur={() => void commitFields()}
                        className="field-input w-full px-3 py-2 text-sm"
                      />
                    </label>

                    <div className="block space-y-1">
                      <span className="text-xs font-medium text-[var(--text-secondary)] block">
                        Födelsedatum
                      </span>
                      <StyledDateInput
                        value={fields.birthDate}
                        onChange={(val) => {
                          const next = { ...fields, birthDate: val };
                          setFields(next);
                          void commitFields(next);
                        }}
                        ariaLabel="Födelsedatum"
                        allowClear
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2 md:col-span-2">
                      <label className="block space-y-1">
                        <span className="text-xs font-medium text-[var(--text-secondary)]">Kön</span>
                        <input
                          type="text"
                          value={fields.sex}
                          onChange={(e) => {
                            setFields((prev) => ({ ...prev, sex: e.target.value }));
                            setIsDirty(true);
                          }}
                          onBlur={() => void commitFields()}
                          className="field-input w-full px-3 py-2 text-sm"
                        />
                      </label>
                      <label className="block space-y-1">
                        <span className="text-xs font-medium text-[var(--text-secondary)]">
                          Kastrerad/steriliserad
                        </span>
                        <input
                          type="text"
                          value={fields.neutered}
                          onChange={(e) => {
                            setFields((prev) => ({ ...prev, neutered: e.target.value }));
                            setIsDirty(true);
                          }}
                          onBlur={() => void commitFields()}
                          className="field-input w-full px-3 py-2 text-sm"
                        />
                      </label>
                    </div>

                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">
                        Färg/teckning
                      </span>
                      <input
                        type="text"
                        value={fields.colorPattern}
                        onChange={(e) => {
                          setFields((prev) => ({ ...prev, colorPattern: e.target.value }));
                          setIsDirty(true);
                        }}
                        onBlur={() => void commitFields()}
                        className="field-input w-full px-3 py-2 text-sm"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">Ras</span>
                      <input
                        type="text"
                        value={fields.breed}
                        onChange={(e) => {
                          setFields((prev) => ({ ...prev, breed: e.target.value }));
                          setIsDirty(true);
                        }}
                        onBlur={() => void commitFields()}
                        className="field-input w-full px-3 py-2 text-sm"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">
                        Chipnummer
                      </span>
                      <input
                        type="text"
                        value={fields.microchipNumber}
                        onChange={(e) => {
                          setFields((prev) => ({ ...prev, microchipNumber: e.target.value }));
                          setIsDirty(true);
                        }}
                        onBlur={() => void commitFields()}
                        className="field-input w-full px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[var(--bg-input)]/50 border border-[var(--border-hairline)] space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">
                        Försäkringsbolag
                      </span>
                      <input
                        type="text"
                        value={effectiveInsuranceCompany}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFields((prev) => ({
                            ...prev,
                            insuranceCompany: val,
                            insurance: val,
                          }));
                          setIsDirty(true);
                        }}
                        onBlur={() => void commitFields()}
                        className="field-input w-full px-3 py-2 text-sm"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">
                        Försäkringsnummer
                      </span>
                      <input
                        type="text"
                        value={fields.insuranceNumber ?? ''}
                        onChange={(e) => {
                          setFields((prev) => ({ ...prev, insuranceNumber: e.target.value }));
                          setIsDirty(true);
                        }}
                        onBlur={() => void commitFields()}
                        className="field-input w-full px-3 py-2 text-sm"
                      />
                    </label>

                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">
                        Websida
                      </span>
                      <input
                        type="url"
                        value={fields.website ?? ''}
                        placeholder="https://..."
                        onChange={(e) => {
                          setFields((prev) => ({ ...prev, website: e.target.value }));
                          setIsDirty(true);
                        }}
                        onBlur={() => void commitFields()}
                        className="field-input w-full px-3 py-2 text-sm"
                      />
                    </label>

                    <label className="block space-y-1 md:col-span-2">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">
                        Veterinär
                      </span>
                      <input
                        type="text"
                        value={fields.veterinarian}
                        onChange={(e) => {
                          setFields((prev) => ({ ...prev, veterinarian: e.target.value }));
                          setIsDirty(true);
                        }}
                        onBlur={() => void commitFields()}
                        className="field-input w-full px-3 py-2 text-sm"
                      />
                    </label>
                  </div>

                  {showBasicComment ? (
                    <label className="block space-y-1">
                      <span className="text-xs font-medium text-[var(--text-secondary)]">
                        Anteckning
                      </span>
                      <textarea
                        rows={2}
                        value={fields.basicComment ?? ''}
                        onChange={(e) => {
                          setFields((prev) => ({ ...prev, basicComment: e.target.value }));
                          setIsDirty(true);
                        }}
                        onBlur={() => void commitFields()}
                        placeholder="Lägg till anteckning…"
                        className="field-input w-full px-3 py-2 text-sm resize-y"
                      />
                    </label>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowBasicComment(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-primary)] hover:underline min-h-[36px] px-1"
                    >
                      <Plus size={14} />
                      <span>Lägg till anteckning</span>
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-3 pt-1">
                {group1Filled.length > 0 && (
                  <dl className="p-3.5 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border-hairline)] grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                    {group1Filled.map((item) => (
                      <div key={item.label} className="space-y-0.5">
                        <dt className="text-xs text-[var(--text-muted)]">{item.label}</dt>
                        <dd className="text-[var(--text-primary)] font-medium">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {group2Filled.length > 0 && (
                  <dl className="p-3.5 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border-hairline)] grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                    {group2Filled.map((item) => (
                      <div key={item.label} className="space-y-0.5">
                        <dt className="text-xs text-[var(--text-muted)]">{item.label}</dt>
                        <dd className="text-[var(--text-primary)] break-words">
                          {item.isLink ? (
                            <a
                              href={renderLinkHref(item.value)}
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

                {group1Filled.length === 0 && group2Filled.length === 0 && (
                  <p className="text-xs text-[var(--text-muted)]">
                    Inga uppgifter ifyllda ännu. Tryck på pennan eller ”Lägg till” för att fylla i.
                  </p>
                )}

                {!fields.basicComment?.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowBasicComment(true);
                      setIsBasicEditing(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-primary)] hover:underline min-h-[36px] px-1"
                  >
                    <Plus size={14} />
                    <span>Lägg till anteckning</span>
                  </button>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-[var(--border-hairline)]">
              <button
                type="button"
                onClick={() => {
                  if (isBasicEditing) {
                    void commitFields();
                    setIsBasicEditing(false);
                  } else {
                    setIsBasicEditing(true);
                  }
                }}
                className="btn-pill w-full px-4 py-2 text-xs font-semibold bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] border border-[var(--border-hairline)] inline-flex items-center justify-center gap-1.5"
              >
                {isBasicEditing ? <Check size={14} /> : <Plus size={14} />}
                <span>{isBasicEditing ? 'Klar' : 'Lägg till'}</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Sektion 2: Hälsa och foder (kollapsbar & låst som standard) */}
      <section className="surface-card overflow-hidden" aria-label="Hälsa och foder">
        <div className="flex items-center justify-between gap-2 px-4 py-2">
          <button
            type="button"
            onClick={() => {
              if (healthOpen && isHealthEditing) {
                void commitFields();
                setIsHealthEditing(false);
              }
              setHealthOpen((v) => !v);
            }}
            aria-expanded={healthOpen}
            className="flex-1 min-h-[44px] flex items-center gap-2 text-left"
          >
            <span className="text-base font-semibold text-[var(--text-primary)]">
              Hälsa och foder
            </span>
            <span className="text-[var(--text-muted)]">
              {healthOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (isHealthEditing) {
                void commitFields();
                setIsHealthEditing(false);
              } else {
                setHealthOpen(true);
                setIsHealthEditing(true);
              }
            }}
            aria-label={
              isHealthEditing
                ? 'Spara och lås Hälsa och foder'
                : 'Redigera Hälsa och foder'
            }
            title={isHealthEditing ? 'Klar' : 'Redigera'}
            className={`min-w-[40px] min-h-[40px] w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              isHealthEditing
                ? 'bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)]'
                : 'hover:bg-[var(--bg-surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            {isHealthEditing ? <Check size={16} /> : <Pencil size={15} />}
          </button>
        </div>

        {healthOpen && (
          <div className="px-4 pb-4 pt-2 border-t border-[var(--border-hairline)] space-y-4">
            {isHealthEditing ? (
              <div className="p-3.5 rounded-xl bg-[var(--bg-input)]/50 border border-[var(--border-hairline)] space-y-3">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    Allergier
                  </span>
                  <textarea
                    rows={2}
                    value={fields.allergies}
                    onChange={(e) => {
                      setFields((prev) => ({ ...prev, allergies: e.target.value }));
                      setIsDirty(true);
                    }}
                    onBlur={() => void commitFields()}
                    className="field-input w-full px-3 py-2 text-sm resize-y"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">
                    Skador/sjukdomar
                  </span>
                  <textarea
                    rows={2}
                    value={fields.conditions}
                    onChange={(e) => {
                      setFields((prev) => ({ ...prev, conditions: e.target.value }));
                      setIsDirty(true);
                    }}
                    onBlur={() => void commitFields()}
                    className="field-input w-full px-3 py-2 text-sm resize-y"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-[var(--text-secondary)]">Foder</span>
                  <textarea
                    rows={2}
                    value={fields.diet}
                    onChange={(e) => {
                      setFields((prev) => ({ ...prev, diet: e.target.value }));
                      setIsDirty(true);
                    }}
                    onBlur={() => void commitFields()}
                    className="field-input w-full px-3 py-2 text-sm resize-y"
                  />
                </label>

                {showHealthNote ? (
                  <label className="block space-y-1">
                    <span className="text-xs font-medium text-[var(--text-secondary)]">
                      Anteckning
                    </span>
                    <textarea
                      rows={2}
                      value={effectiveHealthNote}
                      onChange={(e) => {
                        setFields((prev) => ({
                          ...prev,
                          healthNote: e.target.value,
                          personalNotes: '',
                          otherNotes: '',
                        }));
                        setIsDirty(true);
                      }}
                      onBlur={() => void commitFields()}
                      placeholder="Lägg till anteckning…"
                      className="field-input w-full px-3 py-2 text-sm resize-y"
                    />
                  </label>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowHealthNote(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-primary)] hover:underline min-h-[36px] px-1"
                  >
                    <Plus size={14} />
                    <span>Lägg till anteckning</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {healthFilled.length > 0 ? (
                  <dl className="p-3.5 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border-hairline)] space-y-2.5 text-sm">
                    {healthFilled.map((item) => (
                      <div key={item.label} className="space-y-0.5">
                        <dt className="text-xs text-[var(--text-muted)]">{item.label}</dt>
                        <dd className="text-[var(--text-primary)] whitespace-pre-wrap break-words">
                          {item.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="text-xs text-[var(--text-muted)]">
                    Inga uppgifter ifyllda ännu. Tryck på pennan eller ”Lägg till” för att fylla i.
                  </p>
                )}

                {!effectiveHealthNote.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowHealthNote(true);
                      setIsHealthEditing(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-primary)] hover:underline min-h-[36px] px-1"
                  >
                    <Plus size={14} />
                    <span>Lägg till anteckning</span>
                  </button>
                )}
              </div>
            )}

            <div className="pt-2 border-t border-[var(--border-hairline)]">
              <button
                type="button"
                onClick={() => {
                  if (isHealthEditing) {
                    void commitFields();
                    setIsHealthEditing(false);
                  } else {
                    setIsHealthEditing(true);
                  }
                }}
                className="btn-pill w-full px-4 py-2 text-xs font-semibold bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] border border-[var(--border-hairline)] inline-flex items-center justify-center gap-1.5"
              >
                {isHealthEditing ? <Check size={14} /> : <Plus size={14} />}
                <span>{isHealthEditing ? 'Klar' : 'Lägg till'}</span>
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Anpassade sektioner (utan foto/dokument-uppladdning i MVP) */}
      {sections.length > 0 && (
        <section className="space-y-3" aria-label="Anpassade sektioner">
          {sections.map((sec, idx) => {
            const isOpen = openSectionIds.has(sec.id);
            const isEditingSec = editingCustomSectionId === sec.id;
            const isEditingMeta = editingCustomMetaId === sec.id;
            const textOnlyItems = sec.items.filter(
              (it) => it.type !== 'image' && it.type !== 'document'
            );
            const visibleItems = isEditingSec
              ? textOnlyItems
              : textOnlyItems.filter((it) => it.value.trim() !== '');

            return (
              <div
                key={sec.id}
                draggable={isEditingSec}
                onDragStart={() => setDraggedSectionId(sec.id)}
                onDragOver={(e) => {
                  if (isEditingSec) e.preventDefault();
                }}
                onDrop={() => {
                  if (isEditingSec) void handleDropSection(sec.id);
                }}
                className="surface-card overflow-hidden"
              >
                <div className="flex items-center gap-1 px-3 py-1.5">
                  {isEditingSec && (
                    <span
                      className="min-w-[32px] min-h-[44px] flex items-center justify-center text-[var(--text-muted)] cursor-grab"
                      title="Dra för att ändra ordning"
                      aria-hidden="true"
                    >
                      <GripVertical size={16} />
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleCustomSectionOpen(sec.id)}
                    aria-expanded={isOpen}
                    className="flex-1 py-2 flex items-center gap-3 text-left min-h-[44px] min-w-0"
                  >
                    <span
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: `${sec.color}36`,
                        borderColor: `${sec.color}66`,
                        color: sec.color,
                      }}
                    >
                      <CategoryIcon icon={sec.icon} size={16} />
                    </span>
                    <span className="text-sm font-semibold text-[var(--text-primary)] truncate">
                      {sec.title}
                    </span>
                    <span className="text-[var(--text-muted)]">
                      {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </span>
                  </button>

                  {isEditingSec && (
                    <>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => void moveSection(idx, -1)}
                        className="min-w-[38px] min-h-[38px] rounded-full hover:bg-[var(--bg-surface-hover)] flex items-center justify-center disabled:opacity-30"
                        aria-label={`Flytta upp ${sec.title}`}
                      >
                        <ArrowUp size={15} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === sections.length - 1}
                        onClick={() => void moveSection(idx, 1)}
                        className="min-w-[38px] min-h-[38px] rounded-full hover:bg-[var(--bg-surface-hover)] flex items-center justify-center disabled:opacity-30"
                        aria-label={`Flytta ner ${sec.title}`}
                      >
                        <ArrowDown size={15} />
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (isEditingSec) {
                        void commitSections(sections);
                        setEditingCustomSectionId(null);
                        setEditingCustomMetaId(null);
                      } else {
                        setOpenSectionIds((prev) => new Set(prev).add(sec.id));
                        setEditingCustomSectionId(sec.id);
                      }
                    }}
                    aria-label={isEditingSec ? `Klar med ${sec.title}` : `Redigera ${sec.title}`}
                    title={isEditingSec ? 'Klar' : 'Redigera'}
                    className={`min-w-[40px] min-h-[40px] w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                      isEditingSec
                        ? 'bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)]'
                        : 'hover:bg-[var(--bg-surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {isEditingSec ? <Check size={16} /> : <Pencil size={15} />}
                  </button>
                </div>

                {isOpen && (
                  <div className="px-4 pb-4 pt-2 border-t border-[var(--border-hairline)] space-y-4">
                    {isEditingSec && (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingCustomMetaId(isEditingMeta ? null : sec.id)
                            }
                            className="btn-pill px-3.5 py-1.5 text-xs font-medium bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]"
                          >
                            {isEditingMeta ? 'Dölj sektionsstil' : 'Byt namn / ikon / färg'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void deleteSection(sec.id)}
                            className="btn-pill px-3.5 py-1.5 text-xs font-medium text-[var(--status-danger)] hover:bg-[var(--bg-surface-hover)] inline-flex items-center gap-1"
                          >
                            <Trash2 size={14} />
                            <span>Ta bort sektion</span>
                          </button>
                        </div>

                        {isEditingMeta && (
                          <div className="p-3.5 rounded-xl bg-[var(--bg-input)] border border-[var(--border-hairline)] space-y-3">
                            <label className="block space-y-1">
                              <span className="text-xs text-[var(--text-secondary)]">
                                Sektionsnamn
                              </span>
                              <input
                                type="text"
                                value={sec.title}
                                onChange={(e) =>
                                  updateSection(sec.id, { title: e.target.value }, false)
                                }
                                onBlur={() => void commitSections(sections)}
                                className="field-input w-full px-3 py-1.5 text-sm"
                              />
                            </label>

                            <div className="space-y-1.5">
                              <span className="text-xs text-[var(--text-secondary)] block">
                                Ikon
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {CATEGORY_ICON_OPTIONS.map((opt) => (
                                  <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() =>
                                      updateSection(
                                        sec.id,
                                        { icon: opt.key as CategoryIconKey },
                                        true
                                      )
                                    }
                                    className={`min-w-[44px] min-h-[44px] rounded-xl border flex items-center justify-center ${
                                      sec.icon === opt.key
                                        ? 'border-[var(--accent-primary)] bg-[var(--bg-surface-elevated)]'
                                        : 'border-[var(--border-hairline)]'
                                    }`}
                                    aria-label={opt.label}
                                  >
                                    <CategoryIcon
                                      icon={opt.key}
                                      size={16}
                                      style={{ color: sec.color }}
                                    />
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <span className="text-xs text-[var(--text-secondary)] block">
                                Färg
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {CATEGORY_COLOR_PALETTE.map((hex) => (
                                  <button
                                    key={hex}
                                    type="button"
                                    onClick={() =>
                                      updateSection(sec.id, { color: hex }, true)
                                    }
                                    className={`w-10 h-10 rounded-full border-2 ${
                                      sec.color === hex
                                        ? 'border-[var(--text-primary)] scale-105'
                                        : 'border-transparent'
                                    }`}
                                    style={{ backgroundColor: hex }}
                                    aria-label={`Färg ${hex}`}
                                  />
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Sektionens innehåll */}
                    {visibleItems.length === 0 ? (
                      <p className="text-xs text-[var(--text-muted)]">
                        Inga objekt ännu. Tryck på ”Lägg till” nedan för att lägga till innehåll.
                      </p>
                    ) : isEditingSec ? (
                      <div className="space-y-3">
                        {visibleItems.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-input)] space-y-2"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={item.label}
                                onChange={(e) =>
                                  updateSectionItem(
                                    sec.id,
                                    item.id,
                                    { label: e.target.value },
                                    false
                                  )
                                }
                                onBlur={() => void commitSections(sections)}
                                placeholder="Rubrik"
                                className="field-input flex-1 px-3 py-1.5 text-xs font-semibold"
                              />
                              <button
                                type="button"
                                onClick={() => void removeSectionItem(sec.id, item.id)}
                                className="min-w-[44px] min-h-[44px] rounded-full text-[var(--status-danger)] hover:bg-[var(--bg-surface-hover)] flex items-center justify-center"
                                aria-label="Ta bort objekt"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>

                            {item.type === 'note' ? (
                              <textarea
                                rows={3}
                                value={item.value}
                                onChange={(e) =>
                                  updateSectionItem(
                                    sec.id,
                                    item.id,
                                    { value: e.target.value },
                                    false
                                  )
                                }
                                onBlur={() => void commitSections(sections)}
                                placeholder="Lägg till anteckning…"
                                className="field-input w-full px-3 py-2 text-sm resize-y"
                              />
                            ) : (
                              <input
                                type={item.type === 'link' ? 'url' : 'text'}
                                value={item.value}
                                onChange={(e) =>
                                  updateSectionItem(
                                    sec.id,
                                    item.id,
                                    { value: e.target.value },
                                    false
                                  )
                                }
                                onBlur={() => void commitSections(sections)}
                                placeholder={
                                  item.type === 'link' ? 'https://...' : 'Skriv värde…'
                                }
                                className="field-input w-full px-3 py-2 text-sm"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <dl className="p-3.5 rounded-xl bg-[var(--bg-input)]/40 border border-[var(--border-hairline)] space-y-2.5 text-sm">
                        {visibleItems.map((item) => (
                          <div key={item.id} className="space-y-1">
                            <dt className="text-xs text-[var(--text-muted)]">{item.label}</dt>
                            <dd className="text-[var(--text-primary)] whitespace-pre-wrap break-words">
                              {item.type === 'link' ? (
                                <a
                                  href={renderLinkHref(item.value)}
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

                    {/* Lägg till längst ner i sektionen */}
                    <div className="pt-2 border-t border-[var(--border-hairline)] space-y-2">
                      <button
                        type="button"
                        onClick={() => void addSectionItem(sec.id, 'note')}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-primary)] hover:underline min-h-[36px] px-1"
                      >
                        <Plus size={14} />
                        <span>Lägg till anteckning</span>
                      </button>

                      {addMenuSectionId === sec.id ? (
                        <div className="flex flex-wrap gap-1.5">
                          {ITEM_TYPE_LABELS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => void addSectionItem(sec.id, opt.value)}
                              className="btn-pill px-3 py-1.5 text-xs font-medium bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] inline-flex items-center gap-1"
                            >
                              <Plus size={13} />
                              <span>{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setAddMenuSectionId(sec.id)}
                          className="btn-pill w-full px-4 py-2 text-xs font-semibold bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] border border-[var(--border-hairline)] inline-flex items-center justify-center gap-1.5"
                        >
                          <Plus size={14} />
                          <span>Lägg till</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* Knappen "Lägg till sektion" & ev. "Spara nytt djur" längst ner */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
        <button
          type="button"
          onClick={() => void addCustomSection()}
          className="btn-pill px-6 py-3 text-sm font-semibold bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] border border-[var(--border-hairline)] inline-flex items-center gap-2"
        >
          <Plus size={16} />
          <span>Lägg till sektion</span>
        </button>

        {isNewPet && (
          <button
            type="button"
            onClick={() => {
              void commitFields().then(() => {
                onFinishCreate?.();
              });
            }}
            className="btn-pill px-7 py-3 text-sm font-semibold bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)] inline-flex items-center gap-2"
          >
            <Check size={16} />
            <span>Spara nytt djur</span>
          </button>
        )}
      </div>

      {/* Modal för att byta profilbild */}
      {avatarPickerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Ändra profilbild"
          className="fixed inset-0 z-50 bg-[var(--bg-scrim)] backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setAvatarPickerOpen(false)}
        >
          <div
            className="surface-card w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-5 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold text-[var(--text-primary)]">
              Välj profilbild
            </h3>

            <label className="btn-pill w-full px-4 py-3 text-sm font-semibold bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)] inline-flex items-center justify-center gap-2 cursor-pointer">
              <Camera size={16} />
              <span>{isAvatarUploading ? 'Laddar upp…' : 'Ladda upp eget foto'}</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={isAvatarUploading}
                onChange={(e) => {
                  void handleAvatarUpload(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </label>

            <button
              type="button"
              onClick={() => {
                void savePet({ ...pet, avatarType: 'cat' });
                setAvatarPickerOpen(false);
              }}
              className={`btn-pill w-full px-4 py-3 text-sm font-medium border ${
                pet.avatarType === 'cat'
                  ? 'border-[var(--accent-primary)] bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-input)] text-[var(--text-secondary)]'
              }`}
            >
              Stiliserad katt
            </button>

            <button
              type="button"
              onClick={() => {
                void savePet({ ...pet, avatarType: 'paw' });
                setAvatarPickerOpen(false);
              }}
              className={`btn-pill w-full px-4 py-3 text-sm font-medium border ${
                pet.avatarType === 'paw'
                  ? 'border-[var(--accent-primary)] bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]'
                  : 'border-[var(--border-hairline)] bg-[var(--bg-input)] text-[var(--text-secondary)]'
              }`}
            >
              Tass (ny/okänd)
            </button>

            <button
              type="button"
              onClick={() => setAvatarPickerOpen(false)}
              className="btn-pill w-full px-4 py-2.5 text-xs font-medium text-[var(--text-muted)]"
            >
              Avbryt
            </button>
          </div>
        </div>
      )}

      {/* FAB-knapp i nedre högra hörnet även på befintlig profilsida */}
      {!isNewPet && (
        <button
          type="button"
          onClick={onAddEvent}
          aria-label="Lägg till händelse"
          title="Lägg till händelse"
          className="fixed right-[max(20px,calc(50%-31rem))] bottom-[calc(82px+env(safe-area-inset-bottom,0px))] z-[35] w-[68px] h-[68px] rounded-full bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)] shadow-lg flex items-center justify-center transition-transform active:scale-95 hover:scale-105"
        >
          <Plus size={30} strokeWidth={2.6} />
        </button>
      )}
    </div>
  );
}
