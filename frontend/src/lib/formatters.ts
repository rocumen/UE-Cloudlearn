import { api } from './api';
import type { PresignedDownloadResponse } from '../types/api';

const HONORIFIC_PREFIXES = new Set([
  'prof',
  'dr',
  'mr',
  'ms',
  'mrs',
  'engr',
  'atty',
  'sir',
  'maam'
]);

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export const ALLOWED_FILE_EXTENSIONS = [
  '.pdf',
  '.docx',
  '.pptx',
  '.xlsx',
  '.txt',
  '.png',
  '.jpg',
  '.jpeg',
  '.zip'
] as const;

export const ALLOWED_FILE_ACCEPT = ALLOWED_FILE_EXTENSIONS.join(',');

export function getDisplayFirstName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'there';

  let index = 0;
  while (index < parts.length - 1) {
    const normalized = parts[index].toLowerCase().replace(/\.+$/, '');
    if (!HONORIFIC_PREFIXES.has(normalized)) {
      break;
    }
    index += 1;
  }

  const chosen = parts[index].replace(/\.+$/, '').trim();
  return chosen || 'there';
}

export function formatShortDate(value: string | null | undefined): string {
  if (!value) return 'No date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Scheduled';
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric'
  }).format(parsed);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Not available';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Scheduled';
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(parsed);
}

export function toDatetimeLocalValue(value?: string | null): string {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';

  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}

export function fromDatetimeLocalToIso(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString();
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function validateUploadFile(
  file: File | null,
  required = true
): string | null {
  if (!file) {
    return required ? 'Please select a file to upload.' : null;
  }

  const lowerName = file.name.toLowerCase();
  const hasAllowedExt = ALLOWED_FILE_EXTENSIONS.some((ext) =>
    lowerName.endsWith(ext)
  );
  if (!hasAllowedExt) {
    return 'Unsupported file type. Allowed: PDF, DOCX, PPTX, XLSX, TXT, PNG, JPG, ZIP.';
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return 'File exceeds the 15 MB upload limit.';
  }

  return null;
}

export async function openPresignedDownload(endpoint: string): Promise<void> {
  const data = await api.get<PresignedDownloadResponse>(endpoint);
  const opened = window.open(data.url, '_blank', 'noopener,noreferrer');
  if (!opened) {
    const link = document.createElement('a');
    link.href = data.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    if (data.fileName) {
      link.download = data.fileName;
    }
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}
