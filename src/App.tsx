import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Book,
  Check,
  Home,
  PawPrint,
  Redo2,
  Settings,
  Undo2,
} from 'lucide-react';
import { calculateAgeLabel } from './utils/formatters';
import { PetAvatar } from './components/common/PetAvatar';
import { TimelineIcon } from './components/icons/PetIllustrations';
import { CategoryPickerModal } from './components/modals/CategoryManagerModal';
import { EventEditorModal } from './components/modals/EventEditorModal';
import {
  CategoryFilterModal,
  ExportImportModal,
  SettingsModal,
  TimePeriodModal,
} from './components/modals/OverflowModals';
import { AllAnimalsView } from './components/views/AllAnimalsView';
import { LandingPageView } from './components/views/LandingPageView';
import { PetProfileView } from './components/views/PetProfileView';
import { TimelineOverviewView } from './components/views/TimelineOverviewView';
import { useApp } from './context/AppContext';
import { Category, DiaryEvent, Pet } from './types/models';

export default function App() {
  const {
    isLoading,
    loadError,
    reloadAll,
    pets,
    visiblePets,
    categories,
    route,
    navigateTo,
    canGoBack,
    goBack,
    saveBadgeVisible,
    snackbar,
    dismissSnackbar,
    canUndo,
    canRedo,
    undo,
    redo,
    unsavedPrompt,
    confirmLeaveUnsaved,
    cancelLeaveUnsaved,
  } = useApp();

  const [categoryFilterModalOpen, setCategoryFilterModalOpen] = useState(false);
  const [timePeriodModalOpen, setTimePeriodModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  const [categoryPickerState, setCategoryPickerState] = useState<{
    pet: Pet;
    fromProfile: boolean;
  } | null>(null);
  const [editorState, setEditorState] = useState<{
    pet: Pet;
    category: Category;
    existingEvent: DiaryEvent | null;
    redirectTimelineOnSave?: boolean;
  } | null>(null);

  // Alla sidor ska öppnas längst upp och filterfält/modaler ska vara stängda
  useEffect(() => {
    setCategoryFilterModalOpen(false);
    setTimePeriodModalOpen(false);
    if (route.view === 'pet' && route.highlightEventId) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [
    route.view,
    route.view === 'pet' ? route.petId : '',
    route.view === 'pet' ? route.subView : '',
    route.view === 'pet' ? Boolean(route.isNew) : false,
  ]);

  const activePet = useMemo(() => {
    if (route.view === 'pet') {
      return pets.find((p) => p.id === route.petId) ?? null;
    }
    return null;
  }, [pets, route]);

  const filterTargetPet = activePet ?? visiblePets[0] ?? pets[0] ?? null;

  const openEditEvent = (pet: Pet, ev: DiaryEvent) => {
    const cat = categories.find((c) => c.id === ev.categoryId) ?? categories[0];
    if (!cat) return;
    setEditorState({ pet, category: cat, existingEvent: ev });
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--bg-canvas)] text-[var(--text-primary)] p-6">
        <p className="text-sm font-medium text-[var(--text-secondary)]">
          Läser in Djurdagbok…
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[var(--bg-canvas)] text-[var(--text-primary)] p-6">
        <div className="surface-card p-6 max-w-md w-full space-y-4 text-center">
          <h1 className="text-lg font-bold">Kunde inte starta databasen</h1>
          <p className="text-sm text-[var(--status-danger)]">{loadError}</p>
          <button
            type="button"
            onClick={() => void reloadAll()}
            className="btn-pill px-5 py-2.5 text-sm font-semibold bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)]"
          >
            Försök igen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      {/* Kompakt toppbar (<= 56 px) med ikon-bakåtknapp + Djurdagbok-länk */}
      <header className="sticky top-0 z-30 h-14 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 backdrop-blur-md">
        <div className="max-w-5xl mx-auto h-full px-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {canGoBack && (
              <button
                type="button"
                onClick={goBack}
                aria-label="Tillbaka"
                title="Tillbaka"
                className="min-w-[44px] min-h-[44px] -ml-2 rounded-full hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] inline-flex items-center justify-center shrink-0 transition-colors"
              >
                <ArrowLeft size={19} />
              </button>
            )}

            <button
              type="button"
              onClick={() => navigateTo({ view: 'landing' })}
              className="text-lg font-bold tracking-tight text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap shrink-0 min-h-[44px] inline-flex items-center gap-2"
            >
              <Book size={20} className="text-[var(--accent-primary)] shrink-0" aria-hidden="true" />
              <span>Djurdagbok</span>
            </button>

            {saveBadgeVisible && (
              <span
                role="status"
                aria-live="polite"
                className="text-xs font-medium text-[var(--status-success)] inline-flex items-center gap-1 whitespace-nowrap"
              >
                <span>Sparat</span>
                <Check size={13} />
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {(canUndo || canRedo) && (
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  disabled={!canUndo}
                  onClick={() => void undo()}
                  className="min-w-[44px] min-h-[44px] rounded-full hover:bg-[var(--bg-surface-hover)] flex items-center justify-center disabled:opacity-30"
                  aria-label="Ångra"
                  title="Ångra"
                >
                  <Undo2 size={18} />
                </button>
                <button
                  type="button"
                  disabled={!canRedo}
                  onClick={() => void redo()}
                  className="min-w-[44px] min-h-[44px] rounded-full hover:bg-[var(--bg-surface-hover)] flex items-center justify-center disabled:opacity-30"
                  aria-label="Gör om"
                  title="Gör om"
                >
                  <Redo2 size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Huvudinnehåll */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 pt-5 pb-40">
        {route.view === 'landing' && <LandingPageView />}

        {route.view === 'all-animals' && (
          <AllAnimalsView
            onQuickAddEvent={(pet) => setCategoryPickerState({ pet, fromProfile: false })}
          />
        )}

        {route.view === 'pet' && activePet && (
          <div className="space-y-5">
            {/* Djurvy-rubrik & växlare mellan Tidslinje och Profil (dold i nytt djur-läge) */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <PetAvatar pet={activePet} size="sm" />
                <div className="min-w-0">
                  <h1 className="text-xl font-bold text-[var(--text-primary)] truncate">
                    {route.isNew && !activePet.profileFields.name.trim()
                      ? 'Nytt djur'
                      : activePet.name}
                  </h1>
                  <p className="text-xs text-[var(--text-muted)] truncate">
                    {[
                      'Katt',
                      calculateAgeLabel(activePet.profileFields.birthDate),
                      activePet.archived ? 'Arkiverad' : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </div>

              {!route.isNew && (
                <div
                  role="tablist"
                  aria-label="Välj vy för djuret"
                  className="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-[var(--bg-surface)] border border-[var(--border-hairline)]"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={route.subView === 'overview'}
                    aria-label="Tidslinje"
                    title="Tidslinje"
                    onClick={() =>
                      navigateTo({ view: 'pet', petId: activePet.id, subView: 'overview' })
                    }
                    className={`btn-pill min-w-[40px] min-h-[36px] px-3 py-1 inline-flex items-center justify-center ${
                      route.subView === 'overview'
                        ? 'bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <TimelineIcon size={16} />
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={route.subView === 'profile'}
                    aria-label="Profil"
                    title="Profil"
                    onClick={() =>
                      navigateTo({ view: 'pet', petId: activePet.id, subView: 'profile' })
                    }
                    className={`btn-pill min-w-[40px] min-h-[36px] px-3 py-1 inline-flex items-center justify-center ${
                      route.subView === 'profile'
                        ? 'bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <PawPrint size={16} />
                  </button>
                </div>
              )}
            </div>

            {!route.isNew && route.subView === 'overview' ? (
              <TimelineOverviewView
                pet={activePet}
                highlightEventId={route.highlightEventId}
                onAddEvent={() => setCategoryPickerState({ pet: activePet, fromProfile: false })}
                onEditEvent={(ev) => openEditEvent(activePet, ev)}
                onOpenCategoryFilter={() => setCategoryFilterModalOpen(true)}
                onOpenTimeFilter={() => setTimePeriodModalOpen(true)}
              />
            ) : (
              <PetProfileView
                pet={activePet}
                isNewPet={Boolean(route.isNew)}
                onAddEvent={() => setCategoryPickerState({ pet: activePet, fromProfile: true })}
                onFinishCreate={() =>
                  navigateTo(
                    { view: 'pet', petId: activePet.id, subView: 'profile', isNew: false },
                    true
                  )
                }
              />
            )}
          </div>
        )}
      </main>

      {/* Snackbar med Ångra (5–8 sek) eller Försök igen vid sparfel */}
      {snackbar && (
        <div
          role={snackbar.isError ? 'alert' : 'status'}
          aria-live="polite"
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md surface-elevated px-4 py-3 shadow-lg flex items-center justify-between gap-3 border border-[var(--border-strong)]"
        >
          <span
            className={`text-sm font-medium ${
              snackbar.isError ? 'text-[var(--status-danger)]' : 'text-[var(--text-primary)]'
            }`}
          >
            {snackbar.message}
          </span>
          <div className="flex items-center gap-2 shrink-0">
            {snackbar.canUndo && (
              <button
                type="button"
                onClick={() => void undo()}
                className="btn-pill px-4 py-1.5 text-xs font-bold bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)]"
              >
                Ångra
              </button>
            )}
            {snackbar.retryAction && (
              <button
                type="button"
                onClick={() => void snackbar.retryAction?.()}
                className="btn-pill px-4 py-1.5 text-xs font-bold bg-[var(--accent-primary-fill)] text-[var(--accent-primary-fg)]"
              >
                Försök igen
              </button>
            )}
            <button
              type="button"
              onClick={dismissSnackbar}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 min-h-[36px]"
            >
              Stäng
            </button>
          </div>
        </div>
      )}

      {/* Bottenmeny: Hem, Mina djur, Inställningar */}
      <nav
        aria-label="Huvudnavigering"
        className="fixed bottom-0 left-0 right-0 z-30 border-t border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      >
        <div className="max-w-5xl mx-auto px-2 h-16 grid grid-cols-3 items-center gap-1">
          <button
            type="button"
            onClick={() => navigateTo({ view: 'landing' })}
            aria-current={route.view === 'landing' && !settingsModalOpen ? 'page' : undefined}
            className={`min-h-[48px] px-2 py-1.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
              route.view === 'landing' && !settingsModalOpen
                ? 'text-[var(--accent-primary)] font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Home size={20} />
            <span className="text-[11px] leading-none whitespace-nowrap">Hem</span>
          </button>

          <button
            type="button"
            onClick={() => navigateTo({ view: 'all-animals' })}
            aria-current={
              (route.view === 'all-animals' || route.view === 'pet') && !settingsModalOpen
                ? 'page'
                : undefined
            }
            className={`min-h-[48px] px-2 py-1.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
              (route.view === 'all-animals' || route.view === 'pet') && !settingsModalOpen
                ? 'text-[var(--accent-primary)] font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <PawPrint size={20} />
            <span className="text-[11px] leading-none whitespace-nowrap">Mina djur</span>
          </button>

          <button
            type="button"
            onClick={() => setSettingsModalOpen(true)}
            aria-current={settingsModalOpen ? 'page' : undefined}
            className={`min-h-[48px] px-2 py-1.5 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
              settingsModalOpen
                ? 'text-[var(--accent-primary)] font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Settings size={20} />
            <span className="text-[11px] leading-none whitespace-nowrap">Inställningar</span>
          </button>
        </div>
      </nav>

      {/* Varning om användaren försöker navigera bort från ett osparat formulär */}
      {unsavedPrompt.isOpen && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label="Osparade ändringar"
          className="fixed inset-0 z-50 bg-[var(--bg-scrim)] backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="surface-card max-w-sm w-full p-5 space-y-4">
            <h2 className="text-base font-semibold text-[var(--text-primary)]">
              Osparade ändringar
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Du har osparade ändringar i ett formulär. Vill du lämna sidan utan att spara?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelLeaveUnsaved}
                className="btn-pill px-4 py-2 text-sm font-medium bg-[var(--bg-surface-elevated)] text-[var(--text-primary)]"
              >
                Stanna kvar
              </button>
              <button
                type="button"
                onClick={confirmLeaveUnsaved}
                className="btn-pill px-4 py-2 text-sm font-semibold bg-[var(--status-danger)] text-white"
              >
                Lämna ändå
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modaler */}
      <CategoryFilterModal
        pet={filterTargetPet}
        isOpen={categoryFilterModalOpen}
        onClose={() => setCategoryFilterModalOpen(false)}
      />

      <TimePeriodModal
        pet={filterTargetPet}
        isOpen={timePeriodModalOpen}
        onClose={() => setTimePeriodModalOpen(false)}
      />

      <ExportImportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
      />

      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        onOpenExport={() => {
          setSettingsModalOpen(false);
          setExportModalOpen(true);
        }}
      />

      <CategoryPickerModal
        isOpen={Boolean(categoryPickerState)}
        pet={categoryPickerState?.pet ?? null}
        onSelectCategory={(cat) => {
          if (!categoryPickerState) return;
          const { pet: targetPet, fromProfile } = categoryPickerState;
          setCategoryPickerState(null);
          setEditorState({
            pet: targetPet,
            category: cat,
            existingEvent: null,
            redirectTimelineOnSave: fromProfile,
          });
        }}
        onClose={() => setCategoryPickerState(null)}
      />

      <EventEditorModal
        isOpen={Boolean(editorState)}
        pet={editorState?.pet ?? null}
        category={editorState?.category ?? null}
        existingEvent={editorState?.existingEvent ?? null}
        onClose={() => setEditorState(null)}
        onSaved={() => {
          if (editorState?.redirectTimelineOnSave && editorState.pet) {
            navigateTo({ view: 'pet', petId: editorState.pet.id, subView: 'overview' }, true);
          }
        }}
      />
    </div>
  );
}

