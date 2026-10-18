/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the backend API, e.g. `/api/v1` (proxied in dev) or `https://api.example.com/api/v1`. */
  readonly VITE_API_BASE_URL?: string
  /** Backend origin the dev server proxies `/api` to. */
  readonly VITE_BACKEND_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
