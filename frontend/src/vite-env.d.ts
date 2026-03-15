/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  /** Base URL za uploadane fajlove (prefix /uploads). Ako prazno, koristi se VITE_API_URL + /uploads */
  readonly VITE_API_FILES_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
