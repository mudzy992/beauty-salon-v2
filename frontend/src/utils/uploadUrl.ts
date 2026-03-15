/**
 * Root backenda (npr. https://nejra-v2.ba101.top/backend).
 * Ako je postavljen URL koji završava s /uploads, uklanjamo ga da base uvijek bude backend root.
 */
const getBackendRoot = (): string => {
  const filesUrl = (import.meta.env.VITE_API_FILES_URL || '').replace(/\/$/, '');
  const apiUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  const raw = filesUrl || apiUrl || '';
  return raw.replace(/\/uploads\/?$/i, '');
};

/**
 * Puni URL za fajl: backendRoot + /uploads/ + path iz baze.
 * Prefiks "uploads" je OBAVEZAN – API URL je .../backend, na to ide /uploads pa putanja iz baze.
 * Path iz baze može biti "uploads/2026/03/xxx" ili "2026/03/xxx" – normaliziramo da ne dupliciramo "uploads".
 */
export function getUploadUrl(path: string | undefined | null): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = getBackendRoot();
  let normalized = path.replace(/^\//, '');
  if (normalized.toLowerCase().startsWith('uploads/')) normalized = normalized.slice(8);
  const uploadsPath = `uploads/${normalized}`;
  return base ? `${base}/${uploadsPath}` : `/${uploadsPath}`;
}
