/**
 * Base za fajlove iz .env: VITE_API_FILES_URL (npr. https://nejra-v2.ba101.top/backend/uploads).
 * U njemu je već backend + prefix /uploads, ništa se ne uklanja.
 */
const getFilesBase = (): string => {
  const filesUrl = (import.meta.env.VITE_API_FILES_URL || '').replace(/\/$/, '');
  const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  return filesUrl || apiUrl || '';
};

/**
 * Puni URL za fajl: base iz .env + putanja iz baze. Ništa se ne uklanja i ne dodaje.
 * base = https://nejra-v2.ba101.top/backend/uploads, path = uploads/2026/03/xxx ili gallery/2026/...
 * → https://nejra-v2.ba101.top/backend/uploads/uploads/2026/03/xxx ili .../backend/uploads/gallery/...
 */
export function getUploadUrl(path: string | undefined | null): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = getFilesBase();
  const normalized = path.replace(/^\//, '');
  return base ? `${base}/${normalized}` : `/${normalized}`;
}
