import JSZip from 'jszip';
import {
  AppSettings,
  Category,
  DiaryEvent,
  MediaAsset,
  Pet,
} from '../types/models';
import { slugify } from '../utils/formatters';

export interface ExportBundlePayload {
  version: 1;
  exportedAt: string;
  userId: string;
  settings: AppSettings;
  categories: Category[];
  pets: Pet[];
  events: DiaryEvent[];
  mediaDescriptors: {
    id: string;
    userId: string;
    petId: string;
    kind: MediaAsset['kind'];
    fileName: string;
    mimeType: string;
    width: number;
    height: number;
    sizeBytes: number;
    createdAt: string;
    zipPath: string;
    thumbZipPath: string;
  }[];
}

function buildPetMarkdown(pet: Pet): string {
  const f = pet.profileFields;
  const lines: string[] = [
    `# ${pet.name}${pet.archived ? ' (Arkiverad)' : ''}`,
    '',
    `- **Art:** ${pet.species === 'cat' ? 'Katt' : pet.species}`,
    `- **Födelsedatum:** ${f.birthDate || '—'}`,
    `- **Kön:** ${f.sex || '—'}`,
    `- **Ras:** ${f.breed || '—'}`,
    `- **Färg/teckning:** ${f.colorPattern || '—'}`,
    `- **Chipnummer:** ${f.microchipNumber || '—'}`,
    `- **Kastrerad/steriliserad:** ${f.neutered || '—'}`,
    `- **Försäkring:** ${f.insurance || '—'}`,
    `- **Veterinär:** ${f.veterinarian || '—'}`,
    `- **Anteckning (grundfakta):** ${f.basicComment || '—'}`,
    `- **Allergier:** ${f.allergies || '—'}`,
    `- **Foder:** ${f.diet || '—'}`,
    `- **Sjukdomar/skador:** ${f.conditions || '—'}`,
    `- **Anteckning (hälsa och foder):** ${f.healthNote || [f.personalNotes, f.otherNotes].filter(Boolean).join(' / ') || '—'}`,
  ];

  if (pet.sections.length > 0) {
    lines.push('', '## Anpassade sektioner');
    for (const sec of [...pet.sections].sort((a, b) => a.order - b.order)) {
      lines.push('', `### ${sec.title}`);
      for (const item of sec.items) {
        lines.push(`- **${item.label || item.type}:** ${item.value || '(bilaga)'}`);
      }
    }
  }
  return lines.join('\n');
}

function buildEventMarkdown(event: DiaryEvent, category?: Category): string {
  const lines: string[] = [
    `# ${category?.name ?? 'Händelse'} — ${event.date}`,
    '',
    `**Sammanfattning:** ${event.summary || '—'}`,
    '',
    '## Fält',
  ];
  for (const [key, val] of Object.entries(event.fieldValues)) {
    if (key === 'extraCare' && Array.isArray(val)) {
      val.forEach((raw, idx) => {
        if (typeof raw !== 'string') return;
        try {
          const parsed = JSON.parse(raw) as { label?: string; price?: string };
          const parts = [
            parsed.label?.trim(),
            parsed.price?.trim() ? `${parsed.price.trim()} kr` : '',
          ].filter(Boolean);
          if (parts.length > 0) {
            lines.push(`- **Extra åtgärd ${idx + 1}:** ${parts.join(' — ')}`);
          }
        } catch {
          lines.push(`- **Extra åtgärd ${idx + 1}:** ${raw}`);
        }
      });
      continue;
    }
    const fieldDef = category?.fields.find((f) => f.key === key);
    const label =
      key === 'clinicComment'
        ? 'Anteckning (klinik)'
        : key === 'careComment'
        ? 'Anteckning (bedömning & vård)'
        : key === 'notes'
        ? 'Anteckning'
        : fieldDef?.label ?? key;
    if (Array.isArray(val)) {
      if (val.length > 0) {
        lines.push(`- **${label}:** ${val.length} st bilaga(or)`);
      }
    } else if (val !== '' && val !== undefined && val !== null) {
      lines.push(`- **${label}:** ${String(val)}`);
    }
  }
  if (category?.id === 'cat-veterinarvard') {
    const basePrice = Number(event.fieldValues.price) || 0;
    let extraTotal = 0;
    if (Array.isArray(event.fieldValues.extraCare)) {
      for (const raw of event.fieldValues.extraCare) {
        if (typeof raw !== 'string') continue;
        try {
          const parsed = JSON.parse(raw) as { price?: string };
          extraTotal += Number(String(parsed.price ?? '').replace(',', '.')) || 0;
        } catch {
          // ignore
        }
      }
    }
    const vetTotal = basePrice + extraTotal;
    if (vetTotal > 0) {
      lines.push(`- **Total summa:** ${vetTotal} kr`);
    }
  }
  return lines.join('\n');
}

export async function exportJournalToZip(params: {
  userId: string;
  settings: AppSettings;
  categories: Category[];
  pets: Pet[];
  events: DiaryEvent[];
  media: MediaAsset[];
}): Promise<Blob> {
  const zip = new JSZip();
  const dateStamp = new Date().toISOString().slice(0, 10);
  const rootName = `djurdagbok-export-${dateStamp}`;
  const root = zip.folder(rootName)!;

  const mediaMap = new Map(params.media.map((m) => [m.id, m]));
  const catMap = new Map(params.categories.map((c) => [c.id, c]));
  const mediaDescriptors: ExportBundlePayload['mediaDescriptors'] = [];
  const writtenMediaIds = new Set<string>();

  const readme = [
    '# Djurdagbok — Export',
    '',
    `Exporterad: ${new Date().toISOString()}`,
    `Antal djur: ${params.pets.filter((p) => !p.deletedAt).length} (inklusive arkiverade)`,
    `Antal händelser: ${params.events.filter((e) => !e.deletedAt).length}`,
    '',
    '## Mappstruktur',
    '- `manifest.json`: Komplett maskinläsbar data för återställning i Djurdagbok.',
    '- `djur/<djur-namn>/profil.md` & `profil.json`: Grundfakta och sektioner per djur.',
    '- `djur/<djur-namn>/handelser/<datum>_<kategori>_<id>/`: Enskilda händelser med läsbar Markdown, JSON och bifogade bilder/dokument.',
  ].join('\n');

  root.file('README.md', readme);
  root.file('categories.json', JSON.stringify(params.categories, null, 2));
  root.file('settings.json', JSON.stringify(params.settings, null, 2));

  const petsFolder = root.folder('djur')!;

  const writeMediaToFolder = (
    asset: MediaAsset,
    folder: JSZip,
    relPrefix: string
  ) => {
    const safeName = `${asset.id.slice(0, 8)}_${asset.fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const thumbName = `thumb_${safeName}.jpg`;
    folder.file(safeName, asset.blob);
    folder.file(thumbName, asset.thumbnailBlob);

    if (!writtenMediaIds.has(asset.id)) {
      writtenMediaIds.add(asset.id);
      mediaDescriptors.push({
        id: asset.id,
        userId: asset.userId,
        petId: asset.petId,
        kind: asset.kind,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        width: asset.width,
        height: asset.height,
        sizeBytes: asset.sizeBytes,
        createdAt: asset.createdAt,
        zipPath: `${relPrefix}/${safeName}`,
        thumbZipPath: `${relPrefix}/${thumbName}`,
      });
    }
  };

  for (const pet of params.pets) {
    if (pet.deletedAt) continue;
    const petFolderName = `${slugify(pet.name)}_${pet.id.slice(0, 6)}`;
    const petFolder = petsFolder.folder(petFolderName)!;
    const petRel = `djur/${petFolderName}`;

    petFolder.file('profil.json', JSON.stringify(pet, null, 2));
    petFolder.file('profil.md', buildPetMarkdown(pet));

    const petMediaFolder = petFolder.folder('media')!;
    if (pet.avatarMediaId) {
      const avatar = mediaMap.get(pet.avatarMediaId);
      if (avatar) {
        writeMediaToFolder(avatar, petMediaFolder, `${petRel}/media`);
      }
    }
    for (const sec of pet.sections) {
      for (const item of sec.items) {
        for (const mid of item.mediaIds) {
          const asset = mediaMap.get(mid);
          if (asset) {
            writeMediaToFolder(asset, petMediaFolder, `${petRel}/media`);
          }
        }
      }
    }

    const eventsFolder = petFolder.folder('handelser')!;
    const petEvents = params.events
      .filter((e) => e.petId === pet.id && !e.deletedAt)
      .sort((a, b) => b.date.localeCompare(a.date));

    for (const ev of petEvents) {
      const cat = catMap.get(ev.categoryId);
      const evFolderName = `${ev.date}_${slugify(cat?.name ?? 'handelse')}_${ev.id.slice(0, 6)}`;
      const evFolder = eventsFolder.folder(evFolderName)!;
      const evRel = `${petRel}/handelser/${evFolderName}`;

      evFolder.file('handelse.json', JSON.stringify(ev, null, 2));
      evFolder.file('handelse.md', buildEventMarkdown(ev, cat));

      for (const [key, val] of Object.entries(ev.fieldValues)) {
        if (!Array.isArray(val) || val.length === 0) continue;
        const subName = key.toLowerCase().includes('doc') ? 'dokument' : 'bilder';
        const attFolder = evFolder.folder(subName)!;
        for (const mid of val) {
          const asset = mediaMap.get(mid);
          if (asset) {
            writeMediaToFolder(asset, attFolder, `${evRel}/${subName}`);
          }
        }
      }
    }
  }

  // Säkerställ att även eventuella övriga media-assets som hör till icke-raderade djur kommer med
  for (const asset of params.media) {
    if (!writtenMediaIds.has(asset.id)) {
      const extraFolder = root.folder('media-extra')!;
      writeMediaToFolder(asset, extraFolder, 'media-extra');
    }
  }

  const manifest: ExportBundlePayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    userId: params.userId,
    settings: params.settings,
    categories: params.categories.filter((c) => !c.deletedAt),
    pets: params.pets.filter((p) => !p.deletedAt),
    events: params.events.filter((e) => !e.deletedAt),
    mediaDescriptors,
  };

  root.file('manifest.json', JSON.stringify(manifest, null, 2));

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
}

export async function importJournalFromZip(file: File): Promise<{
  manifest: ExportBundlePayload;
  mediaAssets: MediaAsset[];
}> {
  const zip = await JSZip.loadAsync(file);

  // Hitta manifest.json oavsett rotmappens namn
  const manifestEntry = Object.values(zip.files).find(
    (f) => !f.dir && f.name.endsWith('manifest.json')
  );
  if (!manifestEntry) {
    throw new Error('Ogiltig säkerhetskopia: manifest.json saknas i ZIP-filen.');
  }

  const rootPrefix = manifestEntry.name.slice(0, manifestEntry.name.length - 'manifest.json'.length);
  const manifestText = await manifestEntry.async('text');
  const manifest = JSON.parse(manifestText) as ExportBundlePayload;

  if (!manifest || !Array.isArray(manifest.pets) || !Array.isArray(manifest.categories) || !Array.isArray(manifest.events)) {
    throw new Error('Filen har ett ogiltigt format och kan inte återställas.');
  }

  const mediaAssets: MediaAsset[] = [];
  for (const desc of manifest.mediaDescriptors ?? []) {
    const mainFile = zip.file(`${rootPrefix}${desc.zipPath}`) ?? zip.file(desc.zipPath);
    if (!mainFile) continue;
    const blobData = await mainFile.async('blob');
    const typedBlob = new Blob([blobData], { type: desc.mimeType || 'application/octet-stream' });

    const thumbFile = zip.file(`${rootPrefix}${desc.thumbZipPath}`) ?? zip.file(desc.thumbZipPath);
    const thumbData = thumbFile ? await thumbFile.async('blob') : blobData;
    const typedThumb = new Blob([thumbData], { type: 'image/jpeg' });

    mediaAssets.push({
      id: desc.id,
      userId: desc.userId,
      petId: desc.petId,
      kind: desc.kind,
      fileName: desc.fileName,
      mimeType: desc.mimeType,
      width: desc.width,
      height: desc.height,
      sizeBytes: desc.sizeBytes,
      blob: typedBlob,
      thumbnailBlob: typedThumb,
      createdAt: desc.createdAt,
    });
  }

  return { manifest, mediaAssets };
}
