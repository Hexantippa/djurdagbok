import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { dataService } from '../services/dataService';
import {
  AppSettings,
  Category,
  DiaryEvent,
  MediaAsset,
  MediaKind,
  Pet,
  UndoCommand,
} from '../types/models';
import { generateId, getTodayIsoDate } from '../utils/formatters';

export type PetSubView = 'overview' | 'profile';

export type ActiveRoute =
  | { view: 'landing' }
  | { view: 'all-animals' }
  | { view: 'pet'; petId: string; subView: PetSubView; highlightEventId?: string; isNew?: boolean };

interface SnackbarState {
  id: string;
  message: string;
  canUndo: boolean;
  isError?: boolean;
  retryAction?: () => Promise<void>;
}

interface UnsavedPromptState {
  isOpen: boolean;
  pendingAction: (() => void) | null;
}

interface AppContextValue {
  isLoading: boolean;
  loadError: string | null;
  userId: string;
  settings: AppSettings;
  pets: Pet[];
  visiblePets: Pet[];
  categories: Category[];
  events: DiaryEvent[];
  mediaMap: Map<string, MediaAsset>;
  route: ActiveRoute;
  saveBadgeVisible: boolean;
  snackbar: SnackbarState | null;
  canUndo: boolean;
  canRedo: boolean;
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  unsavedPrompt: UnsavedPromptState;
  confirmLeaveUnsaved: () => void;
  cancelLeaveUnsaved: () => void;

  navigateTo: (route: ActiveRoute, bypassDirtyCheck?: boolean) => void;
  canGoBack: boolean;
  goBack: () => void;
  reloadAll: () => Promise<void>;
  retryLastSave: () => Promise<void>;

  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  createNewCatProfile: (initialName?: string) => Promise<Pet>;
  savePet: (pet: Pet, recordUndo?: boolean, undoLabel?: string) => Promise<void>;
  reorderPets: (orderedPetIds: string[]) => Promise<void>;
  archivePet: (petId: string, archive: boolean) => Promise<void>;
  softDeletePet: (petId: string) => Promise<void>;

  saveCategory: (category: Category) => Promise<void>;
  touchCategoryUsage: (categoryId: string) => Promise<void>;

  saveEvent: (event: DiaryEvent, isNew?: boolean) => Promise<void>;
  reorderEvents: (updatedEvents: DiaryEvent[]) => Promise<void>;
  archiveEvent: (eventId: string, archive: boolean) => Promise<void>;
  softDeleteEvent: (eventId: string) => Promise<void>;

  uploadMedia: (file: File, kind: MediaKind, petId: string) => Promise<MediaAsset>;
  deleteMedia: (id: string) => Promise<void>;

  exportBackupZip: () => Promise<void>;
  importBackupZip: (file: File) => Promise<void>;

  undo: () => Promise<void>;
  redo: () => Promise<void>;
  dismissSnackbar: () => void;
  triggerSaveBadge: () => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  id: 'app_settings',
  userId: '',
  theme: 'dark',
  largeText: false,
  highContrast: true,
  hideArchived: true,
  weightChartTitle: 'Viktkurva',
  showWeightTrendline: false,
  updatedAt: new Date().toISOString(),
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [pets, setPets] = useState<Pet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [events, setEvents] = useState<DiaryEvent[]>([]);
  const [mediaList, setMediaList] = useState<MediaAsset[]>([]);
  const [route, setRoute] = useState<ActiveRoute>({ view: 'landing' });
  const [historyStack, setHistoryStack] = useState<ActiveRoute[]>([]);

  const [saveBadgeVisible, setSaveBadgeVisible] = useState(false);
  const saveBadgeTimerRef = useRef<number | null>(null);

  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);
  const snackbarTimerRef = useRef<number | null>(null);

  const [undoStack, setUndoStack] = useState<UndoCommand[]>([]);
  const [redoStack, setRedoStack] = useState<UndoCommand[]>([]);

  const [isDirty, setIsDirty] = useState(false);
  const [unsavedPrompt, setUnsavedPrompt] = useState<UnsavedPromptState>({
    isOpen: false,
    pendingAction: null,
  });

  const lastFailedOpRef = useRef<(() => Promise<void>) | null>(null);

  const applyThemeAndAccessibility = useCallback((s: AppSettings) => {
    const root = document.documentElement;
    const prefersDark =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    const useDark = s.theme === 'dark' || (s.theme === 'system' && prefersDark);

    if (useDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    root.setAttribute('data-large-text', s.largeText ? 'true' : 'false');
    root.setAttribute('data-contrast', s.highContrast ? 'high' : 'normal');
  }, []);

  useEffect(() => {
    applyThemeAndAccessibility(settings);
    if (settings.theme !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => applyThemeAndAccessibility(settings);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [settings, applyThemeAndAccessibility]);

  const reloadAll = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const snap = await dataService.initialize();
      setUserId(snap.userId);
      setSettings(snap.settings);
      setPets(snap.pets);
      setCategories(snap.categories);
      setEvents(snap.events);
      setMediaList(snap.media);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Kunde inte ladda lokal data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

  const triggerSaveBadge = useCallback(() => {
    if (saveBadgeTimerRef.current) {
      window.clearTimeout(saveBadgeTimerRef.current);
    }
    setSaveBadgeVisible(true);
    saveBadgeTimerRef.current = window.setTimeout(() => {
      setSaveBadgeVisible(false);
    }, 2200);
  }, []);

  const showSnackbar = useCallback(
    (message: string, options?: { canUndo?: boolean; isError?: boolean; retryAction?: () => Promise<void> }) => {
      if (snackbarTimerRef.current) {
        window.clearTimeout(snackbarTimerRef.current);
      }
      setSnackbar({
        id: generateId(),
        message,
        canUndo: Boolean(options?.canUndo),
        isError: Boolean(options?.isError),
        retryAction: options?.retryAction,
      });
      if (!options?.isError) {
        snackbarTimerRef.current = window.setTimeout(() => {
          setSnackbar(null);
        }, 6500);
      }
    },
    []
  );

  const dismissSnackbar = useCallback(() => {
    if (snackbarTimerRef.current) {
      window.clearTimeout(snackbarTimerRef.current);
    }
    setSnackbar(null);
  }, []);

  const pushUndo = useCallback((cmd: UndoCommand) => {
    setUndoStack((prev) => [...prev.slice(-24), cmd]);
    setRedoStack([]);
  }, []);

  const runSafeWrite = useCallback(
    async (op: () => Promise<void>, showSaved = true) => {
      try {
        lastFailedOpRef.current = op;
        await op();
        lastFailedOpRef.current = null;
        if (showSaved) {
          triggerSaveBadge();
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Sparningen misslyckades.';
        showSnackbar(`Kunde inte spara: ${msg}`, {
          isError: true,
          retryAction: async () => {
            await runSafeWrite(op, showSaved);
            dismissSnackbar();
          },
        });
        throw err;
      }
    },
    [dismissSnackbar, showSnackbar, triggerSaveBadge]
  );

  const retryLastSave = useCallback(async () => {
    if (lastFailedOpRef.current) {
      await runSafeWrite(lastFailedOpRef.current, true);
      dismissSnackbar();
    }
  }, [dismissSnackbar, runSafeWrite]);

  const isSameRoute = (a: ActiveRoute, b: ActiveRoute): boolean => {
    if (a.view !== b.view) return false;
    if (a.view === 'pet' && b.view === 'pet') {
      return a.petId === b.petId && a.subView === b.subView && Boolean(a.isNew) === Boolean(b.isNew);
    }
    return true;
  };

  const navigateTo = useCallback(
    (nextRoute: ActiveRoute, bypassDirtyCheck = false) => {
      const performNav = () => {
        setRoute((prev) => {
          if (!isSameRoute(prev, nextRoute)) {
            setHistoryStack((hist) => [...hist.slice(-20), prev]);
          }
          return nextRoute;
        });
      };

      if (!bypassDirtyCheck && isDirty) {
        setUnsavedPrompt({
          isOpen: true,
          pendingAction: () => {
            setIsDirty(false);
            performNav();
          },
        });
        return;
      }
      performNav();
    },
    [isDirty]
  );

  const canGoBack = historyStack.length > 0 || route.view !== 'landing';

  const goBack = useCallback(() => {
    const performBack = () => {
      if (historyStack.length > 0) {
        const previous = historyStack[historyStack.length - 1];
        setHistoryStack((hist) => hist.slice(0, -1));
        setRoute(previous);
        return;
      }
      if (route.view === 'pet') {
        setRoute({ view: 'all-animals' });
      } else {
        setRoute({ view: 'landing' });
      }
    };

    if (isDirty) {
      setUnsavedPrompt({
        isOpen: true,
        pendingAction: () => {
          setIsDirty(false);
          performBack();
        },
      });
      return;
    }
    performBack();
  }, [historyStack, isDirty, route.view]);

  const confirmLeaveUnsaved = useCallback(() => {
    const action = unsavedPrompt.pendingAction;
    setUnsavedPrompt({ isOpen: false, pendingAction: null });
    if (action) action();
  }, [unsavedPrompt]);

  const cancelLeaveUnsaved = useCallback(() => {
    setUnsavedPrompt({ isOpen: false, pendingAction: null });
  }, []);

  const updateSettings = useCallback(
    async (patch: Partial<AppSettings>) => {
      const next = { ...settings, ...patch, updatedAt: new Date().toISOString() };
      setSettings(next);
      await runSafeWrite(async () => {
        await dataService.saveSettings(next);
      }, true);
    },
    [runSafeWrite, settings]
  );

  const createNewCatProfile = useCallback(
    async (initialName = ''): Promise<Pet> => {
      const now = new Date().toISOString();
      const displayName = initialName.trim() || 'Ny katt';
      const pet: Pet = {
        id: generateId(),
        userId,
        name: displayName,
        species: 'cat',
        avatarType: 'paw',
        archived: false,
        deletedAt: null,
        profileFields: {
          name: initialName,
          birthDate: '',
          sex: '',
          breed: '',
          colorPattern: '',
          microchipNumber: '',
          neutered: '',
          insurance: '',
          insuranceCompany: '',
          insuranceNumber: '',
          website: '',
          veterinarian: '',
          allergies: '',
          diet: '',
          conditions: '',
          personalNotes: '',
          otherNotes: '',
          basicComment: '',
          healthNote: '',
          basicImageIds: [],
          basicDocumentIds: [],
          healthImageIds: [],
          healthDocumentIds: [],
        },
        sections: [],
        filterPrefs: {
          enabledCategoryIds: null,
          timePreset: 'all_time',
        },
        order: pets.length,
        createdAt: now,
        updatedAt: now,
      };
      setPets((prev) => [...prev, pet]);
      await runSafeWrite(async () => {
        await dataService.savePet(pet);
      }, true);
      return pet;
    },
    [pets.length, runSafeWrite, userId]
  );

  const savePet = useCallback(
    async (pet: Pet, recordUndo = false, undoLabel = 'Ändring sparad') => {
      const prevPet = pets.find((p) => p.id === pet.id);
      const syncedPet: Pet = {
        ...pet,
        name: pet.profileFields.name.trim() || pet.name || 'Namnlös katt',
      };
      setPets((prev) => {
        const exists = prev.some((p) => p.id === syncedPet.id);
        return exists ? prev.map((p) => (p.id === syncedPet.id ? syncedPet : p)) : [...prev, syncedPet];
      });
      await runSafeWrite(async () => {
        await dataService.savePet(syncedPet);
      }, true);

      if (recordUndo && prevPet) {
        pushUndo({
          id: generateId(),
          label: undoLabel,
          undo: async () => {
            setPets((prev) => prev.map((p) => (p.id === prevPet.id ? prevPet : p)));
            await dataService.savePet(prevPet);
          },
          redo: async () => {
            setPets((prev) => prev.map((p) => (p.id === syncedPet.id ? syncedPet : p)));
            await dataService.savePet(syncedPet);
          },
        });
      }
    },
    [pets, pushUndo, runSafeWrite]
  );

  const reorderPets = useCallback(
    async (orderedPetIds: string[]) => {
      const orderLookup = new Map<string, number>();
      orderedPetIds.forEach((id, idx) => orderLookup.set(id, idx));
      const prevPets = pets;
      const updatedPets = pets.map((p) => {
        const nextOrder = orderLookup.get(p.id);
        return nextOrder !== undefined ? { ...p, order: nextOrder } : p;
      });
      setPets(updatedPets);
      await runSafeWrite(async () => {
        for (const p of updatedPets) {
          if (orderLookup.has(p.id)) {
            await dataService.savePet(p);
          }
        }
      }, true);
      pushUndo({
        id: generateId(),
        label: 'Profilordning ändrad',
        undo: async () => {
          setPets(prevPets);
          for (const p of prevPets) {
            await dataService.savePet(p);
          }
        },
        redo: async () => {
          setPets(updatedPets);
          for (const p of updatedPets) {
            await dataService.savePet(p);
          }
        },
      });
    },
    [pets, pushUndo, runSafeWrite]
  );

  const archivePet = useCallback(
    async (petId: string, archive: boolean) => {
      const target = pets.find((p) => p.id === petId);
      if (!target) return;
      const updated = { ...target, archived: archive };
      setPets((prev) => prev.map((p) => (p.id === petId ? updated : p)));
      if (archive && settings.hideArchived && route.view === 'pet' && route.petId === petId) {
        setRoute({ view: 'all-animals' });
      }

      await runSafeWrite(async () => {
        await dataService.savePet(updated);
      }, false);

      const label = archive ? `${target.name} arkiverades` : `${target.name} återställdes från arkiv`;
      pushUndo({
        id: generateId(),
        label,
        undo: async () => {
          setPets((prev) => prev.map((p) => (p.id === petId ? target : p)));
          await dataService.savePet(target);
        },
        redo: async () => {
          setPets((prev) => prev.map((p) => (p.id === petId ? updated : p)));
          await dataService.savePet(updated);
        },
      });
      showSnackbar(label, { canUndo: true });
    },
    [pets, pushUndo, route, runSafeWrite, settings.hideArchived, showSnackbar]
  );

  const softDeletePet = useCallback(
    async (petId: string) => {
      const target = pets.find((p) => p.id === petId);
      if (!target) return;
      const deleted: Pet = { ...target, deletedAt: new Date().toISOString() };
      setPets((prev) => prev.filter((p) => p.id !== petId));
      if (route.view === 'pet' && route.petId === petId) {
        setRoute({ view: 'all-animals' });
      }

      await runSafeWrite(async () => {
        await dataService.savePet(deleted);
      }, false);

      const label = `${target.name} togs bort`;
      pushUndo({
        id: generateId(),
        label,
        undo: async () => {
          setPets((prev) => [...prev, target]);
          await dataService.savePet(target);
        },
        redo: async () => {
          setPets((prev) => prev.filter((p) => p.id !== petId));
          await dataService.savePet(deleted);
        },
      });
      showSnackbar(label, { canUndo: true });
    },
    [pets, pushUndo, route, runSafeWrite, showSnackbar]
  );

  const saveCategory = useCallback(
    async (category: Category) => {
      const saved = { ...category, userId: category.userId || userId };
      setCategories((prev) => {
        const exists = prev.some((c) => c.id === saved.id);
        const next = exists ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved];
        return next.sort((a, b) => a.order - b.order);
      });
      await runSafeWrite(async () => {
        await dataService.saveCategory(saved);
      }, true);
    },
    [runSafeWrite, userId]
  );

  const touchCategoryUsage = useCallback(
    async (categoryId: string) => {
      const cat = categories.find((c) => c.id === categoryId);
      if (!cat) return;
      const updated: Category = { ...cat, lastUsedAt: new Date().toISOString() };
      setCategories((prev) => prev.map((c) => (c.id === categoryId ? updated : c)));
      await dataService.saveCategory(updated);
    },
    [categories]
  );

  const saveEvent = useCallback(
    async (event: DiaryEvent, isNew = false) => {
      const prevEvent = events.find((e) => e.id === event.id);
      const saved: DiaryEvent = {
        ...event,
        userId: event.userId || userId,
        date: event.date || getTodayIsoDate(),
      };
      setEvents((prev) => {
        const exists = prev.some((e) => e.id === saved.id);
        return exists ? prev.map((e) => (e.id === saved.id ? saved : e)) : [...prev, saved];
      });
      await runSafeWrite(async () => {
        await dataService.saveEvent(saved);
        const ownerPet = pets.find((p) => p.id === saved.petId);
        if (ownerPet) {
          const bumpedPet = { ...ownerPet, updatedAt: new Date().toISOString() };
          setPets((prev) => prev.map((p) => (p.id === bumpedPet.id ? bumpedPet : p)));
          await dataService.savePet(bumpedPet);
        }
      }, true);
      await touchCategoryUsage(saved.categoryId);

      if (isNew) {
        const deletedCopy: DiaryEvent = { ...saved, deletedAt: new Date().toISOString() };
        pushUndo({
          id: generateId(),
          label: 'Händelse skapad',
          undo: async () => {
            setEvents((prev) => prev.filter((e) => e.id !== saved.id));
            await dataService.saveEvent(deletedCopy);
          },
          redo: async () => {
            setEvents((prev) => [...prev, saved]);
            await dataService.saveEvent(saved);
          },
        });
      } else if (prevEvent) {
        pushUndo({
          id: generateId(),
          label: 'Händelse uppdaterad',
          undo: async () => {
            setEvents((prev) => prev.map((e) => (e.id === prevEvent.id ? prevEvent : e)));
            await dataService.saveEvent(prevEvent);
          },
          redo: async () => {
            setEvents((prev) => prev.map((e) => (e.id === saved.id ? saved : e)));
            await dataService.saveEvent(saved);
          },
        });
      }
    },
    [events, pets, pushUndo, runSafeWrite, touchCategoryUsage, userId]
  );

  const reorderEvents = useCallback(
    async (updatedEvents: DiaryEvent[]) => {
      if (updatedEvents.length === 0) return;
      const lookup = new Map(updatedEvents.map((e) => [e.id, e]));
      const prevEvents = events;
      setEvents((prev) => prev.map((e) => lookup.get(e.id) ?? e));
      await runSafeWrite(async () => {
        for (const ev of updatedEvents) {
          await dataService.saveEvent(ev);
        }
      }, true);
      pushUndo({
        id: generateId(),
        label: 'Händelseordning ändrad',
        undo: async () => {
          setEvents(prevEvents);
          for (const ev of updatedEvents) {
            const orig = prevEvents.find((p) => p.id === ev.id);
            if (orig) await dataService.saveEvent(orig);
          }
        },
        redo: async () => {
          setEvents((prev) => prev.map((e) => lookup.get(e.id) ?? e));
          for (const ev of updatedEvents) {
            await dataService.saveEvent(ev);
          }
        },
      });
    },
    [events, pushUndo, runSafeWrite]
  );

  const archiveEvent = useCallback(
    async (eventId: string, archive: boolean) => {
      const target = events.find((e) => e.id === eventId);
      if (!target) return;
      const updated = { ...target, archived: archive };
      setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));

      await runSafeWrite(async () => {
        await dataService.saveEvent(updated);
      }, false);

      const label = archive ? 'Händelse arkiverades' : 'Händelse återställdes';
      pushUndo({
        id: generateId(),
        label,
        undo: async () => {
          setEvents((prev) => prev.map((e) => (e.id === eventId ? target : e)));
          await dataService.saveEvent(target);
        },
        redo: async () => {
          setEvents((prev) => prev.map((e) => (e.id === eventId ? updated : e)));
          await dataService.saveEvent(updated);
        },
      });
      showSnackbar(label, { canUndo: true });
    },
    [events, pushUndo, runSafeWrite, showSnackbar]
  );

  const softDeleteEvent = useCallback(
    async (eventId: string) => {
      const target = events.find((e) => e.id === eventId);
      if (!target) return;
      const deleted: DiaryEvent = { ...target, deletedAt: new Date().toISOString() };
      setEvents((prev) => prev.filter((e) => e.id !== eventId));

      await runSafeWrite(async () => {
        await dataService.saveEvent(deleted);
      }, false);

      const label = 'Händelse togs bort';
      pushUndo({
        id: generateId(),
        label,
        undo: async () => {
          setEvents((prev) => [...prev, target]);
          await dataService.saveEvent(target);
        },
        redo: async () => {
          setEvents((prev) => prev.filter((e) => e.id !== eventId));
          await dataService.saveEvent(deleted);
        },
      });
      showSnackbar(label, { canUndo: true });
    },
    [events, pushUndo, runSafeWrite, showSnackbar]
  );

  const uploadMedia = useCallback(
    async (file: File, kind: MediaKind, petId: string): Promise<MediaAsset> => {
      const asset = await dataService.uploadMedia(file, kind, petId);
      setMediaList((prev) => [...prev, asset]);
      return asset;
    },
    []
  );

  const deleteMedia = useCallback(async (id: string) => {
    await dataService.deleteMedia(id);
    setMediaList((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const exportBackupZip = useCallback(async () => {
    const blob = await dataService.exportZip();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `djurdagbok-export-${getTodayIsoDate()}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showSnackbar('ZIP-export nedladdad');
  }, [showSnackbar]);

  const importBackupZip = useCallback(
    async (file: File) => {
      const snap = await dataService.importZip(file);
      setUserId(snap.userId);
      setSettings(snap.settings);
      setPets(snap.pets);
      setCategories(snap.categories);
      setEvents(snap.events);
      setMediaList(snap.media);
      setUndoStack([]);
      setRedoStack([]);
      setHistoryStack([]);
      setRoute({ view: 'landing' });
      showSnackbar('Säkerhetskopia återställd');
    },
    [showSnackbar]
  );

  const undo = useCallback(async () => {
    const cmd = undoStack[undoStack.length - 1];
    if (!cmd) return;
    setUndoStack((prev) => prev.slice(0, -1));
    await cmd.undo();
    setRedoStack((prev) => [...prev, cmd]);
    dismissSnackbar();
    triggerSaveBadge();
  }, [dismissSnackbar, triggerSaveBadge, undoStack]);

  const redo = useCallback(async () => {
    const cmd = redoStack[redoStack.length - 1];
    if (!cmd) return;
    setRedoStack((prev) => prev.slice(0, -1));
    await cmd.redo();
    setUndoStack((prev) => [...prev, cmd]);
    triggerSaveBadge();
  }, [redoStack, triggerSaveBadge]);

  const visiblePets = useMemo(() => {
    const filtered = settings.hideArchived ? pets.filter((p) => !p.archived) : pets;
    return [...filtered].sort((a, b) => {
      const archDiff = Number(Boolean(a.archived)) - Number(Boolean(b.archived));
      if (archDiff !== 0) return archDiff;
      const aOrder = a.order ?? Number.MAX_SAFE_INTEGER;
      const bOrder = b.order ?? Number.MAX_SAFE_INTEGER;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.createdAt.localeCompare(b.createdAt);
    });
  }, [pets, settings.hideArchived]);

  const mediaMap = useMemo(() => {
    return new Map(mediaList.map((m) => [m.id, m]));
  }, [mediaList]);

  const value: AppContextValue = {
    isLoading,
    loadError,
    userId,
    settings,
    pets,
    visiblePets,
    categories,
    events,
    mediaMap,
    route,
    saveBadgeVisible,
    snackbar,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,
    isDirty,
    setIsDirty,
    unsavedPrompt,
    confirmLeaveUnsaved,
    cancelLeaveUnsaved,
    navigateTo,
    canGoBack,
    goBack,
    reloadAll,
    retryLastSave,
    updateSettings,
    createNewCatProfile,
    savePet,
    reorderPets,
    archivePet,
    softDeletePet,
    saveCategory,
    touchCategoryUsage,
    saveEvent,
    reorderEvents,
    archiveEvent,
    softDeleteEvent,
    uploadMedia,
    deleteMedia,
    exportBackupZip,
    importBackupZip,
    undo,
    redo,
    dismissSnackbar,
    triggerSaveBadge,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp måste användas inuti AppProvider.');
  }
  return ctx;
}
