/**
 * Public files use EXPO_PUBLIC_API_FILES_URL (normally the /uploads prefix).
 * Protected private files are read through the authenticated API endpoint.
 */
function getFilesBase(): string {
  const filesUrl = (process.env.EXPO_PUBLIC_API_FILES_URL || '').replace(/\/$/, '');
  const apiUrl = (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');
  return filesUrl || `${apiUrl}/uploads`;
}

function getApiBase(): string {
  return (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');
}

export function getUploadUrl(path: string | undefined | null): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.replace(/^\/+/, '');
  const apiBase = getApiBase();
  if (normalized.startsWith('api/')) return `${apiBase}/${normalized}`;
  if (normalized.startsWith('private/')) {
    return `${apiBase}/api/uploads/content?path=${encodeURIComponent(normalized)}`;
  }
  return `${getFilesBase()}/${normalized}`;
}

export function getImageUrl(path: string | undefined | null): string | undefined {
  const url = getUploadUrl(path);
  return url || undefined;
}
