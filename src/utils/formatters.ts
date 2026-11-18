export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getTodayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(isoDate: string): string {
  if (!isoDate) return '';
  let date: Date;
  if (isoDate.includes('T')) {
    date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return isoDate;
  } else {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
    if (!match) return isoDate;
    date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatShortDate(isoDate: string): string {
  if (!isoDate) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);
  if (!match) return isoDate;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function formatNumber(value: number, maxFractionDigits = 2): string {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

export function calculateAgeLabel(birthDateIso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDateIso);
  if (!match) return '';
  const birth = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  if (years < 0) return '';
  if (years === 0) return `${months} mån`;
  if (months === 0) return `${years} år`;
  return `${years} år ${months} mån`;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'post';
}
