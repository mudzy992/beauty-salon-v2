/**
 * Base URL for API (and thus for uploaded files served at /uploads/...).
 * Set VITE_API_URL so image paths resolve to the backend (e.g. http://localhost:10001).
 */
const getApiBase = (): string => (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

/**
 * Returns full URL for an upload path stored in DB (e.g. "uploads/2025/03/xxx.webp").
 * Use for img src, download links, etc. Backend serves these at GET /uploads/...
 */
export function getUploadUrl(path: string | undefined | null): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = getApiBase();
  const normalized = path.replace(/^\//, '');
  return base ? `${base}/${normalized}` : `/${normalized}`;
}
