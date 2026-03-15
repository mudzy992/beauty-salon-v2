/**
 * Base za fajlove iz .env: EXPO_PUBLIC_API_FILES_URL (npr. https://nejra-v2.ba101.top/backend/uploads).
 * U njemu je već backend + prefix /uploads, ništa se ne uklanja.
 */
function getFilesBase(): string {
  const filesUrl = (process.env.EXPO_PUBLIC_API_FILES_URL || '').replace(/\/$/, '');
  const apiUrl = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');
  return filesUrl || apiUrl || '';
}

/**
 * Puni URL za fajl: base iz .env + putanja iz baze. Ništa se ne uklanja i ne dodaje.
 */
export function getUploadUrl(path: string | undefined | null): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = getFilesBase();
  const normalized = path.replace(/^\//, '');
  return base ? `${base}/${normalized}` : `/${normalized}`;
}

/**
 * Alias za getUploadUrl – za kompatibilnost s postojećim kodom koji koristi getImageUrl.
 * Vraća undefined za prazan path (da getImageUrl(x) ?? '' i dalje radi).
 */
export function getImageUrl(path: string | undefined | null): string | undefined {
  const url = getUploadUrl(path);
  return url || undefined;
}
