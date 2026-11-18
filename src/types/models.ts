export type ThemeMode = 'dark' | 'light' | 'system';
export type SpeciesType = 'cat' | 'lizard' | 'snake' | 'isopod' | 'cricket' | 'other';
export type AvatarType = 'paw' | 'cat' | 'custom';

export type CategoryFieldType =
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'date'
  | 'link'
  | 'image'
  | 'document'
  | 'weight_unit';

export type ProfileItemType = 'text' | 'note' | 'link' | 'image' | 'document';

export type CategoryIconKey =
  | 'stethoscope'
  | 'scale'
  | 'utensils'
  | 'bandage'
  | 'droplets'
  | 'pill'
  | 'scissors'
  | 'sparkles'
  | 'heart'
  | 'file-text'
  | 'home'
  | 'paw'
  | 'calendar'
  | 'tag';

export interface CategoryFieldDefinition {
  id: string;
  key: string;
  label: string;
  type: CategoryFieldType;
  required?: boolean;
  placeholder?: string;
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  icon: CategoryIconKey;
  color: string;
  isSystem: boolean;
  order: number;
  lastUsedAt?: string;
  fields: CategoryFieldDefinition[];
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CatProfileFields {
  name: string;
  birthDate: string;
  sex: string;
  breed: string;
  colorPattern: string;
  microchipNumber: string;
  neutered: string;
  insurance: string;
  insuranceCompany?: string;
  insuranceNumber?: string;
  website?: string;
  veterinarian: string;
  allergies: string;
  diet: string;
  conditions: string;
  personalNotes?: string;
  otherNotes?: string;
  basicComment?: string;
  healthNote?: string;
  basicImageIds?: string[];
  basicDocumentIds?: string[];
  healthImageIds?: string[];
  healthDocumentIds?: string[];
}

export interface ProfileSectionItem {
  id: string;
  type: ProfileItemType;
  label: string;
  value: string;
  mediaIds: string[];
}

export interface ProfileSection {
  id: string;
  title: string;
  icon: CategoryIconKey;
  color: string;
  order: number;
  items: ProfileSectionItem[];
}

export type TimeFilterPreset = 'last_year' | 'all_time' | 'single_date' | 'custom';

export interface PetFilterPrefs {
  enabledCategoryIds: string[] | null; // null = alla aktiva
  timePreset: TimeFilterPreset;
  customSingleDate?: string;
  customStartDate?: string;
  customEndDate?: string;
}

export interface Pet {
  id: string;
  userId: string;
  name: string;
  species: SpeciesType;
  avatarType: AvatarType;
  avatarMediaId?: string;
  archived: boolean;
  deletedAt?: string | null;
  profileFields: CatProfileFields;
  sections: ProfileSection[];
  filterPrefs: PetFilterPrefs;
  order?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryEvent {
  id: string;
  userId: string;
  petId: string;
  categoryId: string;
  date: string; // YYYY-MM-DD
  summary: string;
  fieldValues: Record<string, string | number | string[]>;
  order?: number;
  archived?: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type MediaKind = 'image' | 'document' | 'avatar';

export interface MediaAsset {
  id: string;
  userId: string;
  petId: string;
  kind: MediaKind;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  blob: Blob;
  thumbnailBlob: Blob;
  createdAt: string;
}

export interface AppSettings {
  id: 'app_settings';
  userId: string;
  theme: ThemeMode;
  largeText: boolean;
  highContrast: boolean;
  hideArchived: boolean;
  weightChartTitle: string;
  showWeightTrendline?: boolean;
  updatedAt: string;
}

export interface UndoCommand {
  id: string;
  label: string;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}
