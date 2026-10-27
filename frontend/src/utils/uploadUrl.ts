/**
 * Public files use VITE_API_FILES_URL (normally the /uploads prefix).
 * Protected files are fetched through the authenticated API, never the static root.
 */
const getFilesBase = (): string => {
  const filesUrl = (import.meta.env.VITE_API_FILES_URL || '').replace(/\/$/, '');
  const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  return filesUrl || `${apiUrl}/uploads`;
};

const getApiBase = (): string =>
  (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function getUploadUrl(path: string | undefined | null): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.replace(/^\/+/, '');
  const apiBase = getApiBase();

  if (normalized.startsWith('api/')) {
    return `${apiBase}/${normalized}`;
  }
  if (normalized.startsWith('private/')) {
    return `${apiBase}/api/uploads/content?path=${encodeURIComponent(normalized)}`;
  }

  const filesBase = getFilesBase();
  return `${filesBase}/${normalized}`;
}
