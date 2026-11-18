import {
  AppSettings,
  Category,
  DiaryEvent,
  MediaAsset,
  Pet,
} from '../types/models';

export interface PetRepository {
  getAll(): Promise<Pet[]>;
  getById(id: string): Promise<Pet | undefined>;
  save(pet: Pet): Promise<void>;
  replaceAll(pets: Pet[]): Promise<void>;
}

export interface CategoryRepository {
  getAll(): Promise<Category[]>;
  save(category: Category): Promise<void>;
  replaceAll(categories: Category[]): Promise<void>;
}

export interface EventRepository {
  getAll(): Promise<DiaryEvent[]>;
  getByPetId(petId: string): Promise<DiaryEvent[]>;
  save(event: DiaryEvent): Promise<void>;
  saveMany(events: DiaryEvent[]): Promise<void>;
  replaceAll(events: DiaryEvent[]): Promise<void>;
}

export interface MediaRepository {
  getAll(): Promise<MediaAsset[]>;
  getById(id: string): Promise<MediaAsset | undefined>;
  save(asset: MediaAsset): Promise<void>;
  delete(id: string): Promise<void>;
  replaceAll(assets: MediaAsset[]): Promise<void>;
}

export interface SettingsRepository {
  get(userId: string): Promise<AppSettings>;
  save(settings: AppSettings): Promise<void>;
}

export interface MetaRepository {
  getOrCreateDeviceUserId(): Promise<string>;
  setDeviceUserId(userId: string): Promise<void>;
  getFlag(key: string): Promise<boolean>;
  setFlag(key: string, value: boolean): Promise<void>;
}

/**
 * Abstrakt gränssnitt för framtida molnsynkronisering (t.ex. Supabase/Firebase)
 * utan att UI-komponenter eller lokal datalagring behöver skrivas om.
 */
export interface CloudSyncAdapter {
  readonly providerName: string;
  isConfigured(): boolean;
  pushChanges(userId: string): Promise<void>;
  pullChanges(userId: string): Promise<void>;
}

export interface DataRepositoryBundle {
  meta: MetaRepository;
  pets: PetRepository;
  categories: CategoryRepository;
  events: EventRepository;
  media: MediaRepository;
  settings: SettingsRepository;
  cloudSync?: CloudSyncAdapter;
}
