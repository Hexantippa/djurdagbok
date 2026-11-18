import {
  buildDexterEvents,
  buildDexterPet,
  buildSeedCategories,
} from '../data/dexterSeed';
import { createIndexedDbRepository } from '../repositories/indexedDbRepository';
import { DataRepositoryBundle } from '../repositories/types';
import {
  AppSettings,
  Category,
  DiaryEvent,
  MediaAsset,
  MediaKind,
  Pet,
} from '../types/models';
import { processAndCompressFile } from './mediaService';
import { exportJournalToZip, importJournalFromZip } from './zipService';

export interface InitialStateSnapshot {
  userId: string;
  settings: AppSettings;
  pets: Pet[];
  categories: Category[];
  events: DiaryEvent[];
  media: MediaAsset[];
}

export class DataService {
  private repo: DataRepositoryBundle;
  private userIdCache: string | null = null;

  constructor(repo: DataRepositoryBundle) {
    this.repo = repo;
  }

  async initialize(): Promise<InitialStateSnapshot> {
    const userId = await this.repo.meta.getOrCreateDeviceUserId();
    this.userIdCache = userId;

    const seeded = await this.repo.meta.getFlag('seeded_dexter_v1');
    if (!seeded) {
      const existingPets = await this.repo.pets.getAll();
      if (existingPets.length === 0) {
        const categories = buildSeedCategories(userId);
        const dexter = buildDexterPet(userId);
        const events = buildDexterEvents(userId);
        await this.repo.categories.replaceAll(categories);
        await this.repo.pets.save(dexter);
        await this.repo.events.saveMany(events);
      }
      await this.repo.meta.setFlag('seeded_dexter_v1', true);
    }

    let [settings, pets, categories, events, media] = await Promise.all([
      this.repo.settings.get(userId),
      this.repo.pets.getAll(),
      this.repo.categories.getAll(),
      this.repo.events.getAll(),
      this.repo.media.getAll(),
    ]);

    const migratedV2 = await this.repo.meta.getFlag('migrated_v2_ux_defaults');
    if (!migratedV2) {
      const seedCats = buildSeedCategories(userId);
      const seedCatMap = new Map(seedCats.map((c) => [c.id, c]));
      const updatedCategories = categories.map((cat) => {
        const fresh = seedCatMap.get(cat.id);
        if (!fresh) return cat;
        return {
          ...cat,
          color: fresh.color,
          fields: fresh.fields,
          updatedAt: new Date().toISOString(),
        };
      });
      categories = updatedCategories;
      await this.repo.categories.replaceAll(updatedCategories);

      settings = {
        ...settings,
        largeText: false,
        highContrast: true,
        showWeightTrendline: settings.showWeightTrendline ?? false,
        updatedAt: new Date().toISOString(),
      };
      await this.repo.settings.save(settings);
      await this.repo.meta.setFlag('migrated_v2_ux_defaults', true);
    }

    const migratedV3 = await this.repo.meta.getFlag('migrated_v3_parity_defaults');
    if (!migratedV3) {
      const seedCats = buildSeedCategories(userId);
      const seedCatMap = new Map(seedCats.map((c) => [c.id, c]));
      const updatedCategories = categories.map((cat) => {
        const fresh = seedCatMap.get(cat.id);
        if (!fresh) return cat;
        return {
          ...cat,
          name: fresh.name,
          fields: fresh.fields,
          updatedAt: new Date().toISOString(),
        };
      });
      categories = updatedCategories;
      await this.repo.categories.replaceAll(updatedCategories);

      const updatedPets = pets.map((p) => {
        const pf = p.profileFields;
        const legacyNotes = [pf.personalNotes, pf.otherNotes]
          .filter((v) => typeof v === 'string' && v.trim() !== '')
          .join('\n\n');
        const nextHealthNote = pf.healthNote ?? legacyNotes;
        return {
          ...p,
          profileFields: {
            ...pf,
            basicComment: pf.basicComment ?? '',
            healthNote: nextHealthNote,
          },
        };
      });
      pets = updatedPets;
      await this.repo.pets.replaceAll(updatedPets);

      settings = {
        ...settings,
        largeText: false,
        showWeightTrendline: settings.showWeightTrendline ?? false,
        updatedAt: new Date().toISOString(),
      };
      await this.repo.settings.save(settings);
      await this.repo.meta.setFlag('migrated_v3_parity_defaults', true);
    }

    return {
      userId,
      settings,
      pets: pets.filter((p) => !p.deletedAt),
      categories: categories.filter((c) => !c.deletedAt).sort((a, b) => a.order - b.order),
      events: events.filter((e) => !e.deletedAt),
      media,
    };
  }

  getUserId(): string {
    if (!this.userIdCache) {
      throw new Error('DataService är inte initierad ännu.');
    }
    return this.userIdCache;
  }

  async savePet(pet: Pet): Promise<Pet> {
    const updated: Pet = {
      ...pet,
      userId: pet.userId || this.getUserId(),
      updatedAt: new Date().toISOString(),
    };
    await this.repo.pets.save(updated);
    return updated;
  }

  async saveCategory(category: Category): Promise<Category> {
    const updated: Category = {
      ...category,
      userId: category.userId || this.getUserId(),
      updatedAt: new Date().toISOString(),
    };
    await this.repo.categories.save(updated);
    return updated;
  }

  async saveEvent(event: DiaryEvent): Promise<DiaryEvent> {
    const updated: DiaryEvent = {
      ...event,
      userId: event.userId || this.getUserId(),
      updatedAt: new Date().toISOString(),
    };
    await this.repo.events.save(updated);
    return updated;
  }

  async saveSettings(settings: AppSettings): Promise<AppSettings> {
    const updated: AppSettings = {
      ...settings,
      userId: settings.userId || this.getUserId(),
      updatedAt: new Date().toISOString(),
    };
    await this.repo.settings.save(updated);
    return updated;
  }

  async uploadMedia(file: File, kind: MediaKind, petId: string): Promise<MediaAsset> {
    const asset = await processAndCompressFile(file, kind, this.getUserId(), petId);
    await this.repo.media.save(asset);
    return asset;
  }

  async deleteMedia(id: string): Promise<void> {
    await this.repo.media.delete(id);
  }

  async exportZip(): Promise<Blob> {
    const userId = this.getUserId();
    const [settings, categories, pets, events, media] = await Promise.all([
      this.repo.settings.get(userId),
      this.repo.categories.getAll(),
      this.repo.pets.getAll(),
      this.repo.events.getAll(),
      this.repo.media.getAll(),
    ]);
    return exportJournalToZip({ userId, settings, categories, pets, events, media });
  }

  async importZip(file: File): Promise<InitialStateSnapshot> {
    const { manifest, mediaAssets } = await importJournalFromZip(file);
    const activeUserId = this.getUserId();

    const normalizedPets = manifest.pets.map((p) => ({
      ...p,
      userId: p.userId || activeUserId,
      deletedAt: null,
    }));
    const normalizedCategories = manifest.categories.map((c) => ({
      ...c,
      userId: c.userId || activeUserId,
      deletedAt: null,
    }));
    const normalizedEvents = manifest.events.map((e) => ({
      ...e,
      userId: e.userId || activeUserId,
      deletedAt: null,
    }));
    const normalizedSettings: AppSettings = {
      ...manifest.settings,
      id: 'app_settings',
      userId: activeUserId,
    };

    await Promise.all([
      this.repo.pets.replaceAll(normalizedPets),
      this.repo.categories.replaceAll(normalizedCategories),
      this.repo.events.replaceAll(normalizedEvents),
      this.repo.media.replaceAll(mediaAssets),
      this.repo.settings.save(normalizedSettings),
      this.repo.meta.setFlag('seeded_dexter_v1', true),
    ]);

    return {
      userId: activeUserId,
      settings: normalizedSettings,
      pets: normalizedPets,
      categories: normalizedCategories.sort((a, b) => a.order - b.order),
      events: normalizedEvents,
      media: mediaAssets,
    };
  }
}

export const dataService = new DataService(createIndexedDbRepository());
