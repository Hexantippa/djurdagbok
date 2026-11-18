import { MediaAsset, MediaKind } from '../types/models';
import { generateId } from '../utils/formatters';

interface CompressionConfig {
  maxDimension: number;
  quality: number;
}

const COMPRESSION_RULES: Record<MediaKind, CompressionConfig> = {
  image: { maxDimension: 1600, quality: 0.78 },
  document: { maxDimension: 2500, quality: 0.88 },
  avatar: { maxDimension: 800, quality: 0.82 },
};

const THUMB_MAX_DIMENSION = 320;
const THUMB_QUALITY = 0.72;

function loadImageElement(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Kunde inte läsa bildfilen.'));
    };
    img.src = url;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Kunde inte komprimera bilden.'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      quality
    );
  });
}

function renderResizedImage(
  img: HTMLImageElement,
  maxDimension: number,
  quality: number
): Promise<{ blob: Blob; width: number; height: number }> {
  const naturalW = img.naturalWidth || img.width || 1;
  const naturalH = img.naturalHeight || img.height || 1;
  const longest = Math.max(naturalW, naturalH);
  const scale = longest > maxDimension ? maxDimension / longest : 1;
  const width = Math.max(1, Math.round(naturalW * scale));
  const height = Math.max(1, Math.round(naturalH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Kunde inte skapa rityta för bildkomprimering.');
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvasToJpegBlob(canvas, quality).then((blob) => ({ blob, width, height }));
}

function renderDocumentPlaceholderThumbnail(fileName: string): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 240;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return Promise.resolve(new Blob([], { type: 'image/jpeg' }));
  }
  ctx.fillStyle = '#2C2E2D';
  ctx.fillRect(0, 0, 240, 240);

  ctx.fillStyle = '#363937';
  ctx.strokeStyle = '#FBAE44';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(48, 36, 144, 168, 12);
  ctx.fill();
  ctx.stroke();

  const ext = fileName.split('.').pop()?.toUpperCase().slice(0, 5) || 'FIL';
  ctx.fillStyle = '#FBAE44';
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(ext, 120, 118);

  ctx.fillStyle = '#F6ECE5';
  ctx.font = '14px sans-serif';
  const shortName = fileName.length > 18 ? `${fileName.slice(0, 15)}...` : fileName;
  ctx.fillText(shortName, 120, 154);

  return canvasToJpegBlob(canvas, 0.8);
}

function canvasToBlobWithMime(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

async function renderCompressedAvatar(
  img: HTMLImageElement
): Promise<{ blob: Blob; width: number; height: number }> {
  const naturalW = img.naturalWidth || img.width || 1;
  const naturalH = img.naturalHeight || img.height || 1;
  const longest = Math.max(naturalW, naturalH);
  const scale = longest > 160 ? 160 / longest : 1;
  const width = Math.max(1, Math.round(naturalW * scale));
  const height = Math.max(1, Math.round(naturalH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Kunde inte skapa rityta för bildkomprimering.');
  }
  ctx.drawImage(img, 0, 0, width, height);
  const [webpBlob, jpegBlob] = await Promise.all([
    canvasToBlobWithMime(canvas, 'image/webp', 0.58),
    canvasToBlobWithMime(canvas, 'image/jpeg', 0.6),
  ]);
  const candidates = [webpBlob, jpegBlob].filter((b): b is Blob => Boolean(b));
  candidates.sort((a, b) => a.size - b.size);
  const best = candidates[0];
  if (!best) {
    throw new Error('Kunde inte komprimera profilbilden.');
  }
  return { blob: best, width, height };
}

export async function processAndCompressFile(
  file: File,
  kind: MediaKind,
  userId: string,
  petId: string
): Promise<MediaAsset> {
  const isImage = file.type.startsWith('image/');
  const now = new Date().toISOString();

  if (isImage && kind === 'avatar') {
    const img = await loadImageElement(file);
    const compressed = await renderCompressedAvatar(img);
    const ext = compressed.blob.type === 'image/webp' ? 'webp' : 'jpg';
    const cleanName = (file.name.replace(/\.[^.]+$/, '') || 'profilbild') + `.${ext}`;

    return {
      id: generateId(),
      userId,
      petId,
      kind,
      fileName: cleanName,
      mimeType: compressed.blob.type || 'image/webp',
      width: compressed.width,
      height: compressed.height,
      sizeBytes: compressed.blob.size,
      blob: compressed.blob,
      thumbnailBlob: compressed.blob,
      createdAt: now,
    };
  }

  if (isImage) {
    const img = await loadImageElement(file);
    const rule = COMPRESSION_RULES[kind];
    const main = await renderResizedImage(img, rule.maxDimension, rule.quality);
    const thumb = await renderResizedImage(img, THUMB_MAX_DIMENSION, THUMB_QUALITY);
    const cleanName = file.name.replace(/\.[^.]+$/, '') + '.jpg';

    return {
      id: generateId(),
      userId,
      petId,
      kind,
      fileName: cleanName,
      mimeType: 'image/jpeg',
      width: main.width,
      height: main.height,
      sizeBytes: main.blob.size,
      blob: main.blob,
      thumbnailBlob: thumb.blob,
      createdAt: now,
    };
  }

  // Dokument som inte är bild (t.ex. PDF, TXT) lagras i originalform med genererad thumbnail
  const thumbBlob = await renderDocumentPlaceholderThumbnail(file.name);
  return {
    id: generateId(),
    userId,
    petId,
    kind,
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    width: 0,
    height: 0,
    sizeBytes: file.size,
    blob: file,
    thumbnailBlob: thumbBlob,
    createdAt: now,
  };
}
