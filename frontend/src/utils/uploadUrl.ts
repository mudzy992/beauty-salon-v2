/**
 * Base URL za uploadane fajlove (slike, PDF).
 * Koristi VITE_API_FILES_URL ako je postavljen (npr. .../backend/uploads), inače VITE_API_URL.
 */
const getFilesBase = (): string => {
  const filesUrl = (import.meta.env.VITE_API_FILES_URL || '').replace(/\/$/, '');
  if (filesUrl) return filesUrl;
  const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  return apiUrl ? `${apiUrl}/uploads` : '';
};

/**
 * Vraća puni URL za putanju iz baze (npr. "uploads/2025/03/xxx.webp" ili "avatars/2025/03/xxx.webp").
 * Koristi prefix VITE_API_FILES_URL kada je postavljen, da slike/fajlovi učitavaju s ispravnog hosta.
 * Za img src, download linkove, itd.
 */
export function getUploadUrl(path: string | undefined | null): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = getFilesBase();
  let normalized = path.replace(/^\//, '');
  // Base završava s /uploads, path može biti "uploads/..." ili "avatars/..." – izbjegni dupli "uploads/"
  if (base && normalized.toLowerCase().startsWith('uploads/')) {
    normalized = normalized.slice(7); // "uploads/".length
  }
  return base ? `${base}/${normalized}` : `/${path.replace(/^\//, '')}`;
}
