import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ArrowDown,
  ArrowUp,
  GripVertical,
  MoreVertical,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Pet } from '../../types/models';
import { calculateAgeLabel, formatDisplayDate } from '../../utils/formatters';
import { PetAvatar } from '../common/PetAvatar';
import { StylizedCatIllustration, TimelineIcon } from '../icons/PetIllustrations';

export function AllAnimalsView({
  onQuickAddEvent,
}: {
  onQuickAddEvent: (pet: Pet) => void;
}) {
  const {
    visiblePets,
    events,
    navigateTo,
    createNewCatProfile,
    reorderPets,
    archivePet,
    softDeletePet,
  } = useApp();

  const [menuPetId, setMenuPetId] = useState<string | null>(null);
  const [swipedPetId, setSwipedPetId] = useState<string | null>(null);
  const [contextPet, setContextPet] = useState<Pet | null>(null);
  const [moveModePetId, setMoveModePetId] = useState<string | null>(null);
  const [draggedPetId, setDraggedPetId] = useState<string | null>(null);
  const [speciesPickerOpen, setSpeciesPickerOpen] = useState(false);

  const [swipeDrag, setSwipeDrag] = useState<{ petId: string; offsetX: number } | null>(null);
  const swipeDragRef = useRef<{ petId: string; offsetX: number } | null>(null);
  const pointerStartRef = useRef<{
    petId: string;
    pointerId: number;
    x: number;
    y: number;
    moved: boolean;
    swiping: boolean;
  } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  useEffect(() => {
    if (!menuPetId) return;
    const handleOutside = () => setMenuPetId(null);
    window.addEventListener('click', handleOutside);
    return () => window.removeEventListener('click', handleOutside);
  }, [menuPetId]);

  useEffect(() => {
    const handleWindowPointerMove = (e: PointerEvent) => {
      const start = pointerStartRef.current;
      if (!start || e.pointerId !== start.pointerId) return;

      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;

      if (Math.hypot(dx, dy) > 10) {
        start.moved = true;
        clearLongPress();
      }

      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        start.swiping = true;
        suppressClickRef.current = true;
        const base = swipedPetId === start.petId ? -152 : 0;
        const nextX = Math.max(-172, Math.min(0, base + dx));
        const nextDrag = { petId: start.petId, offsetX: nextX };
        swipeDragRef.current = nextDrag;
        setSwipeDrag(nextDrag);
      }
    };

    const handleWindowPointerEnd = (e: PointerEvent) => {
      const start = pointerStartRef.current;
      if (!start || e.pointerId !== start.pointerId) return;
      clearLongPress();
      pointerStartRef.current = null;

      const activeDrag = swipeDragRef.current;
      if (start.swiping && activeDrag && activeDrag.petId === start.petId) {
        if (activeDrag.offsetX < -44) {
          setSwipedPetId(start.petId);
        } else {
          setSwipedPetId(null);
        }
      }
      swipeDragRef.current = null;
      setSwipeDrag(null);
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 80);
    };

    window.addEventListener('pointermove', handleWindowPointerMove);
    window.addEventListener('pointerup', handleWindowPointerEnd);
    window.addEventListener('pointercancel', handleWindowPointerEnd);
    return () => {
      window.removeEventListener('pointermove', handleWindowPointerMove);
      window.removeEventListener('pointerup', handleWindowPointerEnd);
      window.removeEventListener('pointercancel', handleWindowPointerEnd);
    };
  }, [swipedPetId]);

  const lastUpdatedByPet = useMemo(() => {
    const map = new Map<string, string>();
    for (const pet of visiblePets) {
      map.set(pet.id, pet.updatedAt);
    }
    for (const ev of events) {
      if (ev.deletedAt || ev.archived) continue;
      const cur = map.get(ev.petId);
      const candidate = ev.updatedAt || ev.createdAt;
      if (candidate && (!cur || candidate > cur)) {
        map.set(ev.petId, candidate);
      }
    }
    return map;
  }, [events, visiblePets]);

  const countByPet = useMemo(() => {
    const map = new Map<string, number>();
    for (const ev of events) {
      if (ev.deletedAt || ev.archived) continue;
      map.set(ev.petId, (map.get(ev.petId) ?? 0) + 1);
    }
    return map;
  }, [events]);

  const handleSelectCatSpecies = async () => {
    setSpeciesPickerOpen(false);
    const newPet = await createNewCatProfile('');
    navigateTo({ view: 'pet', petId: newPet.id, subView: 'profile', isNew: true });
  };

  const handlePointerDown = (e: React.PointerEvent, pet: Pet) => {
    if ((e.target as HTMLElement).closest('[data-card-action="true"], a, input')) return;
    if (moveModePetId) return;

    pointerStartRef.current = {
      petId: pet.id,
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      moved: false,
      swiping: false,
    };

    clearLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      if (pointerStartRef.current && !pointerStartRef.current.moved) {
        suppressClickRef.current = true;
        setSwipedPetId(null);
        setMenuPetId(null);
        setContextPet(pet);
      }
    }, 480);
  };

  const activePets = useMemo(() => visiblePets.filter((p) => !p.archived), [visiblePets]);
  const archivedPets = useMemo(() => visiblePets.filter((p) => p.archived), [visiblePets]);

  const movePetOrder = async (petId: string, delta: -1 | 1, groupIds: string[]) => {
    const idx = groupIds.indexOf(petId);
    const nextIdx = idx + delta;
    if (idx === -1 || nextIdx < 0 || nextIdx >= groupIds.length) return;
    const copy = [...groupIds];
    const [moved] = copy.splice(idx, 1);
    copy.splice(nextIdx, 0, moved);
    const fullOrder = visiblePets.some((p) => p.archived)
      ? [
          ...(activePets.some((p) => p.id === petId) ? copy : activePets.map((p) => p.id)),
          ...(archivedPets.some((p) => p.id === petId) ? copy : archivedPets.map((p) => p.id)),
        ]
      : copy;
    await reorderPets(fullOrder);
  };

  const swapPets = async (petAId: string, petBId: string) => {
    if (petAId === petBId) return;
    const ids = visiblePets.map((p) => p.id);
    const idxA = ids.indexOf(petAId);
    const idxB = ids.indexOf(petBId);
    if (idxA === -1 || idxB === -1) return;
    const copy = [...ids];
    copy[idxA] = petBId;
    copy[idxB] = petAId;
    await reorderPets(copy);
  };

  const handleDropPet = async (targetId: string) => {
    if (!draggedPetId || draggedPetId === targetId) return;
    const ids = visiblePets.map((p) => p.id);
    const fromIdx = ids.indexOf(draggedPetId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const copy = [...ids];
    const [moved] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, moved);
    setDraggedPetId(null);
    await reorderPets(copy);
  };

  const handleCardPrimaryClick = (pet: Pet) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (moveModePetId) {
      if (moveModePetId === pet.id) {
        setMoveModePetId(null);
      } else {
        void swapPets(moveModePetId, pet.id);
        setMoveModePetId(null);
      }
      return;
    }
    if (swipedPetId === pet.id) {
      setSwipedPetId(null);
      return;
    }
    navigateTo({ view: 'pet', petId: pet.id, subView: 'profile' });
  };

  const renderPetCard = (pet: Pet, idx: number, listLength: number, groupIds: string[]) => {
    const age = calculateAgeLabel(pet.profileFields.birthDate);
    const eventCount = countByPet.get(pet.id) ?? 0;
    const lastModified = lastUpdatedByPet.get(pet.id) ?? pet.updatedAt;
    const isSwiped = swipedPetId === pet.id;
    const translateX =
      swipeDrag?.petId === pet.id ? swipeDrag.offsetX : isSwiped ? -152 : 0;
    const isMenuOpen = menuPetId === pet.id;
    const isMoveMode = Boolean(moveModePetId);
    const isMoveTarget = moveModePetId === pet.id;

    return (
      <div
        key={pet.id}
        draggable={isMoveMode}
        onDragStart={() => setDraggedPetId(pet.id)}
        onDragOver={(e) => {
          if (isMoveMode) e.preventDefault();
        }}
        onDrop={() => {
          if (isMoveMode) void handleDropPet(pet.id);
        }}
        className={`relative rounded-2xl ${
          isSwiped || swipeDrag?.petId === pet.id ? 'overflow-hidden' : ''
        } ${isMoveTarget ? 'ring-2 ring-[var(--accent-primary)]' : ''}`}
      >
        {/* Bakomliggande åtgärdspanel vid swipe åt vänster */}
        <div
          className={`absolute inset-y-0 right-0 flex items-stretch bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-2xl overflow-hidden transition-opacity ${
            isSwiped || swipeDrag?.petId === pet.id
              ? 'opacity-100 pointer-events-auto'
              : 'opacity-0 pointer-events-none'
          }`}
          aria-hidden={!isSwiped && swipeDrag?.petId !== pet.id}
        >
          <button
            type="button"
            data-card-action="true"
            onClick={() => {
              setSwipedPetId(null);
              void archivePet(pet.id, !pet.archived);
            }}
            className="w-[76px] flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-[var(--accent-primary)] hover:bg-[var(--bg-surface-hover)] px-1"
          >
            <Archive size={16} />
            <span>{pet.archived ? 'Återställ' : 'Arkivera'}</span>
          </button>
          <button
            type="button"
            data-card-action="true"
            onClick={() => {
              setSwipedPetId(null);
              void softDeletePet(pet.id);
            }}
            className="w-[76px] flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-white bg-[var(--status-danger)] px-1"
          >
            <Trash2 size={16} />
            <span>Ta bort</span>
          </button>
        </div>

        {/* Själva profilkortet — ingen hover på kortet */}
        <section
          aria-label={pet.name}
          onPointerDown={(e) => handlePointerDown(e, pet)}
          style={{
            transform: `translateX(${translateX}px)`,
            transition:
              swipeDrag?.petId === pet.id
                ? 'none'
                : 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
            touchAction: 'pan-y',
            backgroundColor: 'var(--bg-profile-card)',
            borderColor: 'var(--border-profile-card)',
            color: 'var(--text-profile-card)',
          }}
          className={`relative border rounded-2xl p-4 pr-3 min-h-[132px] flex items-stretch justify-between gap-3 select-none ${
            pet.archived ? 'opacity-75 saturate-50 border-dashed' : ''
          }`}
        >
          <div
            role="button"
            tabIndex={0}
            onClick={() => handleCardPrimaryClick(pet)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCardPrimaryClick(pet);
              }
            }}
            className="flex-1 min-w-0 flex items-center gap-3.5 text-left rounded-xl p-1 -m-1 cursor-pointer"
            aria-label={
              isMoveMode
                ? isMoveTarget
                  ? `${pet.name} vald för flytt`
                  : `Byt plats med ${pet.name}`
                : `Öppna profil för ${pet.name}`
            }
          >
            {isMoveMode && (
              <span
                className="text-[var(--text-profile-card-muted)] shrink-0"
                aria-hidden="true"
              >
                <GripVertical size={18} />
              </span>
            )}
            <PetAvatar pet={pet} size="md" />
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold text-[var(--text-profile-card)] truncate">
                  {pet.name}
                </h2>
                {pet.archived && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--text-profile-card-muted)] shrink-0">
                    <Archive size={11} />
                    <span>Arkiverad</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[var(--text-profile-card-muted)] tabular-nums">
                <span>{pet.profileFields.breed || 'Katt'}</span>
                {age && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{age}</span>
                  </>
                )}
                <span aria-hidden="true">·</span>
                <span>{eventCount} händelser</span>
                <span aria-hidden="true">·</span>
                <span>Senast ändrad {formatDisplayDate(lastModified)}</span>
              </div>

              {isMoveMode && !isMoveTarget && (
                <p className="text-[11px] font-semibold text-[var(--palette-amber)] pt-0.5">
                  Tryck för att byta plats hit
                </p>
              )}
            </div>
          </div>

          {/* Högerkolumn */}
          {isMoveMode ? (
            <div className="flex flex-col items-center justify-center gap-1.5 shrink-0">
              <button
                type="button"
                data-card-action="true"
                disabled={idx === 0}
                onClick={() => void movePetOrder(pet.id, -1, groupIds)}
                className="min-w-[44px] min-h-[44px] rounded-full bg-[var(--bg-profile-card-control)] hover:bg-[var(--bg-profile-card-control-hover)] text-[var(--text-profile-card)] flex items-center justify-center disabled:opacity-30"
                aria-label={`Flytta ${pet.name} upp`}
              >
                <ArrowUp size={17} />
              </button>
              <button
                type="button"
                data-card-action="true"
                disabled={idx === listLength - 1}
                onClick={() => void movePetOrder(pet.id, 1, groupIds)}
                className="min-w-[44px] min-h-[44px] rounded-full bg-[var(--bg-profile-card-control)] hover:bg-[var(--bg-profile-card-control-hover)] text-[var(--text-profile-card)] flex items-center justify-center disabled:opacity-30"
                aria-label={`Flytta ${pet.name} ner`}
              >
                <ArrowDown size={17} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-end justify-between gap-2 shrink-0">
              <div className="relative">
                <button
                  type="button"
                  data-card-action="true"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSwipedPetId(null);
                    setMenuPetId(isMenuOpen ? null : pet.id);
                  }}
                  aria-haspopup="menu"
                  aria-expanded={isMenuOpen}
                  aria-label={`Alternativ för ${pet.name}`}
                  className="min-w-[44px] min-h-[44px] -mt-1 -mr-1 rounded-full hover:bg-[var(--bg-profile-card-control)] flex items-center justify-center text-[var(--text-profile-card-muted)] hover:text-[var(--text-profile-card)]"
                >
                  <MoreVertical size={18} />
                </button>

                {isMenuOpen && (
                  <div
                    role="menu"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-10 w-44 surface-elevated p-1.5 rounded-2xl shadow-xl border border-[var(--border-strong)] z-20 space-y-0.5"
                  >
                    <button
                      type="button"
                      data-card-action="true"
                      role="menuitem"
                      onClick={() => {
                        setMenuPetId(null);
                        void archivePet(pet.id, !pet.archived);
                      }}
                      className="w-full min-h-[44px] px-3 rounded-xl hover:bg-[var(--bg-surface-hover)] flex items-center gap-2.5 text-sm text-[var(--text-primary)] text-left"
                    >
                      <Archive size={15} className="text-[var(--text-muted)]" />
                      <span>{pet.archived ? 'Återställ' : 'Arkivera'}</span>
                    </button>
                    <button
                      type="button"
                      data-card-action="true"
                      role="menuitem"
                      onClick={() => {
                        setMenuPetId(null);
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

              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  data-card-action="true"
                  onClick={() =>
                    navigateTo({ view: 'pet', petId: pet.id, subView: 'overview' })
                  }
                  aria-label={`Tidslinje för ${pet.name}`}
                  title="Tidslinje"
                  className="w-11 h-11 rounded-full bg-[var(--bg-profile-card-control)] hover:bg-[var(--bg-profile-card-control-hover)] border border-[var(--border-profile-card)] text-[var(--text-profile-card)] flex items-center justify-center transition-transform active:scale-95"
                >
                  <TimelineIcon size={18} />
                </button>

                <button
                  type="button"
                  data-card-action="true"
                  onClick={() => onQuickAddEvent(pet)}
                  aria-label={`Ny händelse för ${pet.name}`}
                  title="Ny händelse"
                  className="w-11 h-11 rounded-full bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)] flex items-center justify-center transition-transform active:scale-95"
                >
                  <Plus size={20} strokeWidth={2.4} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">
          Mina djur
        </h1>
        {moveModePetId && (
          <button
            type="button"
            onClick={() => setMoveModePetId(null)}
            className="btn-pill px-4 py-2 text-xs font-semibold bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)]"
          >
            Klar med flytt
          </button>
        )}
      </div>

      {moveModePetId && (
        <div
          role="status"
          className="surface-elevated px-4 py-2.5 text-xs text-[var(--text-secondary)] flex items-center justify-between gap-2"
        >
          <span>
            Flytta-läge aktivt: använd pilarna, dra kortet eller tryck på ett annat kort för att byta plats.
          </span>
        </div>
      )}

      {visiblePets.length === 0 ? (
        <div className="surface-card p-8 text-center space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Inga aktiva djurprofiler ännu. Lägg till ditt första djur för att komma igång.
          </p>
        </div>
      ) : (
        <>
          {activePets.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-[repeat(auto-fit,minmax(360px,1fr))] gap-4">
              {activePets.map((pet, idx) =>
                renderPetCard(
                  pet,
                  idx,
                  activePets.length,
                  activePets.map((p) => p.id)
                )
              )}
            </div>
          )}

          {archivedPets.length > 0 && (
            <section
              aria-label="Arkiverade djur"
              className={
                activePets.length > 0
                  ? 'mt-8 pt-6 border-t border-dashed border-[var(--border-hairline)] space-y-3'
                  : 'space-y-3'
              }
            >
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[var(--text-muted)] px-1">
                <Archive size={14} />
                <span>Arkiverade djur</span>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {archivedPets.map((pet, idx) =>
                  renderPetCard(
                    pet,
                    idx,
                    archivedPets.length,
                    archivedPets.map((p) => p.id)
                  )
                )}
              </div>
            </section>
          )}
        </>
      )}

      {/* Knappen "+ Lägg till nytt djur" centrerad under alla profiler */}
      <div className="flex justify-center pt-1">
        <button
          type="button"
          onClick={() => setSpeciesPickerOpen(true)}
          className="btn-pill px-6 py-3 text-sm font-semibold bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)] inline-flex items-center gap-2 whitespace-nowrap"
        >
          <Plus size={18} />
          <span>Lägg till nytt djur</span>
        </button>
      </div>

      {/* Modal "Välj art" */}
      {speciesPickerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Välj art"
          className="fixed inset-0 z-50 bg-[var(--bg-scrim)] backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSpeciesPickerOpen(false)}
        >
          <div
            className="surface-card w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Välj art</h2>
              <button
                type="button"
                onClick={() => setSpeciesPickerOpen(false)}
                className="min-w-[44px] min-h-[44px] rounded-full hover:bg-[var(--bg-surface-hover)] flex items-center justify-center text-[var(--text-primary)]"
                aria-label="Stäng"
              >
                <X size={20} />
              </button>
            </div>

            <div role="list" className="space-y-2">
              <button
                type="button"
                role="listitem"
                onClick={() => void handleSelectCatSpecies()}
                className="w-full flex items-center gap-4 px-4 py-3 text-left min-h-[64px] rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-input)] hover:bg-[var(--bg-surface-hover)] transition-colors"
              >
                <StylizedCatIllustration className="w-12 h-12 shrink-0" />
                <span className="text-base font-semibold text-[var(--text-primary)]">Katt</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Långtryckskontextmeny för profilkort */}
      {contextPet && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Åtgärder för ${contextPet.name}`}
          className="fixed inset-0 z-50 bg-[var(--bg-scrim)] backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setContextPet(null)}
        >
          <div
            className="surface-card w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl p-5 space-y-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-[var(--text-primary)] pb-1 truncate">
              {contextPet.name}
            </h3>
            <button
              type="button"
              onClick={() => {
                const target = contextPet;
                setContextPet(null);
                setMoveModePetId(target.id);
              }}
              className="btn-pill w-full px-4 py-3 text-sm font-medium bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] text-[var(--text-primary)] inline-flex items-center gap-2.5 text-left"
            >
              <GripVertical size={16} className="text-[var(--text-muted)]" />
              <span>Flytta / byt plats</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const target = contextPet;
                setContextPet(null);
                void softDeletePet(target.id);
              }}
              className="btn-pill w-full px-4 py-3 text-sm font-semibold text-[var(--status-danger)] bg-[var(--bg-surface-elevated)] hover:bg-[var(--bg-surface-hover)] inline-flex items-center gap-2.5 text-left"
            >
              <Trash2 size={16} />
              <span>Ta bort</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
